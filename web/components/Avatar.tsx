const TONES = [
  "bg-[#d8ece7] text-[#0a6b5a]",
  "bg-[#fbefd5] text-[#8a5700]",
  "bg-[#dde7f7] text-[#2a4a86]",
  "bg-[#f6e0e6] text-[#8a2b45]",
  "bg-[#e8e2f6] text-[#4b3a8a]",
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = (parts[0]?.[0] ?? "?") + (parts.length > 1 ? parts[1][0] : "");
  return letters.toUpperCase();
}

function toneFor(name: string) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) % 997;
  return TONES[hash % TONES.length];
}

export default function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const dims = size === "sm" ? "size-7 text-[11px]" : "size-9 text-xs";
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${dims} ${toneFor(name)}`}
    >
      {initials(name)}
    </span>
  );
}
