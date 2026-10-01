// @ts-nocheck -- Web Bluetooth API types not bundled
export class WebBluetoothPrinter {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;

  async requestDevice(): Promise<BluetoothDevice> {
    const support = getBluetoothSupport();
    if (!support.ok) throw new Error(support.reason);

    const SERVICES = [
      '000018f0-0000-1000-8000-00805f9b34fb',
      '0000e781-0000-1000-8000-00805f9b34fb',
      'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
      '49535343-fe7d-4ae5-8fa9-9fafd205e455',
      '0000ff00-0000-1000-8000-00805f9b34fb',
    ];
    const isCancel = (m: string) => /cancel|NotFoundError|User/i.test(m);
    const errMsg = (e: any) => (typeof e === 'number' || typeof e === 'string') ? String(e) : (e?.message || e?.name || String(e));

    // O Bluefy (iPhone/iPad) rejeita com código numérico quando não consegue
    // interpretar as opções. Tentamos do formato mais completo ao mais simples.
    const attempts: any[] = [
      { acceptAllDevices: true, optionalServices: SERVICES },
      { acceptAllDevices: true, optionalServices: [0x18f0, 0xff00, 0xe781] },
      { acceptAllDevices: true },
      { filters: [{ services: [0x18f0] }, { services: [0xff00] }, { namePrefix: 'MPT' }, { namePrefix: 'Printer' }, { namePrefix: 'BT' }], optionalServices: [0x18f0, 0xff00] },
    ];
    let lastErr: any = null;
    for (const opts of attempts) {
      try {
        this.device = await navigator.bluetooth.requestDevice(opts);
        return this.device;
      } catch (err: any) {
        lastErr = err;
        const m = errMsg(err);
        if (isCancel(m) && !/^\d+$/.test(m)) throw new Error("Seleção de impressora cancelada.");
        console.warn('[Bluetooth] requestDevice falhou com', opts, err);
      }
    }
    throw new Error("Não foi possível listar impressoras Bluetooth neste navegador. Feche e abra o Bluefy, desligue e ligue o Bluetooth e tente de novo. (código " + errMsg(lastErr) + ")");
  }

  async connect(): Promise<void> {
    if (!this.device) {
      throw new Error("Nenhum dispositivo selecionado.");
    }

    if (!this.device.gatt) {
      throw new Error("O dispositivo não suporta GATT.");
    }

    this.server = await this.device.gatt.connect();
    
    // We need to find the writable characteristic.
    const services = await this.server.getPrimaryServices();
    for (const service of services) {
      const characteristics = await service.getCharacteristics();
      for (const char of characteristics) {
        if (char.properties.write || char.properties.writeWithoutResponse) {
          this.characteristic = char;
          return;
        }
      }
    }

    throw new Error("Nenhuma característica de gravação encontrada na impressora.");
  }

  async disconnect(): Promise<void> {
    if (this.device && this.device.gatt?.connected) {
      this.device.gatt.disconnect();
    }
    this.device = null;
    this.server = null;
    this.characteristic = null;
  }

  async print(data: Uint8Array): Promise<void> {
    if (!this.characteristic) {
      throw new Error("Não conectado à impressora.");
    }

    // Web Bluetooth can only write small chunks (usually 20-512 bytes depending on MTU).
    const CHUNK_SIZE = 100; // Safe chunk size for most BLE printers
    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
      const chunk = data.slice(i, i + CHUNK_SIZE);
      if (this.characteristic.properties.writeWithoutResponse) {
        await this.characteristic.writeValueWithoutResponse(chunk);
      } else {
        await this.characteristic.writeValue(chunk);
      }
      // Small delay to prevent buffer overflow on the printer
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }

  isConnected(): boolean {
    return this.device !== null && this.device.gatt !== undefined && this.device.gatt.connected;
  }

  getDeviceName(): string | undefined {
    return this.device?.name;
  }
}

export const webBluetoothPrinter = new WebBluetoothPrinter();

// Esc/Pos helper to generate test text
export function generateTestReceipt(): Uint8Array {
  const ESC = 0x1b;
  const AT = 0x40; // Init
  const LF = 0x0a; // Line feed

  // Simple initialization and text
  const text = "TESTE DE IMPRESSAO BLUETOOTH\nMenuzin App\n\n\n";
  const encoder = new TextEncoder(); // Uses UTF-8, which might need special mapping for accented chars in standard esc/pos, but ok for basic test
  
  const buffer = new Uint8Array(2 + text.length);
  buffer[0] = ESC;
  buffer[1] = AT;
  buffer.set(encoder.encode(text), 2);
  
  return buffer;
}

export type BluetoothSupport = { ok: true } | { ok: false; reason: string };

/** Diz se este aparelho/navegador consegue usar impressora Bluetooth e, se não, o motivo. */
export function getBluetoothSupport(): BluetoothSupport {
  if (typeof window === "undefined") return { ok: false, reason: "" };
  const ua = navigator.userAgent || "";
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  let inIframe = false;
  try { inIframe = window.top !== window.self; } catch { inIframe = true; }
  if (inIframe) return { ok: false, reason: "O Bluetooth não funciona dentro da prévia. Abra o site publicado (menuzin.app)." };
  if (!window.isSecureContext) return { ok: false, reason: "O Bluetooth só funciona em endereço seguro (https)." };
  if (!(navigator as any).bluetooth) {
    if (isIOS) return { ok: false, reason: "Seu navegador não tem Bluetooth. No iPhone/iPad, abra o painel no app Bluefy (grátis na App Store)." };
    return { ok: false, reason: "Este navegador não tem Bluetooth. Abra o painel no Chrome ou Edge (Android, PC ou Mac)." };
  }
  return { ok: true };
}
