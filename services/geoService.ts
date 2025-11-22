import { LocationData } from "../types";

const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org/search";
const NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse";

export async function getCoordinates(address: string): Promise<LocationData | null> {
  if (!address.trim()) return null;
  
  try {
    const params = new URLSearchParams({
      q: address,
      format: "json",
      limit: "1",
      addressdetails: "1"
    });

    const response = await fetch(`${NOMINATIM_BASE_URL}?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error("Geocoding service unavailable");
    }

    const data = await response.json();

    if (data && data.length > 0) {
      return {
        name: data[0].display_name,
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
      };
    }

    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}

export async function getAddressFromCoordinates(lat: number, lon: number): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lon: lon.toString(),
      format: "json",
    });

    const response = await fetch(`${NOMINATIM_REVERSE_URL}?${params.toString()}`);
    if (!response.ok) return null;

    const data = await response.json();
    return data.display_name || null;
  } catch (error) {
    console.error("Reverse geocoding error:", error);
    return null;
  }
}