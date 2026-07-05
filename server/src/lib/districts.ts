// Tamil Nadu districts: approximate centroid coordinates + neighbour adjacency.
// Used by the radius-expansion alert engine and distance estimation.

export interface DistrictInfo {
  name: string;
  lat: number;
  lng: number;
  neighbours: string[];
}

export const TN_DISTRICTS: Record<string, DistrictInfo> = {
  Ariyalur: { name: "Ariyalur", lat: 11.1399, lng: 79.0818, neighbours: ["Perambalur", "Cuddalore", "Thanjavur", "Trichy"] },
  Chengalpattu: { name: "Chengalpattu", lat: 12.6914, lng: 79.9896, neighbours: ["Chennai", "Kancheepuram", "Tiruvallur", "Viluppuram"] },
  Chennai: { name: "Chennai", lat: 13.0827, lng: 80.2707, neighbours: ["Tiruvallur", "Kancheepuram", "Chengalpattu"] },
  Coimbatore: { name: "Coimbatore", lat: 11.0168, lng: 76.9558, neighbours: ["Tiruppur", "Erode", "Nilgiris"] },
  Cuddalore: { name: "Cuddalore", lat: 11.7466, lng: 79.7644, neighbours: ["Viluppuram", "Ariyalur", "Nagapattinam", "Perambalur"] },
  Dharmapuri: { name: "Dharmapuri", lat: 12.121, lng: 78.1582, neighbours: ["Salem", "Krishnagiri", "Tiruvannamalai"] },
  Dindigul: { name: "Dindigul", lat: 10.3624, lng: 77.9695, neighbours: ["Madurai", "Karur", "Tiruppur", "Theni", "Trichy", "Sivaganga"] },
  Erode: { name: "Erode", lat: 11.341, lng: 77.7172, neighbours: ["Coimbatore", "Tiruppur", "Salem", "Namakkal", "Karur", "Nilgiris"] },
  Kallakurichi: { name: "Kallakurichi", lat: 11.876, lng: 78.9702, neighbours: ["Salem", "Viluppuram", "Tiruvannamalai", "Perambalur", "Ariyalur"] },
  Kancheepuram: { name: "Kancheepuram", lat: 12.8342, lng: 79.7036, neighbours: ["Chennai", "Chengalpattu", "Ranipet", "Tiruvannamalai", "Vellore"] },
  Karur: { name: "Karur", lat: 10.9601, lng: 78.0766, neighbours: ["Erode", "Namakkal", "Trichy", "Dindigul", "Tiruppur"] },
  Krishnagiri: { name: "Krishnagiri", lat: 12.5186, lng: 78.2137, neighbours: ["Dharmapuri", "Vellore", "Tirupathur"] },
  Madurai: { name: "Madurai", lat: 9.9252, lng: 78.1198, neighbours: ["Dindigul", "Theni", "Sivaganga", "Virudhunagar"] },
  Mayiladuthurai: { name: "Mayiladuthurai", lat: 11.1036, lng: 79.6498, neighbours: ["Nagapattinam", "Tiruvarur", "Cuddalore"] },
  Nagapattinam: { name: "Nagapattinam", lat: 10.7666, lng: 79.8428, neighbours: ["Thanjavur", "Thiruvarur", "Mayiladuthurai", "Pudukkottai"] },
  Namakkal: { name: "Namakkal", lat: 11.2189, lng: 78.1677, neighbours: ["Salem", "Erode", "Karur", "Trichy"] },
  Nilgiris: { name: "Nilgiris", lat: 11.4916, lng: 76.7337, neighbours: ["Coimbatore", "Erode"] },
  Perambalur: { name: "Perambalur", lat: 11.2333, lng: 78.8833, neighbours: ["Trichy", "Ariyalur", "Cuddalore", "Kallakurichi"] },
  Pudukkottai: { name: "Pudukkottai", lat: 10.3819, lng: 78.8216, neighbours: ["Trichy", "Sivaganga", "Thanjavur", "Nagapattinam", "Ramanathapuram"] },
  Ramanathapuram: { name: "Ramanathapuram", lat: 9.3716, lng: 78.83, neighbours: ["Sivaganga", "Pudukkottai", "Virudhunagar", "Thoothukudi"] },
  Ranipet: { name: "Ranipet", lat: 12.9442, lng: 79.3355, neighbours: ["Vellore", "Kancheepuram", "Tiruvannamalai", "Tirupathur"] },
  Salem: { name: "Salem", lat: 11.6643, lng: 78.146, neighbours: ["Namakkal", "Erode", "Dharmapuri", "Kallakurichi"] },
  Sivaganga: { name: "Sivaganga", lat: 9.8433, lng: 78.4801, neighbours: ["Madurai", "Pudukkottai", "Ramanathapuram", "Virudhunagar", "Dindigul"] },
  Tenkasi: { name: "Tenkasi", lat: 8.9608, lng: 77.3152, neighbours: ["Tirunelveli", "Thoothukudi", "Virudhunagar"] },
  Thanjavur: { name: "Thanjavur", lat: 10.787, lng: 79.1378, neighbours: ["Trichy", "Pudukkottai", "Tiruvarur", "Nagapattinam", "Ariyalur"] },
  Theni: { name: "Theni", lat: 10.0104, lng: 77.4768, neighbours: ["Madurai", "Dindigul"] },
  Thoothukudi: { name: "Thoothukudi", lat: 8.7642, lng: 78.1348, neighbours: ["Tirunelveli", "Tenkasi", "Ramanathapuram", "Virudhunagar"] },
  Tiruchirappalli: { name: "Tiruchirappalli", lat: 10.7905, lng: 78.7047, neighbours: ["Karur", "Perambalur", "Ariyalur", "Thanjavur", "Pudukkottai", "Namakkal"] },
  Tirunelveli: { name: "Tirunelveli", lat: 8.7139, lng: 77.7567, neighbours: ["Thoothukudi", "Tenkasi", "Virudhunagar"] },
  Tirupathur: { name: "Tirupathur", lat: 12.4964, lng: 78.5628, neighbours: ["Krishnagiri", "Vellore", "Ranipet", "Dharmapuri"] },
  Tiruppur: { name: "Tiruppur", lat: 11.1085, lng: 77.3411, neighbours: ["Coimbatore", "Erode", "Dindigul", "Karur"] },
  Tiruvallur: { name: "Tiruvallur", lat: 13.1462, lng: 79.9252, neighbours: ["Chennai", "Kancheepuram", "Chengalpattu"] },
  Tiruvannamalai: { name: "Tiruvannamalai", lat: 12.2253, lng: 79.0747, neighbours: ["Vellore", "Ranipet", "Kancheepuram", "Dharmapuri", "Kallakurichi", "Viluppuram"] },
  Tiruvarur: { name: "Tiruvarur", lat: 10.3349, lng: 79.6377, neighbours: ["Thanjavur", "Nagapattinam", "Mayiladuthurai", "Pudukkottai"] },
  Trichy: { name: "Trichy", lat: 10.7905, lng: 78.7047, neighbours: ["Karur", "Perambalur", "Ariyalur", "Thanjavur", "Pudukkottai", "Namakkal"] },
  Vellore: { name: "Vellore", lat: 12.9165, lng: 79.1325, neighbours: ["Tiruvannamalai", "Ranipet", "Krishnagiri", "Tirupathur"] },
  Viluppuram: { name: "Viluppuram", lat: 11.941, lng: 79.4892, neighbours: ["Tiruvannamalai", "Kallakurichi", "Cuddalore", "Chengalpattu", "Kancheepuram"] },
  Virudhunagar: { name: "Virudhunagar", lat: 9.568, lng: 77.9624, neighbours: ["Madurai", "Sivaganga", "Tirunelveli", "Tenkasi", "Thoothukudi", "Ramanathapuram"] },
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
