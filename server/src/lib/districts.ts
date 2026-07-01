// Tamil Nadu districts: approximate centroid coordinates + neighbour adjacency.
// Used by the radius-expansion alert engine and distance estimation.

export interface DistrictInfo {
  name: string;
  lat: number;
  lng: number;
  neighbours: string[];
}

export const TN_DISTRICTS: Record<string, DistrictInfo> = {
  Chennai: { name: "Chennai", lat: 13.0827, lng: 80.2707, neighbours: ["Tiruvallur", "Kancheepuram", "Chengalpattu"] },
  Coimbatore: { name: "Coimbatore", lat: 11.0168, lng: 76.9558, neighbours: ["Tiruppur", "Erode", "Nilgiris"] },
  Madurai: { name: "Madurai", lat: 9.9252, lng: 78.1198, neighbours: ["Dindigul", "Theni", "Sivaganga", "Virudhunagar"] },
  Salem: { name: "Salem", lat: 11.6643, lng: 78.146, neighbours: ["Namakkal", "Erode", "Dharmapuri", "Kallakurichi"] },
  Tiruppur: { name: "Tiruppur", lat: 11.1085, lng: 77.3411, neighbours: ["Coimbatore", "Erode", "Dindigul", "Karur"] },
  Erode: { name: "Erode", lat: 11.341, lng: 77.7172, neighbours: ["Coimbatore", "Tiruppur", "Salem", "Namakkal", "Karur", "Nilgiris"] },
  Trichy: { name: "Trichy", lat: 10.7905, lng: 78.7047, neighbours: ["Karur", "Perambalur", "Ariyalur", "Thanjavur", "Pudukkottai", "Namakkal"] },
  Namakkal: { name: "Namakkal", lat: 11.2189, lng: 78.1677, neighbours: ["Salem", "Erode", "Karur", "Trichy"] },
  Dharmapuri: { name: "Dharmapuri", lat: 12.121, lng: 78.1582, neighbours: ["Salem", "Krishnagiri", "Tiruvannamalai"] },
  Karur: { name: "Karur", lat: 10.9601, lng: 78.0766, neighbours: ["Erode", "Namakkal", "Trichy", "Dindigul", "Tiruppur"] },
  Dindigul: { name: "Dindigul", lat: 10.3624, lng: 77.9695, neighbours: ["Madurai", "Karur", "Tiruppur", "Theni", "Trichy"] },
  Tirunelveli: { name: "Tirunelveli", lat: 8.7139, lng: 77.7567, neighbours: ["Thoothukudi", "Tenkasi", "Virudhunagar"] },
  Vellore: { name: "Vellore", lat: 12.9165, lng: 79.1325, neighbours: ["Tiruvannamalai", "Ranipet", "Krishnagiri"] },
  Ranipet: { name: "Ranipet", lat: 12.9442, lng: 79.3355, neighbours: ["Vellore", "Kancheepuram", "Tiruvannamalai"] },
  Thanjavur: { name: "Thanjavur", lat: 10.787, lng: 79.1378, neighbours: ["Trichy", "Pudukkottai", "Thiruvarur", "Nagapattinam", "Ariyalur"] },
  Kanchipuram: { name: "Kancheepuram", lat: 12.8342, lng: 79.7036, neighbours: ["Chennai", "Chengalpattu", "Ranipet", "Tiruvannamalai", "Vellore"] },
  Krishnagiri: { name: "Krishnagiri", lat: 12.5186, lng: 78.2137, neighbours: ["Dharmapuri", "Vellore"] },
  Theni: { name: "Theni", lat: 10.0104, lng: 77.4768, neighbours: ["Madurai", "Dindigul"] },
  Virudhunagar: { name: "Virudhunagar", lat: 9.568, lng: 77.9624, neighbours: ["Madurai", "Sivaganga", "Tirunelveli"] },
  Nilgiris: { name: "Nilgiris", lat: 11.4916, lng: 76.7337, neighbours: ["Coimbatore", "Erode"] },
};

export const TN_DISTRICT_NAMES = Object.keys(TN_DISTRICTS);

export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const lat1 = (aLat * Math.PI) / 180;
  const lat2 = (bLat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 10) / 10;
}

// Returns the set of districts to alert for a given radius tier.
export function districtsForRadius(origin: string, radiusKm: number): string[] {
  const base = TN_DISTRICTS[origin];
  if (!base) return [origin];
  if (radiusKm <= 25) return [origin]; // 25 km: entire town/city within district (distance filter applied in alert cycle)
  if (radiusKm <= 50) return [origin]; // 50 km: entire district
  if (radiusKm <= 100) return [origin, ...base.neighbours]; // 100 km: district + neighbouring districts
  return TN_DISTRICT_NAMES; // entire Tamil Nadu
}

// Radius escalation ladder (km). 25(town) -> 50(district) -> 100(neighbours) -> 9999(TN)
export const RADIUS_LADDER = [25, 50, 100, 9999];
