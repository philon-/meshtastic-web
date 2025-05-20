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
import { type ChangeEvent, useCallback } from "react";

export interface ImportExportConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ImportExportConfigDialog = ({
  open,
  onOpenChange,
}: ImportExportConfigDialogProps) => {
  const { getYAMLConfig, setYAMLConfig } = useImportExportConfig();
  const { getMyNode } = useDevice();

  const myNode = getMyNode();
  const YAMLString = getYAMLConfig();

  const createDownloadYAML = useCallback(() => {
    if (!YAMLString) return;

    const blob = new Blob([YAMLString], { type: "application/x-yaml" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `node-${myNode.num}.yml`;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [YAMLString, myNode]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    if (!file.name.match(/\.(ya?ml)$/i)) {
      console.error("Please select a .yaml or .yml file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const yamlString = reader.result as string;
      // now hand it off to your import hook
      setYAMLConfig({ yamlString });
    };
    reader.onerror = () => {
      console.log("Failed to read file.");
    };
    reader.readAsText(file);
  };

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
          <label>
            Import configuration:
            <input
              type="file"
              accept=".yaml,.yml"
              onChange={handleFileChange}
              style={{ display: "block", marginTop: 8 }}
            />
          </label>
        </div>

        <DialogFooter>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
