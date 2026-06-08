import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    google: any;
  }
}

interface MapViewProps {
  hospitalAddress?: string;
  hospitalLat?: number;
  hospitalLng?: number;
  donorLocation?: { lat: number; lng: number };
  onNavigate?: () => void;
  showNavigation?: boolean;
}

export function MapView({ hospitalAddress, hospitalLat, hospitalLng, donorLocation, onNavigate, showNavigation = true }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [directions, setDirections] = useState<any>(null);

  useEffect(() => {
    if (!window.google || !mapRef.current) return;

    // Use hospital coordinates if available, otherwise geocode address
    const initialCenter = hospitalLat && hospitalLng 
      ? { lat: hospitalLat, lng: hospitalLng }
      : { lat: 11.1271, lng: 78.6569 }; // Tamil Nadu center fallback

    const map = new window.google.maps.Map(mapRef.current, {
      center: initialCenter,
      zoom: hospitalLat && hospitalLng ? 14 : 7,
      styles: [
        { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
      ],
    });

    setMapLoaded(true);

    // If donor location is provided, show it
    if (donorLocation) {
      new window.google.maps.Marker({
        position: donorLocation,
        map,
        title: "Your Location",
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#dc2626",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
      });
    }

    // Show hospital marker using coordinates if available, otherwise geocode
    if (hospitalLat && hospitalLng) {
      new window.google.maps.Marker({
        position: { lat: hospitalLat, lng: hospitalLng },
        map,
        title: "Hospital",
        icon: {
          path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
          scale: 8,
          fillColor: "#16a34a",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
      });
      map.setCenter({ lat: hospitalLat, lng: hospitalLng });
      map.setZoom(14);
    } else if (hospitalAddress) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ address: hospitalAddress }, (results: any, status: string) => {
        if (status === "OK" && results[0]) {
          new window.google.maps.Marker({
            position: results[0].geometry.location,
            map,
            title: "Hospital",
            icon: {
              path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
              scale: 8,
              fillColor: "#16a34a",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 2,
            },
          });
          map.setCenter(results[0].geometry.location);
          map.setZoom(12);
        }
      });
    }
  }, [hospitalAddress, hospitalLat, hospitalLng, donorLocation]);

  function openNavigation() {
    if (!hospitalAddress) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(hospitalAddress)}`;
    window.open(url, "_blank");
    onNavigate?.();
  }

  if (!window.google) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
        <p className="text-sm">Map loading... (Google Maps API key required)</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div ref={mapRef} className="h-64 w-full rounded-xl bg-slate-100" />
      {showNavigation && hospitalAddress && (
        <button
          onClick={openNavigation}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-uyir-600 py-3 text-sm font-semibold text-white transition hover:bg-uyir-700"
        >
          🗺️ Navigate to Hospital
        </button>
      )}
    </div>
  );
}
