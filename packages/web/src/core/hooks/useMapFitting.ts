import { boundsFromLngLat, toLngLat } from "@core/utils/geo";
import type { Protobuf } from "@meshtastic/core";
import { useCallback } from "react";
import type { MapRef } from "react-map-gl/maplibre";

export function useMapFitting(map: MapRef | undefined) {
  const focusNode = useCallback(
    (node: Protobuf.Mesh.NodeInfo) => {
      if (!map) {
        return;
      }
      const [lng, lat] = toLngLat(node.position);
      map.easeTo({
        center: [lng, lat],
        zoom: map.getZoom(),
      });
    },
    [map],
  );

  const fitToNodes = useCallback(
    (nodes: Protobuf.Mesh.NodeInfo[]) => {
      if (!map || nodes.length === 0) {
        return;
      }

      if (nodes.length === 1 && nodes[0]) {
        return focusNode(nodes[0]);
      }

      // Build [lng, lat] coords, then let boundsFromLngLat do the turf dance
      const coords = nodes.map((n) => toLngLat(n.position));
      const bounds = boundsFromLngLat(coords);
      if (!bounds) {
        return;
      }

      const center = map.cameraForBounds(bounds, {
        padding: { top: 10, bottom: 10, left: 10, right: 10 },
      });

      if (center) {
        map.easeTo(center);
      }
    },
    [map, focusNode],
  );

  return { focusNode, fitToNodes };
}
