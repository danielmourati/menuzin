// Tipos compartilhados para configuração de impressora térmica.

export type PaperWidth = "58mm" | "80mm";
export type ConnectionType = "bluetooth" | "usb" | "network" | "browser";
export type EscPosProfile = "generic" | "mini_bt_58" | "generic_80" | "elgin_i8_i9";
export type FontSize = "normal" | "compact";
export type CutType = "none" | "partial" | "full";

export type PrinterSettings = {
  id?: string;
  tenant_id?: string;
  printer_name: string;
  printer_model: string;
  paper_width: PaperWidth;
  connection_type: ConnectionType;
  escpos_profile: EscPosProfile;
  font_size: FontSize;
  use_bold_titles: boolean;
  use_double_total: boolean;
  show_store_name: boolean;
  show_address: boolean;
  show_document: boolean;
  show_whatsapp: boolean;
  show_pix: boolean;
  show_instagram: boolean;
  show_thank_message: boolean;
  thank_message: string;
  separator_char: string;
  cut_type: CutType;
  feed_lines: number;
};

export const DEFAULT_PRINTER_SETTINGS: PrinterSettings = {
  printer_name: "",
  printer_model: "ESC/POS compatível",
  paper_width: "80mm",
  connection_type: "browser",
  escpos_profile: "generic",
  font_size: "normal",
  use_bold_titles: true,
  use_double_total: true,
  show_store_name: true,
  show_address: true,
  show_document: true,
  show_whatsapp: true,
  show_pix: true,
  show_instagram: true,
  show_thank_message: true,
  thank_message: "Obrigado, volte sempre!",
  separator_char: "-",
  cut_type: "none",
  feed_lines: 3,
};

export const columnsFor = (w: PaperWidth) => (w === "58mm" ? 32 : 48);
