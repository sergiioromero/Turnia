export default function Logo({ tone = "dark", size = 32 }: { tone?: "dark" | "light"; size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="9" fill="#0e8f78" />
        <rect x="7" y="8.5" width="12" height="4" rx="2" fill="#fff" />
        <rect x="7" y="14" width="18" height="4" rx="2" fill="#fff" fillOpacity="0.55" />
        <rect x="7" y="19.5" width="9" height="4" rx="2" fill="#fff" />
      </svg>
      <span
        className={`font-display text-xl font-semibold tracking-tight ${
          tone === "light" ? "text-white" : "text-ink"
        }`}
      >
        Turnia
      </span>
    </span>
  );
}
