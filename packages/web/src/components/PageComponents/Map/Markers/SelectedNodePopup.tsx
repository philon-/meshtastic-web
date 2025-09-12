import { memo } from "react";
import { Popup } from "react-map-gl/maplibre";

export const SelectedNodePopup = memo(function SelectedNodePopup({
  lng,
  lat,
  onClose,
  children,
}: {
  lng: number;
  lat: number;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Popup
      anchor="top"
      longitude={lng}
      latitude={lat}
      onClose={onClose}
      className="w-full"
      style={{ top: "2em" }}
    >
      {children}
    </Popup>
  );
});
