import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { MonitorSmartphone, Printer, RefreshCw, Trash2, Bluetooth, Play, Link2, Unlink } from "lucide-react";
import { webBluetoothPrinter, generateTestReceipt } from "@/lib/bluetooth-printer";
import { usePrintQueue } from "@/hooks/usePrintQueue";
import { useQueryClient } from "@tanstack/react-query";
// Assumindo que você possa ter uma API/query real para fila no futuro.

export function DevicePrinterConfig() {
  const queryClient = useQueryClient();
  
  const [usePrinterHere, setUsePrinterHere] = useState(true);
  const [printForOthers, setPrintForOthers] = useState(false);
  const [useBluetooth, setUseBluetooth] = useState(false);
  
  const [btConnected, setBtConnected] = useState(webBluetoothPrinter.isConnected());
  const [btDeviceName, setBtDeviceName] = useState(webBluetoothPrinter.getDeviceName() || "Nenhum pareado");
  const [isPairing, setIsPairing] = useState(false);

  const { queueCount, clearJobs, isLoading } = usePrintQueue(printForOthers, "", useBluetooth);

  const handlePairBluetooth = async () => {
    setIsPairing(true);
    try {
      const device = await webBluetoothPrinter.requestDevice();
      await webBluetoothPrinter.connect();
      setBtConnected(true);
      setBtDeviceName(device.name || "Impressora Bluetooth");
      toast.success(`Conectado à ${device.name || "Impressora Bluetooth"}`);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsPairing(false);
    }
  };

  const handleTestBluetooth = async () => {
    if (!btConnected) {
      toast.error("Impressora Bluetooth não está conectada.");
      return;
    }
    try {
      const data = generateTestReceipt();
      await webBluetoothPrinter.print(data);
      toast.success("Teste enviado via Bluetooth!");
    } catch (error) {
      toast.error("Falha ao imprimir teste: " + (error as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 border-b pb-3">
        <div>
          <h3 className="text-base font-semibold">Configurações deste Aparelho</h3>
          <p className="text-xs text-muted-foreground">
            Ajustes locais apenas para este navegador/dispositivo.
          </p>
        </div>
      </div>

      {/* Card 1: Usar impressora neste dispositivo */}
      <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-start gap-3">
            <Printer className="mt-1 h-5 w-5 text-primary" />
            <div className="space-y-1">
              <Label className="text-sm font-semibold uppercase tracking-wider text-primary">
                USAR IMPRESSORA NESTE DISPOSITIVO
              </Label>
              <p className="text-xs text-muted-foreground">
                Impressão ativada neste aparelho. O preview automático do navegador ou impressora pareada será acionado ao enviar pedidos.
              </p>
            </div>
          </div>
          <Switch checked={usePrinterHere} onCheckedChange={setUsePrinterHere} />
        </div>
      </div>

      {/* Card 2: Imprime para os outros & Fila */}
      <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3">
            <MonitorSmartphone className="mt-1 h-5 w-5 text-muted-foreground" />
            <div className="space-y-1">
              <Label className="text-sm font-medium">
                Este aparelho imprime para os outros (Caixa)
              </Label>
              <p className="text-xs text-muted-foreground max-w-lg">
                Ligue esta chave no aparelho que fica com a impressora. Os outros aparelhos deixam de precisar de Bluetooth e passam a enviar os cupons para cá.
              </p>
            </div>
          </div>
          <Switch checked={printForOthers} onCheckedChange={setPrintForOthers} />
        </div>

        <div className="pt-4 border-t border-border">
          <div className="flex items-center justify-between mb-3">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              FILA DE IMPRESSÃO
            </Label>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 text-xs gap-1"
                onClick={() => queryClient.invalidateQueries({ queryKey: ["print-jobs"] })}
                disabled={isLoading}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Atualizar
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 text-xs gap-1 text-destructive hover:bg-destructive/10"
                onClick={clearJobs}
              >
                <Trash2 className="h-3.5 w-3.5" /> Limpar impressos
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground py-2">
            {queueCount === 0 ? "Nenhum cupom na fila." : `${queueCount} cupons pendentes.`}
          </p>
        </div>
      </div>

      {/* Card 3: Bluetooth */}
      <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
        <div className="p-4 flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-2">
            <Bluetooth className="h-5 w-5 text-primary" />
            <Label className="text-sm font-semibold uppercase tracking-wider text-primary">
              CONEXÃO IMPRESSORA BLUETOOTH (DISPOSITIVO LOCAL)
            </Label>
          </div>
          <div className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase ${btConnected ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"}`}>
            {btConnected ? "Conectado" : "Desconectado"}
          </div>
        </div>
        
        <div className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-sm">
              <span className="text-muted-foreground">Dispositivo Pareado:</span>{" "}
              <span className="font-semibold">{btDeviceName}</span>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={handlePairBluetooth} 
                disabled={isPairing}
                size="sm" 
                variant={btConnected ? "outline" : "default"}
                className={!btConnected ? "bg-primary text-primary-foreground" : ""}
              >
                {isPairing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Link2 className="mr-2 h-4 w-4" />}
                Parear / Buscar
              </Button>
              <Button 
                onClick={handlePairBluetooth}
                disabled={!btDeviceName || isPairing || btConnected}
                variant="outline" 
                size="sm"
              >
                <RefreshCw className="mr-2 h-4 w-4" /> Reconectar
              </Button>
              <Button 
                onClick={handleTestBluetooth}
                disabled={!btConnected}
                variant="outline" 
                size="sm" 
                className="bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-950/20 dark:hover:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800/30"
              >
                <Printer className="mr-2 h-4 w-4" /> Teste de Impressão
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <Label className="text-sm font-medium">
              Usar Bluetooth como Padrão Local neste Aparelho
            </Label>
            <Switch checked={useBluetooth} onCheckedChange={setUseBluetooth} />
          </div>
        </div>
      </div>

    </div>
  );
}
