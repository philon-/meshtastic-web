import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@components/UI/Dialog.tsx";
import { useImportExportConfig } from "@core/hooks/useImportExportConfig.ts";
import { useDevice } from "@core/stores/deviceStore.ts";
import { Button } from "@components/UI/Button.tsx";
import { DownloadIcon } from "lucide-react";
import { useCallback } from "react";

export interface ImportExportConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ImportExportConfigDialog = ({
  open,
  onOpenChange,
}: ImportExportConfigDialogProps) => {
  const { getYAMLConfig } = useImportExportConfig();
  const { getMyNode, config, moduleConfig } = useDevice();

  const myNode = getMyNode();
  const YAMLString = getYAMLConfig({ node: getMyNode(), config, moduleConfig });

  const createDownloadYAML = useCallback(() => {
    if (!YAMLString) return;

    const blob = new Blob([YAMLString], { type: "application/x-yaml" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `node-${myNode.num}.yaml`;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [YAMLString, myNode]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogClose />
        <DialogHeader>
          <DialogTitle>Import or export device config</DialogTitle>
          <DialogDescription>
            Export or import the current device config as a YAML document.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Button
            variant="default"
            onClick={() => createDownloadYAML()}
            className=""
          >
            <DownloadIcon size={20} className="mr-2" />
            Download
          </Button>
        </div>
        <DialogFooter>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
