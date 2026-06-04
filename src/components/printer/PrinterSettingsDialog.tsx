// Wrapper fino — todo o fluxo guiado vive em QzPrinterWizard.
import { QzPrinterWizard } from "./QzPrinterWizard";

interface PrinterSettingsDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function PrinterSettingsDialog({ open, onOpenChange }: PrinterSettingsDialogProps) {
  return <QzPrinterWizard open={open} onOpenChange={onOpenChange} />;
}
