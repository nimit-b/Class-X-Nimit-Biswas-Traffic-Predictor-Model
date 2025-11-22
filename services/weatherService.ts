
interface WeatherData {
  temperature: number;
  precipitationChance: number;
  conditionCode: number;
  description: string;
}

// WMO Weather interpretation codes (http://www.wmo.int/pages/prog/www/IMOP/WMO306.html)
function getWeatherDescription(code: number): string {
  if (code === 0) return "Clear sky";
  if (code === 1 || code === 2 || code === 3) return "Mainly clear, partly cloudy, and overcast";
  if (code === 45 || code === 48) return "Fog and depositing rime fog";
  if (code >= 51 && code <= 55) return "Drizzle: Light, moderate, and dense intensity";
  if (code >= 61 && code <= 65) return "Rain: Slight, moderate and heavy intensity";
  if (code >= 71 && code <= 77) return "Snow fall: Slight, moderate, and heavy intensity";
  if (code >= 80 && code <= 82) return "Rain showers: Slight, moderate, and violent";
  if (code >= 95) return "Thunderstorm: Slight or moderate";
  return "Variable conditions";
}

export async function getWeatherForecast(lat: number, lon: number, dateStr: string): Promise<WeatherData | null> {
  try {
    // Open-Meteo requires YYYY-MM-DD
    const dateObj = new Date(dateStr);
    const formattedDate = dateObj.toISOString().split('T')[0];
    
    // Check if date is too far in future (Open-Meteo free is usually 7-16 days)
    const today = new Date();
    const diffTime = Math.abs(dateObj.getTime() - today.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 14) {
      return null; // Too far in future for accurate free forecast
    }

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max,precipitation_probability_max&timezone=auto&start_date=${formattedDate}&end_date=${formattedDate}`;

    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();

    if (!data.daily || !data.daily.weathercode || data.daily.weathercode.length === 0) {
      return null;
    }

    const code = data.daily.weathercode[0];
    return {
      temperature: data.daily.temperature_2m_max[0],
      precipitationChance: data.daily.precipitation_probability_max[0],
      conditionCode: code,
      description: getWeatherDescription(code)
    };
  } catch (error) {
    console.warn("Weather fetch failed:", error);
    return null;
  }
}
