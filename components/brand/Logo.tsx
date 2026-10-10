type LogoProps = { size?: number; withWordmark?: boolean; className?: string };

/** Logo geometris "S" blok + titik cobalt. Dekoratif jika ada wordmark. */
export function Logo({ size = 40, withWordmark = true, className = "" }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        role={withWordmark ? undefined : "img"}
        aria-hidden={withWordmark ? true : undefined}
        aria-label={withWordmark ? undefined : "Syamil Form"}
      >
        <rect x="7" y="7" width="38" height="38" className="fill-fg" />
        <rect x="2" y="2" width="38" height="38" strokeWidth="3" className="fill-accent stroke-line" />
        <path d="M30 12H16V22H26V32H12" fill="none" stroke="#171717" strokeWidth="5" />
        <rect x="30" y="27" width="7" height="7" className="fill-cobalt" />
      </svg>
      {withWordmark && (
        <span className="font-display text-xl font-bold tracking-tight">
          Syamil<span className="nb-mono ml-1 align-top">Form</span>
        </span>
      )}
    </span>
  );
}
