import { Avatar } from "@components/UI/Avatar.tsx";
import { memo } from "react";
import { Marker } from "react-map-gl/maplibre";

export const NodeMarker = memo(function NodeMarker({
  id,
  lng,
  lat,
  label,
  hasError,
  isFavorite,
  offset,
  onClick,
}: {
  id: number;
  lng: number;
  lat: number;
  label: string;
  hasError: boolean;
  isFavorite: boolean;
  offset?: [number, number];
  onClick: (id: number, e: { originalEvent: MouseEvent }) => void;
}) {
  const [dx, dy] = offset ?? [0, 0];

  // CSS variables typed for TS:
  const style = {
    "--dx": `${dx}px`,
    "--dy": `${dy}px`,
    pointerEvents: "auto",
  } as React.CSSProperties;

  return (
    <Marker
      longitude={lng}
      latitude={lat}
      anchor="bottom"
      style={{ top: "20px", pointerEvents: "none" }}
    >
      <button
        type="button"
        className="will-change-transform cursor-pointer animate-fan-out"
        style={style}
        onClick={(e) => onClick(id, { originalEvent: e.nativeEvent })}
      >
        <Avatar
          text={label}
          className="border-[1.5px] border-slate-600 shadow-m shadow-slate-600"
          showError={hasError}
          showFavorite={isFavorite}
        />
      </button>
    </Marker>
  );
});
