import { FilterControl } from "@components/generic/Filter/FilterControl.tsx";
import {
  type FilterState,
  useFilterNode,
} from "@components/generic/Filter/useFilterNode.ts";
import { BaseMap } from "@components/Map.tsx";
import { NodeMarkers } from "@components/PageComponents/Map/Layers/NodesLayer.tsx";
import {
  generatePrecisionCircles,
  SourcePrecisionCircles,
} from "@components/PageComponents/Map/Layers/PrecisionLayer.tsx";
import {
  generateNeighborLines,
  SNRTooltip,
  type SNRTooltipProps,
  SourceNeighborLines,
} from "@components/PageComponents/Map/Layers/SNRLayer.tsx";
import { Waypoint } from "@components/PageComponents/Map/Layers/WaypointLayer.tsx";
import {
  defaultVisibilityState,
  MapLayerTool,
  type VisibilityState,
} from "@components/PageComponents/Map/MapLayerTool.tsx";
//import { WaypointTool } from "@components/PageComponents/Map/WaypointTool.tsx";
import { PageLayout } from "@components/PageLayout.tsx";
import { Sidebar } from "@components/Sidebar.tsx";
import { useMapFitting } from "@core/hooks/useMapFitting.ts";
import { useDevice, useNodeDB } from "@core/stores";
import { cn } from "@core/utils/cn.ts";
import { toLngLat } from "@core/utils/geo.ts";
import type { Protobuf } from "@meshtastic/core";
import { numberToHexUnpadded } from "@noble/curves/abstract/utils";
import { FunnelIcon } from "lucide-react";
import {
  useCallback,
  useDeferredValue,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { type MapLayerMouseEvent, useMap } from "react-map-gl/maplibre";

const NODEDB_DEBOUNCE_MS = 250;

const MapPage = () => {
  const { t } = useTranslation();
  const { waypoints, getNeighborInfo } = useDevice();
  const { getNode, getMyNode } = useNodeDB();
  const { nodes: validNodes } = useNodeDB(
    (db) => ({
      // only nodes with a position
      nodes: db.getNodes((n): n is Protobuf.Mesh.NodeInfo =>
        Boolean(n.position?.latitudeI),
      ),
      hasNodeError: db.hasNodeError,
      // include the Map reference so error badges update when nodeErrors changes
      _errorsRef: db.nodeErrors,
    }),
    { debounce: NODEDB_DEBOUNCE_MS },
  );
  const { nodeFilter, defaultFilterValues, isFilterDirty } = useFilterNode();
  const { default: map } = useMap();

  const hasFitBoundsOnce = useRef(false);
  const [snrHover, setSnrHover] = useState<SNRTooltipProps>();
  const [expandedCluster, setExpandedCluster] = useState<string | undefined>();
  const [visibilityState, setVisibilityState] = useState<VisibilityState>(
    () => defaultVisibilityState,
  );

  const myNode = useMemo(() => getMyNode(), [getMyNode]);

  // Filters
  const [filterState, setFilterState] = useState<FilterState>(
    () => defaultFilterValues,
  );
  const deferredFilterState = useDeferredValue(filterState);

  const filteredNodes = useMemo(
    () => validNodes.filter((node) => nodeFilter(node, deferredFilterState)),
    [validNodes, deferredFilterState, nodeFilter],
  );
  // Map fitting
  const { fitToNodes } = useMapFitting(map);
  const getMapBounds = useCallback(() => {
    if (hasFitBoundsOnce.current) {
      return;
    }
    fitToNodes(validNodes);
    hasFitBoundsOnce.current = true;
  }, [fitToNodes, validNodes]);

  // SNR lines
  const neighborLinesCollection = useMemo(() => {
    const remotePairs = visibilityState.remoteNeighbors
      ? filteredNodes.flatMap((node) => {
          const neighborInfo = getNeighborInfo(node.num);
          return neighborInfo
            ? [
                {
                  type: "remote" as const,
                  node,
                  neighborInfo: {
                    ...neighborInfo,
                    neighbors: neighborInfo.neighbors.map((n) => {
                      const node = filteredNodes.find(
                        (node) => node.num === n.nodeId,
                      );
                      return { ...n, num: node?.num, position: node?.position };
                    }),
                  },
                } as const,
              ]
            : [];
        })
      : [];

    const directPairs =
      visibilityState.directNeighbors && myNode
        ? filteredNodes
            .filter((node) => node.hopsAway === 0 && node.num !== myNode.num)
            .map((to) => ({
              type: "direct" as const,
              from: myNode,
              to,
              snr: to.snr ?? 0,
            }))
        : [];

    return generateNeighborLines([...remotePairs, ...directPairs]);
  }, [
    visibilityState.remoteNeighbors,
    visibilityState.directNeighbors,
    filteredNodes,
    myNode,
    getNeighborInfo,
  ]);

  // Node markers & clusters
  const onMapBackgroundClick = useCallback(() => {
    setExpandedCluster(undefined);
  }, []);

  const markers = useMemo(
    () => (
      <NodeMarkers
        map={map}
        filteredNodes={filteredNodes}
        myNode={myNode}
        expandedCluster={expandedCluster}
        setExpandedCluster={setExpandedCluster}
      />
    ),
    [filteredNodes, expandedCluster, map, myNode],
  );

  // Precision circles
  const precisionCirclesCollection = useMemo(
    () => generatePrecisionCircles(filteredNodes),
    [filteredNodes],
  );

  const onMouseMove = useCallback(
    (event: MapLayerMouseEvent) => {
      const {
        features,
        point: { x, y },
      } = event;
      const hoveredFeature = features?.[0];

      if (hoveredFeature) {
        const { from, to, snr } = hoveredFeature.properties;

        const fromLong =
          getNode(from)?.user?.longName ??
          t("fallbackName", {
            last4: numberToHexUnpadded(from).slice(-4).toUpperCase(),
          });

        const toLong =
          getNode(to)?.user?.longName ??
          t("fallbackName", {
            last4: numberToHexUnpadded(to).slice(-4).toUpperCase(),
          });

        setSnrHover({ pos: { x, y }, snr, from: fromLong, to: toLong });
      } else {
        setSnrHover(undefined);
      }
    },
    [getNode, t],
  );

  return (
    <PageLayout label="Map" noPadding actions={[]} leftBar={<Sidebar />}>
      <BaseMap
        onLoad={getMapBounds}
        onMouseMove={onMouseMove}
        onClick={onMapBackgroundClick}
        interactiveLayerIds={["neighborLineLayer"]}
      >
        {markers}

        {visibilityState.waypoints &&
          waypoints.map((wp) => {
            const [lng, lat] = toLngLat({
              latitudeI: wp.latitudeI,
              longitudeI: wp.longitudeI,
            });
            return <Waypoint key={wp.id} id={wp.id} lng={lng} lat={lat} />;
          })}

        {snrHover && (
          <SNRTooltip
            pos={snrHover.pos}
            snr={snrHover.snr}
            from={snrHover.from}
            to={snrHover.to}
          />
        )}

        <SourceNeighborLines data={neighborLinesCollection} />

        <SourcePrecisionCircles
          data={precisionCirclesCollection}
          id="precisionCircles-all"
          isVisible={visibilityState.positionPrecision}
        />
      </BaseMap>
      <div className="flex flex-col space-y-1 fixed top-45.5 right-2.5">
        <FilterControl
          filterState={filterState}
          defaultFilterValues={defaultFilterValues}
          setFilterState={setFilterState}
          isDirty={isFilterDirty(filterState)}
          parameters={{
            popoverContentProps: {
              side: "bottom",
              align: "end",
              sideOffset: 7,
            },
            popoverTriggerClassName: cn(
              "w-[29px] px-1 py-1 rounded shadow-l outline-[2px] outline-stone-600/20 ",
              "dark:text-slate-600 dark:hover:text-slate-700 bg-stone-50 hover:bg-stone-200 dark:bg-stone-50 dark:hover:bg-stone-200 dark:active:bg-stone-300",
              isFilterDirty(filterState)
                ? "text-slate-100 dark:text-slate-100 bg-green-600 dark:bg-green-600 hover:bg-green-700 dark:hover:bg-green-700 hover:text-slate-200 dark:hover:text-slate-200 active:bg-green-800 dark:active:bg-green-800 outline-green-600 dark:outline-green-700"
                : "",
            ),
            triggerIcon: <FunnelIcon className="w-[21px]" />,
            showTextSearch: true,
          }}
        />

        <MapLayerTool
          visibilityState={visibilityState}
          setVisibilityState={setVisibilityState}
        />

        {/*<WaypointTool />*/}
      </div>
    </PageLayout>
  );
};

export default MapPage;
