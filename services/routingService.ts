import { RouteStats } from "../types";

// Open Source Routing Machine (OSRM) - Free public API
const OSRM_BASE_URL = "https://router.project-osrm.org/route/v1/driving";

interface RouteResult {
  coordinates: [number, number][];
  stats: RouteStats;
}

export async function getRouteGeometry(startLat: number, startLon: number, endLat: number, endLon: number): Promise<RouteResult | null> {
  try {
    // OSRM expects "lon,lat" format
    // Added annotations=true (though not strictly needed for basic geom) 
    // overview=full returns full resolution geometry
    const url = `${OSRM_BASE_URL}/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=geojson`;
    
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const data = await response.json();
    
    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      
      // OSRM returns [lon, lat], Leaflet needs [lat, lon]
      const coordinates = route.geometry.coordinates.map((coord: number[]) => [coord[1], coord[0]]);
      
      return {
        coordinates,
        stats: {
          distanceMeters: route.distance, // in meters
          durationSeconds: route.duration // in seconds
        }
      };
    }
    
    return null;
  } catch (error) {
    console.error("Routing error:", error);
    return null;
  }
}