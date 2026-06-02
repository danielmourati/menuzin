import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Printer, X } from "lucide-react";
import type { Order } from "@/lib/domain-types";
import { PrintableOrder } from "./PrintableOrder";
import { createPortal } from "react-dom";

interface PrintOrderButtonProps {
  order: Order;
  storeName?: string;
  storePhone?: string;
  storeAddress?: string;
  paperWidth?: "55mm" | "80mm";
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "outline" | "secondary" | "ghost";
  className?: string;
}

export function PrintOrderButton({
  order,
  storeName,
  storePhone,
  storeAddress,
  paperWidth = "55mm",
  size = "default",
  variant = "outline",
  className = "",
}: PrintOrderButtonProps) {
  const [open, setOpen] = useState(false);
  const [printing, setPrinting] = useState(false);
  // Force 58mm preview regardless of selected paperWidth, so admin sees exact
  // alignment that will hit a thermal 58mm printer.
  const previewWidth: "55mm" | "80mm" = paperWidth === "80mm" ? "80mm" : "55mm";

  const handlePrint = () => {
    setPrinting(true);
    document.body.classList.add("printing-receipt");
    setTimeout(() => {
      window.print();
      document.body.classList.remove("printing-receipt");
      setPrinting(false);
      setOpen(false);
    }, 200);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant={variant}
            size={size}
            className={className}
            title="Imprimir pedido"
          >
            <Printer className={size === "icon" ? "h-3.5 w-3.5" : "mr-2 h-4 w-4"} />
            {size !== "icon" && "Imprimir"}
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-md p-0 gap-0">
          <DialogHeader className="px-4 pt-4 pb-2">
            <DialogTitle className="text-base">
              Prévia do cupom · {previewWidth === "55mm" ? "58mm" : "80mm"}
            </DialogTitle>
          </DialogHeader>

          <div className="bg-muted/40 px-2 py-3 max-h-[60vh] overflow-auto flex justify-center">
            <div className="shadow-md ring-1 ring-border rounded-sm">
              <PrintableOrder
                order={order}
                storeName={storeName}
                storePhone={storePhone}
                storeAddress={storeAddress}
                paperWidth={previewWidth === "55mm" ? "58mm" : "80mm"}
              />
            </div>
          </div>

          <DialogFooter className="px-4 py-3 border-t flex-row justify-end gap-2 sm:gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              <X className="mr-1.5 h-4 w-4" /> Fechar
            </Button>
            <Button size="sm" onClick={handlePrint} disabled={printing}>
              <Printer className="mr-1.5 h-4 w-4" />
              {printing ? "Imprimindo..." : "Imprimir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {printing &&
        createPortal(
          <div id="print-root" className="print-area">
            <PrintableOrder
              order={order}
              storeName={storeName}
              storePhone={storePhone}
              storeAddress={storeAddress}
              paperWidth={previewWidth === "55mm" ? "58mm" : "80mm"}
            />
          </div>,
          document.body,
        )}
    </>
  );
}
