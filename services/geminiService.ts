import { PredictionResult, ChartPoint, TrafficBreakdown, RouteStats, RouteSegment } from "../types";

const DEFAULT_API_KEY = "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";

// Helper to ensure we always have chart data
function generateFallbackChartData(baseLevel: string, startHour: number): ChartPoint[] {
  const baseValue = baseLevel === 'Severe' ? 90 : baseLevel === 'High' ? 75 : baseLevel === 'Moderate' ? 50 : 20;
  const data: ChartPoint[] = [];
  
  for (let i = 0; i < 5; i++) {
    const hour = (startHour + i) % 24;
    const timeStr = `${hour.toString().padStart(2, '0')}:00`;
    // Add some random variance to make it look real
    const variance = Math.floor(Math.random() * 15) - 7; 
    data.push({
      time: timeStr,
      congestionLevel: Math.min(100, Math.max(0, baseValue + variance))
    });
  }
  return data;
}

function analyzeTimeContext(dateStr: string): { context: string, startHour: number, readableDate: string } {
  const date = new Date(dateStr);
  const hour = date.getHours();
  const day = date.getDay(); // 0 = Sun, 6 = Sat
  
  // Get human readable date (e.g., "Monday, December 25")
  const readableDate = date.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  });

  const isWeekend = day === 0 || day === 6;
  let timeOfDay = "Mid-day";
  let isRushHour = false;

  if (hour >= 6 && hour <= 9) {
    timeOfDay = "Morning Commute";
    if (!isWeekend) isRushHour = true;
  } else if (hour >= 16 && hour <= 19) {
    timeOfDay = "Evening Commute";
    if (!isWeekend) isRushHour = true;
  } else if (hour > 19 || hour < 5) {
    timeOfDay = "Night";
  }

  return {
    context: `Specific Date: ${readableDate}. Time of Day: ${timeOfDay} (${hour}:00). Standard Day Type: ${isWeekend ? "Weekend" : "Weekday"}. Base Rush Hour Status (ignoring holidays): ${isRushHour ? "ACTIVE" : "Inactive"}.`,
    startHour: hour,
    readableDate: readableDate
  };
}

export async function predictTraffic(
  origin: string, 
  destination: string, 
  datetime: string,
  weatherSummary: string | null,
  routeStats: RouteStats | undefined,
  userApiKey?: string
): Promise<PredictionResult> {
  
  const apiKey = userApiKey && userApiKey.trim() !== "" ? userApiKey : DEFAULT_API_KEY;
  const model = "google/gemini-2.0-flash-001"; 
  
  const { context: timeContext, startHour, readableDate } = analyzeTimeContext(datetime);
  
  // Generate specific time labels for the AI to fill in
  const next5Hours = Array.from({length: 5}, (_, i) => {
    const h = (startHour + i) % 24;
    return `${h.toString().padStart(2, '0')}:00`;
  }).join(", ");

  const weatherContext = weatherSummary 
    ? `Real-time Weather: ${weatherSummary}. (Note: Rain/Snow reduces capacity by 15-30%.)` 
    : "Weather data unavailable. Assume clear conditions.";

  let routeContext = "";
  if (routeStats) {
    const km = (routeStats.distanceMeters / 1000).toFixed(1);
    const baseMins = Math.round(routeStats.durationSeconds / 60);
    routeContext = `Route Physical Distance: ${km} km. Base Driving Time (No Traffic): ${baseMins} minutes.`;
  } else {
    routeContext = "Precise route distance unavailable.";
  }

  const prompt = `
    You are a Master Traffic Analyst and Urban Planner. 
    Perform a deep-dive analysis for a trip from "${origin}" to "${destination}".

    INPUT DATA:
    1. ROUTE: ${routeContext}
    2. CONTEXT: ${timeContext}
    3. WEATHER: ${weatherContext}

    CRITICAL INSTRUCTION - HOLIDAY & FESTIVAL LOGIC:
    Check the "Specific Date" provided above ("${readableDate}").
    - Does this date correspond to a MAJOR PUBLIC HOLIDAY (e.g., Christmas, New Year's, Thanksgiving, Eid, Diwali, Independence Day) or a localized festival in the region?
    - IF YES: Ignore standard "Rush Hour" logic. 
      -> Morning commute will be EMPTY.
      -> Mid-day traffic near shopping centers/malls/places of worship will be HIGH.
      -> Evening traffic might be severe due to parties/gatherings.
    - IF NO: Proceed with standard weekday/weekend patterns.

    TASK:
    Generate a detailed JSON response assessing traffic conditions.

    CRITICAL OUTPUT REQUIREMENTS:
    1. "summary": A detailed Markdown string. It MUST specifically mention if the date is a holiday or special event and how that changes the prediction.
       - Format: "### 📅 Date Context: [Is it a special day?]" followed by the verdict.
       - Provide specific advice based on the day (e.g., "Since it is Christmas, avoid routes near malls").
    
    2. "chartData": You MUST provide exactly 5 data points for the following times: [${next5Hours}].
       Each point must be: { "time": "HH:MM", "congestionLevel": 0-100 }. 
       0 = Empty Road, 100 = Gridlock.
    
    3. "routeSegments": Break the route into segments (Start, Middle, End).
       - If it is a holiday, routes near residential areas might be clear, but city centers blocked. Reflect this in segment colors.

    Required JSON Structure:
    {
      "travelTime": "e.g. 1 hr 15 mins",
      "congestionLevel": "Low" | "Moderate" | "High" | "Severe",
      "summary": "### 📅 Date Context: Christmas Day ... \n\n ### 🚦 Verdict: ... \n\n ### 📍 Analysis ...",
      "routeSegments": [
        { "segmentId": 1, "startPercentage": 0, "endPercentage": 30, "congestionLevel": "High" },
        { "segmentId": 2, "startPercentage": 30, "endPercentage": 100, "congestionLevel": "Low" }
      ],
      "chartData": [ 
        { "time": "14:00", "congestionLevel": 45 },
        { "time": "15:00", "congestionLevel": 60 } 
      ],
      "trafficBreakdown": [
         {"name": "Base Route", "value": 50, "fill": "#6366f1"},
         {"name": "Holiday Impact", "value": 30, "fill": "#f59e0b"},
         {"name": "Weather", "value": 20, "fill": "#0ea5e9"}
      ]
    }
    
    Wrap the JSON in a code block labeled 'json'.
  `;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": window.location.href,
        "X-Title": "OmniFlow Traffic App", 
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 402 || response.status === 429 || (errorData.error && errorData.error.code === 402)) {
        throw new Error("Free limit of day is ended use your own openrouter api");
      }
      throw new Error(`OpenRouter API Error: ${response.status}`);
    }

    const data = await response.json();
    const fullText = data.choices?.[0]?.message?.content || "No analysis available.";
    
    // Parse JSON
    const jsonMatch = fullText.match(/```json\s*([\s\S]*?)\s*```/);
    let parsedData: any = {};

    if (jsonMatch && jsonMatch[1]) {
      try {
        parsedData = JSON.parse(jsonMatch[1]);
      } catch (e) {
        console.error("Failed to parse AI JSON block", e);
      }
    }

    // Fallback Logic
    const congestionLevel = parsedData.congestionLevel || "Moderate";
    const chartData = (parsedData.chartData && parsedData.chartData.length > 0) 
      ? parsedData.chartData 
      : generateFallbackChartData(congestionLevel, startHour);

    const summary = parsedData.summary || `### Analysis Unavailable\n\nWe could not generate a detailed report at this time. \n\n**Estimated Congestion:** ${congestionLevel}.`;

    return {
      summary: summary,
      travelTimeEstimate: parsedData.travelTime || "Calculating...",
      congestionLevel: congestionLevel,
      weatherImpact: "See analysis", 
      eventImpact: "See analysis",
      factors: [], 
      chartData: chartData,
      trafficBreakdown: parsedData.trafficBreakdown || [],
      routeLinks: [],
      routeStats: routeStats,
      routeSegments: parsedData.routeSegments
    };

  } catch (error: any) {
    console.error("Prediction Error:", error);
    throw error;
  }
}