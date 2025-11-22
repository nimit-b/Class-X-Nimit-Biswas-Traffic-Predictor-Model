
import { RouteStats, RouteComposition } from "../types";

// Open Source Routing Machine (OSRM) - Free public API
const OSRM_BASE_URL = "https://router.project-osrm.org/route/v1/driving";

interface RouteResult {
  coordinates: [number, number][];
  stats: RouteStats;
  composition: RouteComposition;
}

export async function getRouteGeometry(startLat: number, startLon: number, endLat: number, endLon: number): Promise<RouteResult | null> {
  try {
    // Added steps=true to analyze the route composition
    const url = `${OSRM_BASE_URL}/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=geojson&steps=true`;
    
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const data = await response.json();
    
    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const coordinates = route.geometry.coordinates.map((coord: number[]) => [coord[1], coord[0]]);
      
      // Analyze Route Composition
      let highwayDistance = 0;
      let urbanDistance = 0;
      const roadNames = new Set<string>();

      // Iterate through legs and steps to classify roads
      route.legs.forEach((leg: any) => {
        leg.steps.forEach((step: any) => {
          const name = step.name || "";
          const ref = step.ref || "";
          const distance = step.distance || 0;

          // Heuristic: Roads with 'ref' (I-95, M1) or keywords are usually highways/major roads
          const isHighway = 
            ref.length > 0 || 
            name.includes("Highway") || 
            name.includes("Fwy") || 
            name.includes("Motorway") || 
            name.includes("Autobahn") || 
            name.includes("Expressway") || 
            name.includes("Toll");

          if (isHighway) {
            highwayDistance += distance;
          } else {
            urbanDistance += distance;
          }

          if ((name.length > 0 || ref.length > 0) && roadNames.size < 5) {
             roadNames.add(ref || name);
          }
        });
      });

      const totalDist = highwayDistance + urbanDistance;
      const percentHighway = totalDist > 0 ? Math.round((highwayDistance / totalDist) * 100) : 0;
      const percentUrban = 100 - percentHighway;

      return {
        coordinates,
        stats: {
          distanceMeters: route.distance, // in meters
          durationSeconds: route.duration // in seconds
        },
        composition: {
          percentHighway,
          percentUrban,
          majorRoadNames: Array.from(roadNames)
        }
      };
    }
    
    return null;
  } catch (error) {
    console.error("Routing error:", error);
    return null;
  }
}
