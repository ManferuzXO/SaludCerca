import {
  CircleMarker,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { type MutableRefObject, useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { Center } from "../data";

type Position = { latitude: number; longitude: number };
const laPaz: [number, number] = [-16.4897, -68.1193];

function centerIcon(active: boolean) {
  return L.divIcon({
    className: "health-marker-wrap",
    html: `<span class="health-marker ${active ? "selected" : ""}">+</span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

function FocusSelected({
  selected,
  markerRefs,
}: {
  selected: Center | null;
  markerRefs: MutableRefObject<Record<string, L.Marker>>;
}) {
  const map = useMap();
  useEffect(() => {
    if (selected?.latitude === undefined || selected.longitude === undefined) return;
    const focusCenter = () => {
      map.invalidateSize({ animate: false });
      map.flyTo([selected.latitude!, selected.longitude!], 13, {
        animate: true,
        duration: 0.65,
      });
      markerRefs.current[selected.id]?.openPopup();
    };
    const timer = window.setTimeout(focusCenter, 80);
    return () => window.clearTimeout(timer);
  }, [map, markerRefs, selected?.id, selected?.latitude, selected?.longitude]);
  return null;
}

export function HealthMap({
  centers,
  selected,
  userPosition,
  onSelect,
  onReserve,
  containerRef,
}: {
  centers: Center[];
  selected: Center | null;
  userPosition: Position | null;
  onSelect: (center: Center) => void;
  onReserve: (center: Center) => void;
  containerRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const markerRefs = useRef<Record<string, L.Marker>>({});
  const availableCenters = centers.filter((center) => center.latitude !== undefined && center.longitude !== undefined);
  const focus: [number, number] = userPosition
    ? [userPosition.latitude, userPosition.longitude]
    : selected?.latitude !== undefined && selected.longitude !== undefined
      ? [selected.latitude, selected.longitude]
      : laPaz;
  return (
    <div className="health-map" ref={containerRef}>
      <MapContainer
        center={focus}
        zoom={13}
        scrollWheelZoom
        className="leaflet-map"
      >
        <FocusSelected selected={selected} markerRefs={markerRefs} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {userPosition && (
          <CircleMarker
            center={[userPosition.latitude, userPosition.longitude]}
            radius={9}
            pathOptions={{
              color: "#ffffff",
              weight: 3,
              fillColor: "#287fbd",
              fillOpacity: 1,
            }}
          >
            <Popup>Tu ubicación</Popup>
          </CircleMarker>
        )}
        {availableCenters.map((center) => (
          <Marker
            key={center.id}
            position={[center.latitude!, center.longitude!]}
            icon={centerIcon(selected?.id === center.id)}
            ref={(marker) => {
              if (marker) markerRefs.current[center.id] = marker;
            }}
            eventHandlers={{ click: () => onSelect(center) }}
          >
            <Popup>
              <strong>{center.name}</strong>
              <br />
              {center.address}
              <br />
              <button
                className="map-popup-button"
                onClick={() => onReserve(center)}
              >
                Seleccionar
              </button>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <div className="map-legend">
        <span>
          <i className="legend-dot active-dot" />
          Seleccionado
        </span>
        <span>
          <i className="legend-dot" />
          Verificado
        </span>
      </div>
    </div>
  );
}
