import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import type { Order } from "@/lib/mock-data";
import { PrintableOrder } from "./PrintableOrder";
import { createPortal } from "react-dom";

interface PrintOrderButtonProps {
  order: Order;
  storeName?: string;
  storePhone?: string;
  storeAddress?: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "outline" | "secondary";
  className?: string;
}

export function PrintOrderButton({
  order,
  storeName,
  storePhone,
  storeAddress,
  size = "default",
  variant = "outline",
  className = "",
}: PrintOrderButtonProps) {
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = () => {
    setIsPrinting(true);
    document.body.classList.add("printing-receipt");
    
    // Aguarda o React renderizar o portal, então dispara a impressão
    setTimeout(() => {
      window.print();
      document.body.classList.remove("printing-receipt");
      setIsPrinting(false);
    }, 150);
  };

  return (
    <>
      <Button
        onClick={handlePrint}
        variant={variant}
        size={size}
        className={className}
        title="Imprimir pedido"
      >
        <Printer className={size === "icon" ? "h-3.5 w-3.5" : "mr-2 h-4 w-4"} />
        {size !== "icon" && "Imprimir"}
      </Button>

      {isPrinting &&
        createPortal(
          <div id="print-root" className="print-area">
            <PrintableOrder
              order={order}
              storeName={storeName}
              storePhone={storePhone}
              storeAddress={storeAddress}
            />
          </div>,
          document.body
        )}
    </>
  );
}
