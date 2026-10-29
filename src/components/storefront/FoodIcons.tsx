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

/** Crepe — casquinha dobrada com recheio saindo da boca. */
export function CrepeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M5.6 8h12.8l-6.1 10.9q-1.3 2.5-2.6 0L5.6 8Z" />
      <path d="M9.6 8.9 14.4 17.4" />
      <path d="M8.4 8c-.9-1.3-.2-2.8 1.2-3 .2-1.4 1.8-2 2.9-1.2 1.2-.7 2.8.1 2.9 1.5 1.1.3 1.5 1.7.7 2.7" />
    </svg>
  );
}

/** Batata frita — caixinha com palitos saindo do topo. */
export function FritasIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M8.6 9.6V5.1M12 9.6V3.6M15.4 9.6V5.4" />
      <path d="M6.6 9.6h10.8l-1.3 9.5a1.6 1.6 0 0 1-1.6 1.4H9.5a1.6 1.6 0 0 1-1.6-1.4L6.6 9.6Z" />
      <path d="M8.2 13.7h7.6" />
    </svg>
  );
}
