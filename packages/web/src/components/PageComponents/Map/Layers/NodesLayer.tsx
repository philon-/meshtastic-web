import { useMapFitting } from "@app/core/hooks/useMapFitting";
import {
  fanOutOffsetsPx,
  groupNodesByIdenticalCoords,
} from "@components/PageComponents/Map/cluster.ts";
import {
  generatePrecisionCircles,
  SourcePrecisionCircles,
} from "@components/PageComponents/Map/Layers/PrecisionLayer.tsx";
import { NodeMarker } from "@components/PageComponents/Map/Markers/NodeMarker.tsx";
import { SelectedNodePopup } from "@components/PageComponents/Map/Markers/SelectedNodePopup.tsx";
import { StackBadge } from "@components/PageComponents/Map/Markers/StackBadge.tsx";
import { NodeDetail } from "@components/PageComponents/Map/NodeDetail.tsx";
import { useNodeDB } from "@core/stores";
import { hasPos, toLngLat } from "@core/utils/geo.ts";
import type { Protobuf } from "@meshtastic/core";
import { useCallback, useMemo, useState } from "react";
import type { MapRef } from "react-map-gl/maplibre";

export interface NodeMarkerProps {
  map: MapRef | undefined;
  filteredNodes: Protobuf.Mesh.NodeInfo[];
  myNode: Protobuf.Mesh.NodeInfo | undefined;
  expandedCluster: string | undefined;
  setExpandedCluster: (key: string | undefined) => void;
}

export const NodeMarkers = ({
  map,
  filteredNodes,
  myNode,
  expandedCluster,
  setExpandedCluster,
}: NodeMarkerProps): React.ReactNode[] => {
  const { hasNodeError } = useNodeDB();
  const { focusNode } = useMapFitting(map);

  const [selectedNum, setSelectedNum] = useState<number | undefined>();
  const selectedNode = useMemo(
    () =>
      selectedNum === undefined
        ? undefined
        : (filteredNodes.find((node) => node.num === selectedNum) ?? undefined),
    [selectedNum, filteredNodes],
  );

  const onMarkerClick = useCallback(
    (num: number, e: { originalEvent: MouseEvent }) => {
      e.originalEvent?.stopPropagation();
      setSelectedNum(num);
      const node =
        (filteredNodes.find((node) => node.num === num) ?? myNode?.num === num)
          ? myNode
          : undefined;
      console.debug(`Focusing node ${num} at click`, node);
      if (node) {
        focusNode(node);
      }
    },
    [filteredNodes, focusNode, myNode],
  );

  const clusters = groupNodesByIdenticalCoords(filteredNodes);
  const rendered: React.ReactNode[] = [];

  for (const [key, nodes] of clusters) {
    if (!nodes.length || !nodes[0]?.position) {
      continue;
    }
    const [lng, lat] = toLngLat(nodes[0].position);
    const isExpanded = expandedCluster === key;

    // Precompute pixel offsets for expanded state
    const expandedOffsets = isExpanded
      ? fanOutOffsetsPx(nodes.length, key)
      : undefined;

    // Always render all node markers in the cluster
    nodes.forEach((node, i) => {
      const isHead = i === 0;

      rendered.push(
        <NodeMarker
          key={`node-${key}-${node.num}`}
          id={node.num}
          lng={lng}
          lat={lat}
          offset={expandedOffsets?.[i]}
          label={node.user?.shortName?.toString() ?? String(node.num)}
          hasError={hasNodeError(node.num)}
          isFavorite={node.isFavorite ?? false}
          onClick={(num, e) => {
            e.originalEvent?.stopPropagation();
            if (!isExpanded && !isHead) {
              // collapsed: tapping a buried marker expands the stack first
              setExpandedCluster(key);
              return;
            }
            onMarkerClick(num, e);
          }}
        />,
      );
    });

    if (nodes.length > 1 && !isExpanded) {
      rendered.push(
        <StackBadge
          key={`stack-badge-${key}`}
          lng={lng}
          lat={lat}
          count={nodes.length - 1}
          onClick={(e) => {
            e.originalEvent?.stopPropagation();
            setExpandedCluster(key);
          }}
        />,
      );
    }
  }

  if (selectedNode) {
    rendered.push(
      <SourcePrecisionCircles
        data={generatePrecisionCircles([selectedNode])}
        id="precisionCircles-selected"
        isVisible={true}
      />,
    );

    const [lng, lat] = toLngLat(selectedNode.position);

    rendered.push(
      <SelectedNodePopup
        lng={lng}
        lat={lat}
        onClose={() => setSelectedNum(undefined)}
      >
        <NodeDetail node={selectedNode} />
      </SelectedNodePopup>,
    );
  }

  if (myNode && hasPos(myNode.position)) {
    const [lng, lat] = toLngLat(myNode.position);
    rendered.push(
      <NodeMarker
        key={`node-${myNode.num}`}
        id={myNode.num}
        lng={lng}
        lat={lat}
        label={myNode.user?.shortName?.toString() ?? String(myNode.num)}
        hasError={false}
        isFavorite={true}
        onClick={onMarkerClick}
      />,
    );
  }

  return rendered;
};
