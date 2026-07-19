import {
  CircleMarker,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";
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

function Recenter({ center }: { center: [number, number] }) {
  const map = useMap();
  map.setView(center, 15, { animate: true });
  return null;
}

export function HealthMap({
  centers,
  selected,
  userPosition,
  onSelect,
}: {
  centers: Center[];
  selected: Center | null;
  userPosition: Position | null;
  onSelect: (center: Center) => void;
}) {
  const availableCenters = centers.filter((center) => center.latitude !== undefined && center.longitude !== undefined);
  const focus: [number, number] = userPosition
    ? [userPosition.latitude, userPosition.longitude]
    : selected?.latitude !== undefined && selected.longitude !== undefined
      ? [selected.latitude, selected.longitude]
      : laPaz;
  return (
    <div className="health-map">
      <MapContainer
        center={focus}
        zoom={13}
        scrollWheelZoom
        className="leaflet-map"
      >
        <Recenter center={focus} />
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
            eventHandlers={{ click: () => onSelect(center) }}
          >
            <Popup>
              <strong>{center.name}</strong>
              <br />
              {center.address}
              <br />
              <button
                className="map-popup-button"
                onClick={() => onSelect(center)}
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
