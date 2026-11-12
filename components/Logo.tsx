// Identité Media Booster : deux chevrons qui montent (le « boost »), violet électrique et point rose.

/** Le signe seul : deux chevrons empilés, en blanc par défaut (posé sur la tuile violette). */
export function SigneBoost({ size = 24, color = "#FFFFFF" }: { size?: number; color?: string }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M5 12.5l7-7 7 7" />
      <path d="M5 19.5l7-7 7 7" opacity={0.55} />
    </svg>
  );
}

/** Logotype horizontal : tuile + « MEDIA BOOSTER ». */
export function Logo({ size = 24, color = "#14102B", tuile = "#5B3DF5" }: { size?: number; color?: string; tuile?: string }) {
  return (
    <div role="img" aria-label="Media Booster" style={{ display: "flex", alignItems: "center", gap: size * 0.4, lineHeight: 1 }}>
      <span aria-hidden="true" style={{ width: size * 1.5, height: size * 1.5, borderRadius: size * 0.4, background: tuile, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
        <SigneBoost size={size} />
      </span>
      <span aria-hidden="true" style={{ display: "flex", flexDirection: "column", gap: 2, fontFamily: "var(--font-mont), sans-serif", color }}>
        <span style={{ fontWeight: 600, fontSize: size * 0.42, letterSpacing: "0.22em" }}>MEDIA</span>
        <span style={{ fontWeight: 800, fontSize: size * 0.82, letterSpacing: "-0.01em" }}>BOOSTER</span>
      </span>
    </div>
  );
}
