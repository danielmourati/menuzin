/**
 * Utility functions to manage device-specific printer overrides.
 * Stores the chosen printer in browser localStorage so each computer/terminal
 * can select its own local physical printer without overwriting store-wide defaults.
 */

const DEVICE_PRINTER_KEY_PREFIX = 'menuzin_device_printer_';

/**
 * Returns the printer name stored locally for this device/browser.
 */
export function getDevicePrinter(tenantId?: string): string | null {
  if (typeof window === 'undefined') return null;
  const key = tenantId ? `${DEVICE_PRINTER_KEY_PREFIX}${tenantId}` : `${DEVICE_PRINTER_KEY_PREFIX}default`;
  try {
    return localStorage.getItem(key);
  } catch (err) {
    console.error('[DevicePrinter] Error reading from localStorage:', err);
    return null;
  }
}

/**
 * Sets or removes the local device printer override.
 */
export function setDevicePrinter(printerName: string | null, tenantId?: string): void {
  if (typeof window === 'undefined') return;
  const key = tenantId ? `${DEVICE_PRINTER_KEY_PREFIX}${tenantId}` : `${DEVICE_PRINTER_KEY_PREFIX}default`;
  try {
    if (printerName && printerName.trim() !== '') {
      localStorage.setItem(key, printerName.trim());
    } else {
      localStorage.removeItem(key);
    }
  } catch (err) {
    console.error('[DevicePrinter] Error saving to localStorage:', err);
  }
}

/**
 * Returns the effective printer name to use for printing on this device.
 * Prioritizes local device printer override over global store tenant setting.
 */
export function getEffectivePrinterName(globalPrinterName: string | null | undefined, tenantId?: string): string {
  const devicePrinter = getDevicePrinter(tenantId);
  if (devicePrinter && devicePrinter.trim() !== '') {
    return devicePrinter.trim();
  }
  return globalPrinterName?.trim() || '';
}

export function getDeviceSettings() {
  if (typeof window === 'undefined') return { usePrinterHere: true, printForOthers: false, useBluetooth: false };
  try {
    const raw = localStorage.getItem('menuzin_device_settings');
    if (raw && raw !== 'undefined' && raw !== 'null') {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          usePrinterHere: parsed.usePrinterHere ?? true,
          printForOthers: parsed.printForOthers ?? false,
          useBluetooth: parsed.useBluetooth ?? false,
        };
      }
    }
  } catch (e) {}
  return { usePrinterHere: true, printForOthers: false, useBluetooth: false };
}

export function saveDeviceSettings(settings: { usePrinterHere: boolean; printForOthers: boolean; useBluetooth: boolean }) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('menuzin_device_settings', JSON.stringify(settings));
}
