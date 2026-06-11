import logoAsset from "@/assets/menuzin-logo.png.asset.json";

export function Logo({ className = "h-7 w-auto", alt = "Menuzin" }: { className?: string; alt?: string }) {
  return <img src={logoAsset.url} alt={alt} className={className} loading="eager" />;
}

export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  // Crop just the mark by using object-position
  return (
    <div className={`${className} overflow-hidden`}>
      <img src={logoAsset.url} alt="Menuzin" className="h-full w-auto object-contain" style={{ objectPosition: "left center" }} />
    </div>
  );
}

export const logoUrl = logoAsset.url;
