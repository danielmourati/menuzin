import { PrinterConfigModal } from "./PrinterConfigModal";

interface PrinterSettingsDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function PrinterSettingsDialog({ open, onOpenChange }: PrinterSettingsDialogProps) {
  return <PrinterConfigModal open={open} onOpenChange={onOpenChange} />;
}

