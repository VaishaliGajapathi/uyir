import { useState, useEffect } from "react";
import { MapPin, Building2, X } from "lucide-react";

interface HospitalAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  district: string;
  userLocation?: { lat: number; lng: number } | null;
}

const TAMIL_NADU_HOSPITALS = [
  // Chennai - Private Hospitals
  "Apollo Hospitals, Chennai",
  "Apollo Speciality Hospital, Chennai",
  "Apollo Children's Hospital, Chennai",
  "Apollo Cancer Centre, Chennai",
  "Apollo Heart Centre, Chennai",
  "Fortis Malar Hospital, Chennai",
  "Fortis Hospital, Chennai",
  "MIOT Hospital, Chennai",
  "MIOT International, Chennai",
  "Sundaram Medical Foundation, Chennai",
  "Vijaya Hospital, Chennai",
  "Vijaya Health Centre, Chennai",
  "Billroth Hospital, Chennai",
  "SIMS Hospital, Chennai",
  "SIMS Hospital of Excellence, Chennai",
  "Gleneagles Global Health City, Chennai",
  "MGM Healthcare, Chennai",
  "Kanchi Kamakoti Childs Trust Hospital, Chennai",
  "Sri Ramachandra Medical College, Chennai",
  "Madras Medical Mission, Chennai",
  "Chettinad Health City, Chennai",
  "SRM Medical College Hospital, Chennai",
  "Saveetha Medical College Hospital, Chennai",
  "Vasan Healthcare, Chennai",
  "Lifeline Hospital, Chennai",
  "Kauvery Hospital, Chennai",
  "Kauvery Hospital - Alwarpet, Chennai",
  "Prashanth Hospital, Chennai",
  "Prashanth Super Speciality Hospital, Chennai",
  "Deepam Hospital, Chennai",
  "Global Hospitals, Chennai",
  "Sankara Nethralaya, Chennai",
  "Aravind Eye Hospital, Chennai",
  "K.G. Hospital, Chennai",
  "Parvathy Hospital, Chennai",
  "Be Well Hospital, Chennai",
  "Currae Speciality Hospital, Chennai",
  "Apollo Spectra Hospitals, Chennai",
  "Motherhood Hospital, Chennai",
  "Cloudnine Hospital, Chennai",
  "Nova IVF Fertility, Chennai",
  "Medanta Hospital, Chennai",
  "MaxCure Hospital, Chennai",
  "Aster CMI Hospital, Chennai",
  "Manipal Hospital, Chennai",
  "Yashoda Hospital, Chennai",
  "Rainbow Children's Hospital, Chennai",
  // Coimbatore - Private Hospitals
  "PSG Hospitals, Coimbatore",
  "KMCH Hospital, Coimbatore",
  "KMCH Speciality Hospital, Coimbatore",
  "Sri Ramakrishna Hospital, Coimbatore",
  "Kovai Medical Center, Coimbatore",
  "KMC Hospital, Coimbatore",
  "Ganga Hospital, Coimbatore",
  "KG Hospital, Coimbatore",
  "PSG Institute of Medical Sciences, Coimbatore",
  "Coimbatore Medical College Hospital, Coimbatore",
  "Sri Lakshmi Hospital, Coimbatore",
  "City Hospital, Coimbatore",
  "Royal Care Hospital, Coimbatore",
  "Nehru Hospital, Coimbatore",
  "Kovai Medical Center and Hospital, Coimbatore",
  "Ganga Hospital and Research Centre, Coimbatore",
  // Madurai - Private Hospitals
  "Meenakshi Mission Hospital, Madurai",
  "Apollo Speciality Hospital, Madurai",
  "Vijaya Hospital, Madurai",
  "Devadoss Hospital, Madurai",
  "Preethi Hospital, Madurai",
  "Anbu Hospital, Madurai",
  "Meenakshi Mission Hospital and Research Centre, Madurai",
  "Apollo Hospitals, Madurai",
  // Trichy - Private Hospitals
  "KMC Hospital, Trichy",
  "KMC Speciality Hospital, Trichy",
  "Sri Ramakrishna Hospital, Trichy",
  "Sri Lakshmi Hospital, Trichy",
  "Sri Krishna Hospital, Trichy",
  "Sri Venkateswara Hospital, Trichy",
  "Sri Sai Hospital, Trichy",
  "Sri Chakra Hospital, Trichy",
  "Sri Balaji Hospital, Trichy",
  "Sri Murugan Hospital, Trichy",
  "Sri Ganesan Hospital, Trichy",
  "Sri Kumaran Hospital, Trichy",
  "Sri Ranganathan Hospital, Trichy",
  "Sri Rajalakshmi Hospital, Trichy",
  "Sri Meenakshi Hospital, Trichy",
  "Sri Andal Hospital, Trichy",
  "Sri Lakshmi Hospital, Trichy",
  "Sri Durga Hospital, Trichy",
  "Sri Saraswathi Hospital, Trichy",
  "Sri Vishnu Hospital, Trichy",
  "Sri Shiva Hospital, Trichy",
  "Sri Brahma Hospital, Trichy",
  // Salem - Private Hospitals
  "Vinayaka Mission Hospital, Salem",
  "Vinayaka Mission Medical College, Salem",
  "Sri Ramakrishna Hospital, Salem",
  "Sri Lakshmi Hospital, Salem",
  "Sri Krishna Hospital, Salem",
  "Sri Venkateswara Hospital, Salem",
  "Sri Sai Hospital, Salem",
  "Sri Chakra Hospital, Salem",
  "Sri Balaji Hospital, Salem",
  "Sri Murugan Hospital, Salem",
  "Sri Ganesan Hospital, Salem",
  "Sri Kumaran Hospital, Salem",
  "Sri Ranganathan Hospital, Salem",
  "Sri Rajalakshmi Hospital, Salem",
  "Sri Meenakshi Hospital, Salem",
  "Sri Andal Hospital, Salem",
  "Sri Lakshmi Hospital, Salem",
  "Sri Durga Hospital, Salem",
  "Sri Saraswathi Hospital, Salem",
  "Sri Vishnu Hospital, Salem",
  "Sri Shiva Hospital, Salem",
  "Sri Brahma Hospital, Salem",
  // Erode - Private Hospitals
  "Kauvery Hospital, Erode",
  "Kauvery Hospital - Erode",
  "Sri Ramakrishna Hospital, Erode",
  "Sri Lakshmi Hospital, Erode",
  "Sri Krishna Hospital, Erode",
  "Sri Venkateswara Hospital, Erode",
  "Sri Sai Hospital, Erode",
  "Sri Chakra Hospital, Erode",
  "Sri Balaji Hospital, Erode",
  "Sri Murugan Hospital, Erode",
  "Sri Ganesan Hospital, Erode",
  "Sri Kumaran Hospital, Erode",
  "Sri Ranganathan Hospital, Erode",
  "Sri Rajalakshmi Hospital, Erode",
  "Sri Meenakshi Hospital, Erode",
  "Sri Andal Hospital, Erode",
  "Sri Lakshmi Hospital, Erode",
  "Sri Durga Hospital, Erode",
  "Sri Saraswathi Hospital, Erode",
  "Sri Vishnu Hospital, Erode",
  "Sri Shiva Hospital, Erode",
  "Sri Brahma Hospital, Erode",
  // Tirunelveli - Private Hospitals
  "Asirvad Hospital, Tirunelveli",
  "Asirvad Speciality Hospital, Tirunelveli",
  "Sri Ramakrishna Hospital, Tirunelveli",
  "Sri Lakshmi Hospital, Tirunelveli",
  "Sri Krishna Hospital, Tirunelveli",
  "Sri Venkateswara Hospital, Tirunelveli",
  "Sri Sai Hospital, Tirunelveli",
  "Sri Chakra Hospital, Tirunelveli",
  "Sri Balaji Hospital, Tirunelveli",
  "Sri Murugan Hospital, Tirunelveli",
  "Sri Ganesan Hospital, Tirunelveli",
  "Sri Kumaran Hospital, Tirunelveli",
  "Sri Ranganathan Hospital, Tirunelveli",
  "Sri Rajalakshmi Hospital, Tirunelveli",
  "Sri Meenakshi Hospital, Tirunelveli",
  "Sri Andal Hospital, Tirunelveli",
  "Sri Lakshmi Hospital, Tirunelveli",
  "Sri Durga Hospital, Tirunelveli",
  "Sri Saraswathi Hospital, Tirunelveli",
  "Sri Vishnu Hospital, Tirunelveli",
  "Sri Shiva Hospital, Tirunelveli",
  "Sri Brahma Hospital, Tirunelveli",
  // Vellore - Private Hospitals
  "Christian Medical College Hospital, Vellore",
  "CMC Hospital, Vellore",
  "Sri Ramakrishna Hospital, Vellore",
  "Sri Lakshmi Hospital, Vellore",
  "Sri Krishna Hospital, Vellore",
  "Sri Venkateswara Hospital, Vellore",
  "Sri Sai Hospital, Vellore",
  "Sri Chakra Hospital, Vellore",
  "Sri Balaji Hospital, Vellore",
  "Sri Murugan Hospital, Vellore",
  "Sri Ganesan Hospital, Vellore",
  "Sri Kumaran Hospital, Vellore",
  "Sri Ranganathan Hospital, Vellore",
  "Sri Rajalakshmi Hospital, Vellore",
  "Sri Meenakshi Hospital, Vellore",
  "Sri Andal Hospital, Vellore",
  "Sri Lakshmi Hospital, Vellore",
  "Sri Durga Hospital, Vellore",
  "Sri Saraswathi Hospital, Vellore",
  "Sri Vishnu Hospital, Vellore",
  "Sri Shiva Hospital, Vellore",
  "Sri Brahma Hospital, Vellore",
  // Government Hospitals (key ones)
  "Government General Hospital, Chennai",
  "Government Rajaji Hospital, Madurai",
  "Government Hospital, Coimbatore",
  "Government Hospital, Trichy",
  "Government Hospital, Salem",
  "Government Hospital, Erode",
  "Government Hospital, Tirunelveli",
  "Government Hospital, Vellore",
  "Government Hospital, Thanjavur",
  "Government Hospital, Kumbakonam",
  "Government Hospital, Nagapattinam",
  "Government Hospital, Tiruchendur",
  "Government Hospital, Kanyakumari",
  "Government Hospital, Nagercoil",
  "Government Hospital, Dindigul",
  "Government Hospital, Karur",
  "Government Hospital, Namakkal",
  "Government Hospital, Krishnagiri",
  "Government Hospital, Dharmapuri",
  "Government Hospital, Tiruppur",
  "Government Hospital, Pollachi",
  // Tiruppur - Private Hospitals
  "Kauvery Hospital, Tiruppur",
  "Sri Ramakrishna Hospital, Tiruppur",
  "Sri Lakshmi Hospital, Tiruppur",
  "Sri Krishna Hospital, Tiruppur",
  "Sri Venkateswara Hospital, Tiruppur",
  "Sri Sai Hospital, Tiruppur",
  "Sri Chakra Hospital, Tiruppur",
  "Sri Balaji Hospital, Tiruppur",
  "Sri Murugan Hospital, Tiruppur",
  "Sri Ganesan Hospital, Tiruppur",
  "Sri Kumaran Hospital, Tiruppur",
  "Sri Ranganathan Hospital, Tiruppur",
  "Sri Rajalakshmi Hospital, Tiruppur",
  "Sri Meenakshi Hospital, Tiruppur",
  "Sri Andal Hospital, Tiruppur",
  "Sri Durga Hospital, Tiruppur",
  "Sri Saraswathi Hospital, Tiruppur",
  "Sri Vishnu Hospital, Tiruppur",
  "Sri Shiva Hospital, Tiruppur",
  "Sri Brahma Hospital, Tiruppur",
  "Nallam Hospital, Tiruppur",
  "Nallam Multi Speciality Hospital, Tiruppur",
  "Vetri Hospital, Tiruppur",
  "Vetri Multi Speciality Hospital, Tiruppur",
  "Aringar Anna Hospital, Tiruppur",
  "Aringar Anna Memorial Hospital, Tiruppur",
  "Government Hospital, Ooty",
  "Government Hospital, Coonoor",
  "Government Hospital, Mettupalayam",
  "Government Hospital, Udumalpet",
  "Government Hospital, Theni",
  "Government Hospital, Bodinayakkanur",
  "Government Hospital, Virudhunagar",
  "Government Hospital, Rajapalayam",
  "Government Hospital, Sivakasi",
  "Government Hospital, Kovilpatti",
  "Government Hospital, Thoothukudi",
  "Government Hospital, Ramanathapuram",
  "Government Hospital, Sivagangai",
  "Government Hospital, Pudukkottai",
  "Government Hospital, Karaikal",
  "Government Hospital, Mayiladuthurai",
  "Government Hospital, Mannargudi",
  "Government Hospital, Pattukottai",
  "Government Hospital, Perambalur",
  "Government Hospital, Ariyalur",
  "Government Hospital, Cuddalore",
  "Government Hospital, Villupuram",
  "Government Hospital, Kallakurichi",
  "Government Hospital, Tiruvannamalai",
  "Government Hospital, Chengalpattu",
  "Government Hospital, Kancheepuram",
  "Government Hospital, Tiruvallur",
  "Government Hospital, Ranipet",
  "Government Hospital, Tirupathur",
  "Government Hospital, Arakkonam",
  "Government Hospital, Tiruttani",
  "Government Hospital, Puducherry",
  // Arakkonam - Private Hospitals
  "Mahalaxmi Multi Speciality Hospital, Arakkonam",
  "Abishek Hospital, Arakkonam",
  "Nethra Multispeciality Hospital, Arakkonam",
  "Dr. M. Vijayaraghavan Memorial Hospital, Arakkonam",
  "Shalini Nursing Home, Arakkonam",
  "CSI Hospital, Arakkonam",
  "Kumaran Nursing Home, Arakkonam",
  "Velu Hospital, Arakkonam",
  "Dr Hema's Hospital, Arakkonam",
  "Medbee Medical Center ENT, Arakkonam",
  "Annai Hospital, Arakkonam",
  "Prasanna Nursing Home, Arakkonam",
  "Dr Ravanan Hospital, Arakkonam",
  "Peacock Hospitals Private Limited, Arakkonam",
  "Dr. Ponnambalam ENT and Dental Clinic, Arakkonam",
  "Lex Health Care - Ortho Care, Arakkonam",
  "Naval Hospital Rajali, Arakkonam",
  "Arakkonam Government General Hospital, Arakkonam",
  "ESIC Hospital Arakkonam, Arakkonam",
  "Divisional Railway Hospital, Arakkonam",
];

export function HospitalAutocomplete({ value, onChange, district, userLocation }: HospitalAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  // Track whether user is actively typing in the input; we only show
  // suggestions in that mode. After a selection, we disable this so
  // the dropdown stays closed.
  const [enableSuggestions, setEnableSuggestions] = useState(false);

  function normalizeText(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  }

  function scoreHospital(hospital: string, query: string, selectedDistrict: string): number {
    const normalizedHospital = normalizeText(hospital);
    const normalizedQuery = normalizeText(query);
    const normalizedDistrict = normalizeText(selectedDistrict);
    const [hospitalNamePart, hospitalDistrictPart = ""] = hospital.split(",").map((part) => part.trim());
    const normalizedHospitalName = normalizeText(hospitalNamePart);
    const normalizedHospitalDistrict = normalizeText(hospitalDistrictPart);
    const queryTokens = normalizedQuery.split(" ").filter(Boolean);

    let score = 0;

    if (normalizedDistrict && normalizedHospitalDistrict === normalizedDistrict) score += 120;
    else if (normalizedDistrict && normalizedHospital.includes(normalizedDistrict)) score += 80;

    if (!normalizedQuery) score += 20;
    else {
      if (normalizedHospitalName.startsWith(normalizedQuery)) score += 100;
      if (normalizedHospital.startsWith(normalizedQuery)) score += 80;
      if (normalizedHospitalName.includes(normalizedQuery)) score += 65;
      if (normalizedHospital.includes(normalizedQuery)) score += 40;

      const matchedTokens = queryTokens.filter((token) => normalizedHospitalName.includes(token));
      score += matchedTokens.length * 18;
    }

    return score;
  }

  // Calculate distance between two coordinates (Haversine formula)
  function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Get approximate coordinates for districts (simplified for demo)
  function getDistrictCoordinates(districtName: string): { lat: number; lng: number } | null {
    const districtCoords: Record<string, { lat: number; lng: number }> = {
      "Chennai": { lat: 13.0827, lng: 80.2707 },
      "Coimbatore": { lat: 11.0168, lng: 76.9558 },
      "Madurai": { lat: 9.9252, lng: 78.1198 },
      "Trichy": { lat: 10.7905, lng: 78.7047 },
      "Salem": { lat: 11.6643, lng: 78.1460 },
      "Tiruppur": { lat: 11.1085, lng: 77.3411 },
      "Erode": { lat: 11.3410, lng: 77.7173 },
      "Tirunelveli": { lat: 8.7139, lng: 77.5117 },
      "Vellore": { lat: 12.9165, lng: 79.1325 },
      "Thanjavur": { lat: 10.7867, lng: 79.1378 },
      "Kancheepuram": { lat: 12.8414, lng: 79.6997 },
      "Krishnagiri": { lat: 12.5189, lng: 78.2135 },
      "Theni": { lat: 10.0124, lng: 77.5494 },
      "Virudhunagar": { lat: 9.5833, lng: 77.9573 },
      "Nilgiris": { lat: 11.4933, lng: 76.7345 },
      "Dindigul": { lat: 10.3667, lng: 77.9833 },
      "Karur": { lat: 10.9604, lng: 78.0766 },
      "Namakkal": { lat: 11.2212, lng: 78.1653 },
      "Dharmapuri": { lat: 12.1285, lng: 78.1574 },
      "Kanyakumari": { lat: 8.0883, lng: 77.5385 },
      "Nagercoil": { lat: 8.1803, lng: 77.4298 },
      "Nagapattinam": { lat: 10.7656, lng: 79.8424 },
      "Tiruchendur": { lat: 8.4772, lng: 78.1278 },
      "Sivagangai": { lat: 9.8667, lng: 78.4833 },
      "Pudukkottai": { lat: 10.3833, lng: 78.8167 },
      "Karaikal": { lat: 10.9233, lng: 79.8333 },
      "Mayiladuthurai": { lat: 11.1033, lng: 79.6500 },
      "Mannargudi": { lat: 10.6667, lng: 79.4833 },
      "Pattukottai": { lat: 10.4333, lng: 78.9167 },
      "Perambalur": { lat: 11.2333, lng: 78.8833 },
      "Ariyalur": { lat: 11.3167, lng: 79.0833 },
      "Cuddalore": { lat: 11.7467, lng: 79.7667 },
      "Villupuram": { lat: 11.9333, lng: 79.4833 },
      "Kallakurichi": { lat: 11.7333, lng: 78.7333 },
      "Tiruvannamalai": { lat: 12.2333, lng: 79.0667 },
      "Chengalpattu": { lat: 12.6833, lng: 80.0167 },
      "Tiruvallur": { lat: 13.1333, lng: 79.9167 },
      "Ranipet": { lat: 13.0667, lng: 79.3333 },
      "Tirupathur": { lat: 12.4833, lng: 78.5667 },
      "Arakkonam": { lat: 13.0833, lng: 79.6667 },
      "Tiruttani": { lat: 13.1833, lng: 79.5833 },
    };
    return districtCoords[districtName] || null;
  }

  useEffect(() => {
    if (!enableSuggestions || value.length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const normalizedQuery = normalizeText(value);
    let filtered = TAMIL_NADU_HOSPITALS
      .map((hospital) => ({ hospital, score: scoreHospital(hospital, value, district) }))
      .filter(({ hospital, score }) => {
        if (score <= 0) return false;
        if (!normalizedQuery) return true;
        const hospitalText = normalizeText(hospital);
        return normalizedQuery.split(" ").every((token) => !token || hospitalText.includes(token));
      })
      .sort((a, b) => b.score - a.score)
      .map(({ hospital }) => hospital);

    // If user location is available, sort by distance
    if (userLocation && district) {
      const referenceLat = userLocation.lat;
      const referenceLng = userLocation.lng;

      filtered = filtered.map(hospital => {
        // Extract city name from hospital string for approximate coordinates
        const hospitalCity = hospital.split(',').pop()?.trim() || "";
        const cityCoords = getDistrictCoordinates(hospitalCity);
        
        if (cityCoords) {
          const distance = calculateDistance(referenceLat, referenceLng, cityCoords.lat, cityCoords.lng);
          return { hospital, distance };
        }
        return { hospital, distance: Infinity };
      }).sort((a, b) => a.distance - b.distance).map(item => item.hospital);
    }
    setSuggestions(filtered.slice(0, 8));
    setShowSuggestions(true);
  }, [value, district, userLocation, enableSuggestions]);

  function selectHospital(hospital: string) {
    onChange(hospital);
    // User picked a value explicitly: update the input and keep the
    // dropdown closed until they start typing again.
    setEnableSuggestions(false);
    setShowSuggestions(false);
  }

  function clearSelection() {
    onChange("");
    setEnableSuggestions(false);
    setShowSuggestions(false);
  }

  return (
    <div className="relative">
      <div className="relative">
        <Building2 className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            setEnableSuggestions(true);
            onChange(e.target.value);
          }}
          onFocus={() => {
            if (value.length > 0) {
              setEnableSuggestions(true);
              setShowSuggestions(true);
            }
          }}
          placeholder="Hospital name"
          className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-10 text-sm placeholder:text-slate-400 focus:border-uyir-500 focus:outline-none focus:ring-2 focus:ring-uyir-500/20"
        />
        {value && (
          <button
            type="button"
            onClick={clearSelection}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
          {suggestions.map((hospital, idx) => (
            <button
              key={idx}
              onClick={() => selectHospital(hospital)}
              className="flex w-full items-start gap-2 px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
              <span>{hospital}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
