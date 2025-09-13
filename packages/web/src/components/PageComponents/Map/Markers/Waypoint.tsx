import { MapPinIcon } from "lucide-react";
import { memo } from "react";
import { Marker } from "react-map-gl/maplibre";

export const Waypoint = memo(function NodeMarker({
  id,
  lng,
  lat,
  //Click,
}: {
  id: number;
  lng: number;
  lat: number;
  //Click: (id: number, e: { originalEvent: MouseEvent }) => void;
}) {
  return (
    <Marker key={id} longitude={lng} latitude={lat} anchor="bottom">
      <div>
        <MapPinIcon fill="blue" />
      </div>
    </Marker>
  );
});
