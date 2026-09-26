import type { SVGProps } from "react";

const base = {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Pastel salgado — meia-lua com borda ondulada. */
export function PastelSalgadoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M21 7 7 21c-.8-.6-1.4-.3-2-1 .2-.9-.6-1.2-.9-2 .5-.8-.3-1.3-.4-2.1.6-.7 0-1.4.1-2.2.7-.6.3-1.4.6-2.1.8-.4.6-1.3 1.1-1.9.9-.2.9-1.1 1.5-1.6 1-.1 1.2-1 1.9-1.3 1 .1 1.4-.7 2.2-.9.9.3 1.5-.4 2.3-.4.8.5 1.5-.1 2.3.1.6.6 1.4.2 2.1.6.3.8 1.1.7 1.6 1.2Z" />
      <path d="M18.5 8.2C14 6 9 8 7.5 12.5c-.6 2-.4 4 .5 5.8" />
    </svg>
  );
}

/** Pastel doce — barra de chocolate. */
export function PastelDoceIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <rect x="6" y="3" width="12" height="18" rx="1.5" />
      <path d="M12 3v6M6 6.5h12" />
      <path d="M5 11.5 18.5 9.5l.5 2.5-13.5 1.8Z" />
      <path d="M11 18h2" />
    </svg>
  );
}
