import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@components/UI/Popover.tsx";
import { cn } from "@core/utils/cn.ts";
import { MapPinIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

export function WaypointTool(): ReactNode {
  const { t } = useTranslation("map");

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "rounded align-center",
            "w-[29px] px-1 py-1 shadow-l outline-[2px] outline-stone-600/20",
            "bg-stone-50 hover:bg-stone-200 dark:bg-stone-50 dark:hover:bg-stone-200 dark:active:bg-stone-300",
            "text-slate-600 hover:text-slate-700 active:bg-slate-300",
            "dark:text-slate-600 hover:dark:text-slate-700",
          )}
          aria-label={t("filter.label")}
        >
          <MapPinIcon className="w-[21px]" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className={cn("dark:text-slate-300 flex flex-col space-y-2 py-4")}
        side={"bottom"}
        align="end"
        sideOffset={7}
      >
        TODO: Implement Map Waypoint Tool
      </PopoverContent>
    </Popover>
  );
}
