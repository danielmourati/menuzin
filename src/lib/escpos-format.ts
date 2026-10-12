/** Printer state is explicit for each job; styling bytes never count as columns. */
export const ESC_BOLD_ON = "\x1bE\x01";
export const ESC_BOLD_OFF = "\x1bE\x00";
export const ESC_NORMAL_SIZE = "\x1d!\x00";
export const ESC_DOUBLE_SIZE = "\x1d!\x11";
export function printerReset(compact = false): string {
  return "\x1b@\x1ba\x00\x1bM" + (compact ? "\x01" : "\x00") + ESC_NORMAL_SIZE + ESC_BOLD_OFF;
}

export type PrintSpan = { text: string; bold: boolean; double: boolean };
/** Decode only our emitted formatting commands for HTML and width assertions. */
export function parsePrintSpans(text: string): PrintSpan[] {
  const spans: PrintSpan[] = [];
  let bold = false;
  let double = false;
  let buffer = "";
  const flush = () => {
    if (buffer) spans.push({ text: buffer, bold, double });
    buffer = "";
  };
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch !== "\x1b" && ch !== "\x1d") { buffer += ch; continue; }
    flush();
    const op = text[++i];
    if (ch === "\x1b" && op === "@") { bold = false; double = false; continue; }
    const value = text.charCodeAt(++i);
    if (ch === "\x1b" && op === "E") bold = value !== 0;
    if (ch === "\x1d" && op === "!") double = (value & 0x10) !== 0;
  }
  flush();
  return spans;
}

export const plainPrintText = (text: string) => parsePrintSpans(text).map((s) => s.text).join("");

/** Formatting-only entries change state without feeding a blank paper line. */
export function compactPrintCommands(text: string): string {
  const lines: string[] = [];
  let pending = "";
  for (const line of text.split("\n")) {
    if (line && plainPrintText(line) === "") { pending += line; continue; }
    lines.push(pending + line);
    pending = "";
  }
  return lines.join("\n") + pending;
}