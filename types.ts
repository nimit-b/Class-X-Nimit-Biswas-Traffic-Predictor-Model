
export interface LocationData {
  name: string;
  lat: number;
  lon: number;
}

export interface ChartPoint {
  time: string;
  congestionLevel: number; // 0-100
}

export interface TrafficBreakdown {
  name: string;
  value: number; // 0-100 impact score
  fill: string;
}

export interface RouteStats {
  distanceMeters: number;
  durationSeconds: number; // Base duration without traffic
}

export interface RouteComposition {
  percentHighway: number;
  percentUrban: number;
  majorRoadNames: string[];
}

export interface RouteSegment {
  segmentId: number;
  startPercentage: number; // 0-100
  endPercentage: number;   // 0-100
  congestionLevel: 'Low' | 'Moderate' | 'High' | 'Severe';
}

export interface RouteAlternative {
  name: string;
  time: string;
  description: string;
}

export interface DetailedWeather {
  temperature: number;
  precipitationChance: number;
  conditionCode: number;
  description: string;
  windSpeed: number;
  isDay: boolean;
}

export interface PredictionResult {
  summary: string;
  travelTimeEstimate: string;
  congestionLevel: 'Low' | 'Moderate' | 'High' | 'Severe';
  confidenceScore?: number; // 0-100
  safetyScore?: number; // 0-100
  alternatives?: RouteAlternative[];
  weatherImpact: string;
  eventImpact: string;
  chartData: ChartPoint[];
  trafficBreakdown: TrafficBreakdown[];
  factors: string[];
  routeLinks: Array<{ title: string; url: string }>;
  routeCoordinates?: [number, number][]; // Array of [lat, lon]
  routeStats?: RouteStats; // Real data from OSRM
  routeSegments?: RouteSegment[]; // For coloring the map
  detailedWeather?: DetailedWeather; // Raw weather data for UI display
}
