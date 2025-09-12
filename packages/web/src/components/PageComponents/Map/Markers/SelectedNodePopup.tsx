import { memo } from "react";
import { Popup } from "react-map-gl/maplibre";

export const SelectedNodePopup = memo(function SelectedNodePopup({
  lng,
  lat,
  offset,
  onClose,
  children,
}: {
  lng: number;
  lat: number;
  offset: [number, number];
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
      style={{ left: `${offset[0]}px`, top: `${offset[1] + 22}px` }}
    >
      {children}
    </Popup>
  );
});
