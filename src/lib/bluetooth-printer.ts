export class WebBluetoothPrinter {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;

  async requestDevice(): Promise<BluetoothDevice> {
    if (!navigator.bluetooth) {
      throw new Error("Web Bluetooth não é suportado neste navegador. Use Chrome ou Edge no Android/PC.");
    }

    try {
      this.device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: ['000018f0-0000-1000-8000-00805f9b34fb'] }, // Custom thermal printer service
          { services: ['0000e781-0000-1000-8000-00805f9b34fb'] }, // Another common service
          { namePrefix: 'MPT' },
          { namePrefix: 'RP' },
          { namePrefix: 'MTP' },
          { namePrefix: 'PT' },
          { namePrefix: 'Ipos' },
          { namePrefix: 'POS' }
        ],
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb',
          '0000e781-0000-1000-8000-00805f9b34fb',
          'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
          '49535343-fe7d-4ae5-8fa9-9fafd205e455' // Common serial port over BLE service
        ],
        acceptAllDevices: true // Using acceptAllDevices + optionalServices for max compatibility if filters fail
      });

      return this.device;
    } catch (err) {
      throw new Error("Falha ao buscar dispositivos Bluetooth: " + (err as Error).message);
    }
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
