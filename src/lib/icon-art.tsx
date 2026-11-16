// Shared artwork for the app icon (neon square, black four-point star).
export function iconArt(size: number) {
  return (
    <div
      style={{
        width: size,
        height: size,
        background: "#e2f73b",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="1.8" strokeLinejoin="round">
        <path d="M12 2C12.8 7.5 16.5 11.2 22 12C16.5 12.8 12.8 16.5 12 22C11.2 16.5 7.5 12.8 2 12C7.5 11.2 11.2 7.5 12 2Z" />
      </svg>
    </div>
  );
}
