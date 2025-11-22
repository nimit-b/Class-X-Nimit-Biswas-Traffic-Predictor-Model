
import { DetailedWeather } from "../types";

// WMO Weather interpretation codes
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

export async function getWeatherForecast(lat: number, lon: number, datetimeStr: string): Promise<DetailedWeather | null> {
  try {
    // Input datetimeStr is "YYYY-MM-DDTHH:mm"
    const tripDate = new Date(datetimeStr);
    const dateStr = datetimeStr.split('T')[0];
    
    // We fetch hourly data for the specific day to get precision
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,precipitation_probability,weathercode,wind_speed_10m,is_day&timezone=auto&start_date=${dateStr}&end_date=${dateStr}`;

    const response = await fetch(url);
    if (!response.ok) {
        console.error("Weather API error:", response.status);
        return null;
    }

    const data = await response.json();

    if (!data.hourly || !data.hourly.time) {
      return null;
    }

    // Find the index in the hourly array that is closest to the user's selected time
    // API returns ISO strings in local time usually, or we match by hour
    const tripHour = tripDate.getHours();
    
    // OpenMeteo returns time as "YYYY-MM-DDTHH:00"
    // We just look for the index where the hour matches the trip hour
    // Since we requested start_date=end_date, index 0 is 00:00, index 12 is 12:00, etc.
    // Robustness check:
    const index = Math.min(Math.max(tripHour, 0), 23);

    return {
      temperature: data.hourly.temperature_2m[index],
      precipitationChance: data.hourly.precipitation_probability[index],
      conditionCode: data.hourly.weathercode[index],
      description: getWeatherDescription(data.hourly.weathercode[index]),
      windSpeed: data.hourly.wind_speed_10m[index],
      isDay: data.hourly.is_day[index] === 1
    };
  } catch (error) {
    console.warn("Weather fetch failed:", error);
    return null;
  }
}
