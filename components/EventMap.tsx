"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface EventMapProps {
  latitude: number;
  longitude: number;
  venueName?: string;
}

/**
 * Leaflet map component to render event coordinate locations on OpenStreetMap.
 * Safe for client-only dynamic loading.
 *
 * @author Thomas Djotio Ndié
 * @since 2026-05-27
 */
export default function EventMap({ latitude, longitude, venueName }: EventMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Remove existing map instance if container is being re-rendered
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Fix default Leaflet icon paths in compiled webpack environment
    const DefaultIcon = L.icon({
      iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
    });
    L.Marker.prototype.options.icon = DefaultIcon;

    try {
      const map = L.map(mapRef.current).setView([latitude, longitude], 13);
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      L.marker([latitude, longitude])
        .addTo(map)
        .bindPopup(venueName || "Event Location")
        .openPopup();
    } catch (err) {
      console.error("Leaflet map initialization failed:", err);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [latitude, longitude, venueName]);

  return (
    <div 
      className="w-full h-56 rounded-2xl overflow-hidden border border-[#e5e7eb] shadow-inner mt-4 z-10" 
      ref={mapRef} 
    />
  );
}
