
import { PredictionResult, ChartPoint, RouteStats, RouteComposition, DetailedWeather } from "../types";

const DEFAULT_OPENROUTER_KEY = "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";

function generateFallbackChartData(baseLevel: string, startHour: number): ChartPoint[] {
  const baseValue = baseLevel === 'Severe' ? 90 : baseLevel === 'High' ? 75 : baseLevel === 'Moderate' ? 50 : 20;
  const data: ChartPoint[] = [];
  for (let i = 0; i < 5; i++) {
    const hour = (startHour + i) % 24;
    const timeStr = `${hour.toString().padStart(2, '0')}:00`;
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
  const day = date.getDay(); // 0 = Sun
  
  const readableDate = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const isWeekend = day === 0 || day === 6;
  
  let timeOfDay = "Mid-day";
  if (hour >= 6 && hour <= 9) timeOfDay = "Morning Commute";
  else if (hour >= 16 && hour <= 19) timeOfDay = "Evening Commute";
  else if (hour > 19 || hour < 5) timeOfDay = "Night";

  return {
    context: `Time: ${hour}:00 (${timeOfDay}). Day: ${readableDate} (${isWeekend ? "Weekend" : "Weekday"}).`,
    startHour: hour,
    readableDate: readableDate
  };
}

/**
 * Clean raw JSON string from common LLM formatting errors
 */
function sanitizeJsonString(str: string): string {
  // 1. Remove Markdown code blocks if present
  let clean = str.replace(/```json\s*/g, "").replace(/```\s*$/g, "").replace(/```/g, "");
  
  // 2. Remove invisible control characters (0x00-0x1F) except newline, tab, return
  clean = clean.replace(/[\x00-\x09\x0B-\x1F\x7F]/g, "");
  
  // 3. Fix "Bad escaped character" errors
  // JSON allows \", \\, \/, \b, \f, \n, \r, \t, \uXXXX
  // This regex finds backslashes NOT followed by those valid chars and escapes them.
  // We use a negative lookahead (?!...)
  clean = clean.replace(/\\(?![/\\"'bfnrtu])/g, "\\\\");

  return clean.trim();
}

export async function predictTraffic(
  origin: string, 
  destination: string, 
  datetime: string,
  weather: DetailedWeather | null,
  routeStats: RouteStats | undefined,
  routeComposition: RouteComposition | undefined,
  userApiKey?: string,
  provider: string = 'openrouter'
): Promise<PredictionResult> {
  
  const isUsingCustomKey = userApiKey && userApiKey.trim().length > 0;
  let apiKey = isUsingCustomKey ? userApiKey : DEFAULT_OPENROUTER_KEY;
  
  if (!isUsingCustomKey && provider !== 'openrouter') {
      throw new Error(`Please enter a valid API Key for ${provider} in the settings.`);
  }

  const { context: timeContext, startHour, readableDate } = analyzeTimeContext(datetime);
  
  const next5Hours = Array.from({length: 5}, (_, i) => {
    const h = (startHour + i) % 24;
    return `${h.toString().padStart(2, '0')}:00`;
  }).join(", ");

  // Granular Weather Context
  let weatherContext = "Data Unavailable. Assume Standard Conditions.";
  if (weather) {
      weatherContext = `
        Condition: ${weather.description} (Code: ${weather.conditionCode}).
        Temp: ${weather.temperature}°C. 
        Precipitation Chance: ${weather.precipitationChance}%.
        Wind: ${weather.windSpeed} km/h.
        Daylight: ${weather.isDay ? "Yes" : "No"}.
      `;
  }

  // Detailed Route Context
  let routeContext = "Route geometry unavailable.";
  if (routeStats && routeComposition) {
    const km = (routeStats.distanceMeters / 1000).toFixed(1);
    const baseMins = Math.round(routeStats.durationSeconds / 60);
    routeContext = `
      Distance: ${km} km. 
      Free-Flow Duration: ${baseMins} min.
      Composition: ${routeComposition.percentHighway}% Highway / ${routeComposition.percentUrban}% Urban.
      Major Roads: ${routeComposition.majorRoadNames.join(", ")}.
    `;
  }

  const prompt = `
    ACT AS A SENIOR TRAFFIC ENGINEER AND DATA SCIENTIST.
    Perform a rigorous calculated analysis for a trip from "${origin}" to "${destination}".

    --- INPUT DATA ---
    1. TIMING: ${timeContext}
    2. ROUTE PHYSICS: ${routeContext}
    3. HOURLY WEATHER: ${weatherContext}

    --- CALCULATION LOGIC (MENTAL SANDBOX) ---
    Apply the following multipliers to the "Free-Flow Duration":
    1. **Base Rush Hour**: +40-80% for Commute times on Weekdays (Urban), +10-20% (Highway).
    2. **Weather Penalty**: 
       - Rain: +15% (Urban), +25% (Highway - spray/visibility).
       - Snow/Ice: +60% (Urban), +40% (Highway - plowing usually better on highways).
       - Sun Glare (Morning/Evening): +5-10%.
    3. **Holiday/Event**: Check specific date "${readableDate}". If Major Holiday, reverse rush hour logic.
    4. **Road Type**: High % Urban = more susceptible to gridlock variables. High % Highway = susceptible to single accident delays.

    --- REQUIRED OUTPUT (JSON) ---
    You must output ONLY valid JSON inside a code block. Do NOT include trailing commas.
    
    Structure:
    {
      "travelTime": "Calculated string (e.g. 1 hr 24 min)",
      "congestionLevel": "Low" | "Moderate" | "High" | "Severe",
      "confidenceScore": number (0-100, based on data quality),
      "safetyScore": number (0-100, deduct for rain/night/wind),
      "summary": "### 📊 Engineer's Verdict\n\n[Markdown analysis including the calculated delay factors...]",
      "routeSegments": [
        { "segmentId": 1, "startPercentage": 0, "endPercentage": 30, "congestionLevel": "High" },
        { "segmentId": 2, "startPercentage": 30, "endPercentage": 100, "congestionLevel": "Low" }
      ],
      "chartData": [ { "time": "HH:MM", "congestionLevel": 0-100 } for times: ${next5Hours} ],
      "trafficBreakdown": [
         {"name": "Base Distance", "value": 50, "fill": "#6366f1"},
         {"name": "Rush Hour", "value": 20, "fill": "#f59e0b"},
         {"name": "Weather Delay", "value": 10, "fill": "#0ea5e9"}
      ],
      "alternatives": [
         { "name": "Alternative A", "time": "...", "description": "..." },
         { "name": "Alternative B", "time": "...", "description": "..." }
      ]
    }
  `;

  try {
    let url = '';
    let headers: any = { "Content-Type": "application/json" };
    let body: any = {};

    if (provider === 'openai') {
      url = "https://api.openai.com/v1/chat/completions";
      headers["Authorization"] = `Bearer ${apiKey}`;
      body = {
        model: "gpt-4o-mini", 
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2, // Lower temperature for more analytical/math-based results
        max_tokens: 2000
      };
    } else if (provider === 'gemini') {
       url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
       body = { contents: [{ parts: [{ text: prompt }] }] };
    } else {
      url = "https://openrouter.ai/api/v1/chat/completions";
      headers["Authorization"] = `Bearer ${apiKey}`;
      headers["HTTP-Referer"] = window.location.origin;
      headers["X-Title"] = "OmniFlow Traffic App";
      body = {
        model: "google/gemini-2.0-flash-001",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 2000
      };
    }

    const response = await fetch(url, {
      method: "POST",
      headers: provider === 'gemini' ? { "Content-Type": "application/json" } : headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
        if (response.status === 401) throw new Error("API Key Invalid (401).");
        if (response.status === 402 || response.status === 429) throw new Error("API Limit Reached (402/429).");
        const errText = await response.text();
        console.error("Provider Error:", errText);
        throw new Error(`API Provider Error: ${response.status}`);
    }

    const data = await response.json();
    let fullText = "";
    if (provider === 'gemini') fullText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    else fullText = data.choices?.[0]?.message?.content || "";

    // --- ROBUST PARSING LOGIC ---
    
    // 1. Try to extract JSON from code blocks first
    const jsonMatch = fullText.match(/```json\s*([\s\S]*?)\s*```/);
    let jsonString = jsonMatch ? jsonMatch[1] : fullText;

    // 2. Sanitize the string to fix "Bad escaped character" errors
    jsonString = sanitizeJsonString(jsonString);

    let parsedData: any = {};

    try {
      parsedData = JSON.parse(jsonString);
    } catch (e) {
      console.warn("JSON Parse Failed, attempting manual repair...", e);
      // Fallback: If strict parse fails, try to find the outermost braces and parse that sub-string
      const firstBrace = jsonString.indexOf('{');
      const lastBrace = jsonString.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
          try {
            const subStr = jsonString.substring(firstBrace, lastBrace + 1);
            parsedData = JSON.parse(subStr); // Try parsing just the object part
          } catch (e2) {
             console.error("Critical JSON Parse Error", e2);
             // As a last resort, we return a "Partial" prediction instead of crashing
             return {
                 summary: "### ⚠️ Parsing Error\n\nThe AI generated a response, but it was not valid JSON. Please try again.\n\nRaw Output:\n" + fullText.substring(0, 100) + "...",
                 travelTimeEstimate: "N/A",
                 congestionLevel: "Moderate",
                 weatherImpact: "Unknown",
                 eventImpact: "Unknown",
                 chartData: [],
                 trafficBreakdown: [],
                 factors: [],
                 routeLinks: [],
                 alternatives: []
             };
          }
      }
    }

    const congestionLevel = parsedData.congestionLevel || "Moderate";
    const chartData = (parsedData.chartData && parsedData.chartData.length > 0) 
      ? parsedData.chartData 
      : generateFallbackChartData(congestionLevel, startHour);

    return {
      summary: parsedData.summary || `### Analysis Generated\n${fullText.substring(0,100)}...`,
      travelTimeEstimate: parsedData.travelTime || "Calculating...",
      congestionLevel: congestionLevel,
      confidenceScore: parsedData.confidenceScore || 80,
      safetyScore: parsedData.safetyScore || 85,
      alternatives: parsedData.alternatives || [],
      weatherImpact: weather ? weather.description : "Unknown",
      eventImpact: "Analyzed",
      factors: [],
      chartData: chartData,
      trafficBreakdown: parsedData.trafficBreakdown || [],
      routeLinks: [],
      routeStats: routeStats,
      routeSegments: parsedData.routeSegments,
      detailedWeather: weather || undefined
    };

  } catch (error: any) {
    console.error("Prediction Error:", error);
    throw error;
  }
}
