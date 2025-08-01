import { DeviceImage } from "@components/generic/DeviceImage.tsx";
import { TimeAgo } from "@components/generic/TimeAgo.tsx";
import { Uptime } from "@components/generic/Uptime.tsx";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@components/UI/Accordion.tsx";
import { Button } from "@components/UI/Button.tsx";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@components/UI/Dialog.tsx";
import { Separator } from "@components/UI/Seperator.tsx";
import {
  Tooltip,
  TooltipArrow,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@components/UI/Tooltip.tsx";
import { useFavoriteNode } from "@core/hooks/useFavoriteNode.ts";
import { useIgnoreNode } from "@core/hooks/useIgnoreNode.ts";
import { toast } from "@core/hooks/useToast.ts";
import { useAppStore } from "@core/stores/appStore.ts";
import { useDevice } from "@core/stores/deviceStore.ts";
import { cn } from "@core/utils/cn.ts";
import { Protobuf } from "@meshtastic/core";
import { numberToHexUnpadded } from "@noble/curves/abstract/utils";
import { useNavigate } from "@tanstack/react-router";
import {
  BellIcon,
  BellOffIcon,
  MapPinnedIcon,
  MessageSquareIcon,
  StarIcon,
  TrashIcon,
  WaypointsIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export interface NodeDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NodeDetailsDialog = ({
  open,
  onOpenChange,
}: NodeDetailsDialogProps) => {
  const { t } = useTranslation("dialog");
  const { setDialogOpen, connection, getNode } = useDevice();
  const navigate = useNavigate();
  const { setNodeNumToBeRemoved, nodeNumDetails } = useAppStore();
  const { updateFavorite } = useFavoriteNode();
  const { updateIgnored } = useIgnoreNode();

  const node = getNode(nodeNumDetails);

  const [isFavoriteState, setIsFavoriteState] = useState<boolean>(
    node?.isFavorite ?? false,
  );
  const [isIgnoredState, setIsIgnoredState] = useState<boolean>(
    node?.isIgnored ?? false,
  );

  useEffect(() => {
    if (!node) {
      return;
    }
    setIsFavoriteState(node?.isFavorite);
    setIsIgnoredState(node?.isIgnored);
  }, [node]);

  if (!node) {
    return;
  }

  function handleDirectMessage() {
    if (!node) {
      return;
    }
    navigate({ to: `/messages/direct/${node.num}` });
    setDialogOpen("nodeDetails", false);
  }

  function handleRequestPosition() {
    if (!node) {
      return;
    }

    toast({
      title: t("toast.requestingPosition.title", { ns: "ui" }),
    });
    connection?.requestPosition(node.num).then(() =>
      toast({
        title: t("toast.positionRequestSent.title", { ns: "ui" }),
      }),
    );
    onOpenChange(false);
  }

  function handleTraceroute() {
    if (!node) {
      return;
    }

    toast({
      title: t("toast.sendingTraceroute.title", { ns: "ui" }),
    });
    connection?.traceRoute(node.num).then(() =>
      toast({
        title: t("toast.tracerouteSent.title", { ns: "ui" }),
      }),
    );
    onOpenChange(false);
  }

  function handleNodeRemove() {
    if (!node) {
      return;
    }

    setNodeNumToBeRemoved(node?.num);
    setDialogOpen("nodeRemoval", true);
    onOpenChange(false);
  }

  function handleToggleFavorite() {
    if (!node) {
      return;
    }

    updateFavorite({ nodeNum: node.num, isFavorite: !isFavoriteState });
    setIsFavoriteState(!isFavoriteState);
  }

  function handleToggleIgnored() {
    if (!node) {
      return;
    }

    updateIgnored({ nodeNum: node.num, isIgnored: !isIgnoredState });
    setIsIgnoredState(!isIgnoredState);
  }

  const deviceMetricsMap = [
    {
      key: "airUtilTx",
      label: t("nodeDetails.airTxUtilization"),
      value: node.deviceMetrics?.airUtilTx,
      format: (val: number) => `${val.toFixed(2)}%`,
    },
    {
      key: "channelUtilization",
      label: t("nodeDetails.channelUtilization"),
      value: node.deviceMetrics?.channelUtilization,
      format: (val: number) => `${val.toFixed(2)}%`,
    },
    {
      key: "batteryLevel",
      label: t("nodeDetails.batteryLevel"),
      value: node.deviceMetrics?.batteryLevel,
      format: (val: number) => `${val.toFixed(2)}%`,
    },
    {
      key: "voltage",
      label: t("nodeDetails.voltage"),
      value: node.deviceMetrics?.voltage,
      format: (val: number) => `${val.toFixed(2)}V`,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogClose />
        <DialogHeader>
          <DialogTitle>
            {t("nodeDetails.title", {
              interpolation: { escapeValue: false },
              identifier: `${node.user?.longName ?? t("unknown.shortName")} (${
                node.user?.shortName ?? t("unknown.shortName")
              })`,
            })}
          </DialogTitle>
        </DialogHeader>
        <DialogFooter>
          <div className="w-full">
            <div className="flex flex-row flex-wrap space-y-1">
              <Button
                className="mr-1"
                name="message"
                onClick={handleDirectMessage}
              >
                <MessageSquareIcon className="mr-2" />
                {t("nodeDetails.message")}
              </Button>
              <Button
                className="mr-1"
                name="traceRoute"
                onClick={handleTraceroute}
              >
                <WaypointsIcon className="mr-2" />
                {t("nodeDetails.traceRoute")}
              </Button>
              <Button className="mr-1" onClick={handleToggleFavorite}>
                <StarIcon
                  className={cn(
                    isFavoriteState ? " fill-yellow-400 stroke-yellow-400" : "",
                  )}
                />
              </Button>
              <div className="flex flex-1 justify-start" />

              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      className={cn(
                        "flex justify-end mr-1 text-white",
                        isIgnoredState
                          ? "bg-red-500 dark:bg-red-500 hover:bg-red-600 hover:dark:bg-red-600 text-white dark:text-white"
                          : "",
                      )}
                      onClick={handleToggleIgnored}
                    >
                      {isIgnoredState ? <BellIcon /> : <BellOffIcon />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-slate-800 dark:bg-slate-600 text-white px-4 py-1 rounded text-xs">
                    {isIgnoredState
                      ? t("nodeDetails.unignoreNode")
                      : t("nodeDetails.ignoreNode")}
                    <TooltipArrow className="fill-slate-800 dark:fill-slate-600" />
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="destructive"
                      className="flex justify-end"
                      onClick={handleNodeRemove}
                    >
                      <TrashIcon />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-slate-800 dark:bg-slate-600 text-white px-4 py-1 rounded text-xs">
                    {t("nodeDetails.removeNode")}
                    <TooltipArrow className="fill-slate-800 dark:fill-slate-600" />
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <Separator className="mt-5 mb-2" />

            <div className="flex flex-col flex-wrap space-x-1 space-y-1">
              <div className="flex flex-row space-x-2">
                <div className="w-full bg-slate-100 text-slate-900 dark:text-slate-100 dark:bg-slate-800 p-3  rounded-lg">
                  <p className="text-lg font-semibold">
                    {t("nodeDetails.details")}
                  </p>
                  <p>
                    {t("nodeDetails.nodeNumber")}
                    {node.num}
                  </p>
                  <p>
                    {t("nodeDetails.nodeHexPrefix")}
                    {numberToHexUnpadded(node.num)}
                  </p>
                  <p>
                    {t("nodeDetails.role")}
                    {Protobuf.Config.Config_DeviceConfig_Role[
                      node.user?.role ?? 0
                    ].replace(/_/g, " ")}
                  </p>
                  <p>
                    {t("nodeDetails.lastHeard")}
                    {node.lastHeard === 0 ? (
                      t("nodesTable.lastHeardStatus.never", { ns: "nodes" })
                    ) : (
                      <TimeAgo timestamp={node.lastHeard * 1000} />
                    )}
                  </p>
                  <p>
                    {t("nodeDetails.hardware")}
                    {(
                      Protobuf.Mesh.HardwareModel[node.user?.hwModel ?? 0] ??
                      t("unknown.shortName")
                    ).replace(/_/g, " ")}
                  </p>
                </div>
                <DeviceImage
                  className="h-45 w-45 p-2 rounded-lg border-4 border-slate-200 dark:border-slate-800"
                  deviceType={
                    Protobuf.Mesh.HardwareModel[node.user?.hwModel ?? 0]
                  }
                />
              </div>
            </div>

            <div>
              <div className="text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 p-3 rounded-lg mt-3">
                <p className="text-lg font-semibold">
                  {t("nodeDetails.position")}
                </p>

                {node.position ? (
                  <>
                    {node.position.latitudeI && node.position.longitudeI && (
                      <p>
                        {t("locationResponse.coordinates")}
                        <a
                          className="text-blue-500 dark:text-blue-400"
                          href={`https://www.openstreetmap.org/?mlat=${
                            node.position.latitudeI / 1e7
                          }&mlon=${node.position.longitudeI / 1e7}&layers=N`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {node.position.latitudeI / 1e7},{" "}
                          {node.position.longitudeI / 1e7}
                        </a>
                      </p>
                    )}
                    {node.position.altitude && (
                      <p>
                        {t("locationResponse.altitude")}
                        {node.position.altitude}
                        {t("unit.meter.one")}
                      </p>
                    )}
                  </>
                ) : (
                  <p>{t("unknown.shortName")}</p>
                )}
                <Button
                  onClick={handleRequestPosition}
                  name="requestPosition"
                  className="mt-2"
                >
                  <MapPinnedIcon className="mr-2" />
                  {t("nodeDetails.requestPosition")}
                </Button>
              </div>

              {node.deviceMetrics && (
                <div className="text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 p-3 rounded-lg mt-3">
                  <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {t("nodeDetails.deviceMetrics")}
                  </p>
                  {deviceMetricsMap
                    .filter((metric) => metric.value !== undefined)
                    .map((metric) => (
                      <p key={metric.key}>
                        {metric.label}: {metric.format(metric?.value ?? 0)}
                      </p>
                    ))}
                  {node.deviceMetrics.uptimeSeconds && (
                    <p>
                      {t("nodeDetails.uptime")}
                      <Uptime seconds={node.deviceMetrics.uptimeSeconds} />
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="text-slate-900 dark:text-slate-100 w-full max-w-[464px] bg-slate-100 dark:bg-slate-800 p-3 rounded-lg mt-3">
              <Accordion className="AccordionRoot" type="single" collapsible>
                <AccordionItem className="AccordionItem" value="item-1">
                  <AccordionTrigger>
                    <p className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                      {t("nodeDetails.allRawMetrics")}
                    </p>
                  </AccordionTrigger>
                  <AccordionContent className="overflow-x-scroll">
                    <pre className="text-xs w-full">
                      {JSON.stringify(node, null, 2)}
                    </pre>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
