import { brl, formatDateTime } from "@/lib/format";
import type { Order } from "@/lib/domain-types";
import { parseAddonLabel } from "@/lib/product-selection";

interface PrintableOrderProps {
  order: Order;
  storeName?: string;
  storePhone?: string;
  storeAddress?: string;
  /** Largura do papel térmico. Padrão: "80mm". */
  paperWidth?: "55mm" | "80mm";
}

export function PrintableOrder({
  order,
  storeName = "Burger Prime",
  storePhone = "(86) 99999-9999",
  storeAddress = "Av. Beira Rio, 123 — Centro, Parnaíba/PI",
  paperWidth = "80mm",
}: PrintableOrderProps) {
  const isNarrow = paperWidth === "55mm";
  const fontBase = isNarrow ? "text-[10px]" : "text-[12px]";
  const fontSmall = isNarrow ? "text-[8px]" : "text-[10px]";
  const fontTitle = isNarrow ? "text-[12px]" : "text-sm";
  const pad = isNarrow ? "p-2" : "p-4";
  // Hint para impressão: tamanho do papel via @page no head do iframe/print, mas
  // também restringimos a largura visual do recibo para preview e impressão direta.
  const widthPx = isNarrow ? "max-w-[55mm]" : "max-w-[80mm]";

  return (
    <div className={`printable-order-receipt mx-auto w-full ${widthPx} ${fontBase} font-mono leading-tight text-black ${pad} bg-white select-none`}>
      <style>{`@media print { @page { size: ${paperWidth} auto; margin: 2mm; } }`}</style>

      {/* Cabeçalho do estabelecimento */}
      <div className="text-center space-y-1 mb-3 border-b border-dashed border-black pb-2">
        <h2 className={`${fontTitle} font-bold uppercase`}>{storeName}</h2>
        <p className={`${fontSmall} text-zinc-700`}>{storeAddress}</p>
        <p className={`${fontSmall} text-zinc-700`}>WhatsApp: {storePhone}</p>
      </div>

      {/* Dados do Pedido */}
      <div className="space-y-1 mb-3 border-b border-dashed border-black pb-2">
        <div className="flex justify-between font-bold">
          <span>PEDIDO: #{order.number}</span>
          <span className="uppercase">
            {order.mode === "consumo_local"
              ? "MESA"
              : order.mode === "retirada"
              ? "RETIRADA"
              : "ENTREGA"}
          </span>
        </div>
        <div>DATA: {formatDateTime(order.createdAt)}</div>
        <div>CLIENTE: {order.customerName}</div>
        <div>FONE: {order.whatsapp}</div>

        {order.mode === "entrega" && order.address && (
          <div className="mt-1">
            <span className="font-bold">ENTREGAR EM:</span>
            <p>
              {order.address.street}, {order.address.number}
              {order.address.complement ? ` - ${order.address.complement}` : ""}
            </p>
            <p>{order.address.neighborhood}</p>
            {order.address.reference && (
              <p className={`${fontSmall} text-zinc-700`}>Ref: {order.address.reference}</p>
            )}
          </div>
        )}

        {order.mode === "consumo_local" && order.table && (
          <div className="mt-1 font-bold">LOCAL: {order.table}</div>
        )}

        {order.mode === "retirada" && order.pickupTime && (
          <div className="mt-1">HORÁRIO RETIRADA: {order.pickupTime}</div>
        )}
      </div>

      {/* Itens */}
      <div className="mb-3 border-b border-dashed border-black pb-2">
        <div className="flex justify-between font-bold border-b border-dashed border-black pb-1 mb-1">
          <span>ITEM</span>
          <span>VALOR</span>
        </div>
        <div className="space-y-2">
          {order.items.map((item, idx) => (
            <div key={idx}>
              <div className="flex justify-between items-start">
                <span className="flex-1 pr-2">{item.qty}x {item.name}</span>
                <span className="shrink-0">{brl(item.unitPrice * item.qty)}</span>
              </div>
              {item.addons && item.addons.length > 0 && (
                <div className={`${fontSmall} pl-3 text-zinc-700 space-y-0.5`}>
                  {item.addons.map((addon) => (
                    <div key={addon.id} className="flex justify-between">
                      <span>+ {addon.name}</span>
                      <span>{brl(addon.price)}</span>
                    </div>
                  ))}
                </div>
              )}
              {item.note && (
                <p className={`${fontSmall} pl-3 text-zinc-700 italic`}>Obs: {item.note}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Observações */}
      {order.note && (
        <div className="mb-3 border-b border-dashed border-black pb-2">
          <span className="font-bold">OBSERVAÇÃO GERAL:</span>
          <p className="italic">{order.note}</p>
        </div>
      )}

      {/* Totais */}
      <div className="space-y-1 mb-3 border-b border-dashed border-black pb-2">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>{brl(order.subtotal)}</span>
        </div>
        {order.deliveryFee > 0 && (
          <div className="flex justify-between">
            <span>Taxa de Entrega:</span>
            <span>{brl(order.deliveryFee)}</span>
          </div>
        )}
        <div className={`flex justify-between font-bold ${fontTitle} border-t border-dotted border-black pt-1`}>
          <span>TOTAL:</span>
          <span>{brl(order.total)}</span>
        </div>
      </div>

      {/* Pagamento */}
      <div className="space-y-1 border-b border-dashed border-black pb-2 mb-3">
        <div>PAGAMENTO: <span className="font-bold uppercase">{order.payment}</span></div>
        <div>
          STATUS:{" "}
          <span className="font-bold uppercase">
            {order.paymentStatus === "approved"
              ? "PAGO / APROVADO"
              : order.paymentStatus === "pending"
              ? "PENDENTE"
              : order.paymentStatus === "manual"
              ? "PAGAR NA ENTREGA"
              : "NÃO PAGO"}
          </span>
        </div>
        {order.changeFor && (
          <div>TROCO PARA: <span className="font-bold">{brl(order.changeFor)}</span></div>
        )}
      </div>

      {/* Rodapé */}
      <div className={`text-center ${fontSmall} text-zinc-700 mt-2 space-y-1`}>
        <p>Agradecemos a preferência!</p>
        <p>Desenvolvido por Menuzin</p>
      </div>
    </div>
  );
}
