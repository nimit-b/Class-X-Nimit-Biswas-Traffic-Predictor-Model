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

export interface RouteSegment {
  segmentId: number;
  startPercentage: number; // 0-100
  endPercentage: number;   // 0-100
  congestionLevel: 'Low' | 'Moderate' | 'High' | 'Severe';
}

export interface PredictionResult {
  summary: string;
  travelTimeEstimate: string;
  congestionLevel: 'Low' | 'Moderate' | 'High' | 'Severe';
  weatherImpact: string;
  eventImpact: string;
  chartData: ChartPoint[];
  trafficBreakdown: TrafficBreakdown[];
  factors: string[];
  routeLinks: Array<{ title: string; url: string }>;
  routeCoordinates?: [number, number][]; // Array of [lat, lon]
  routeStats?: RouteStats; // Real data from OSRM
  routeSegments?: RouteSegment[]; // For coloring the map
}