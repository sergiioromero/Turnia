import type { LucideIcon } from "lucide-react";

export default function IconButton({
  label,
  icon: Icon,
  onClick,
  tone = "default",
  disabled,
}: {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  tone?: "default" | "danger";
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg p-2 transition disabled:cursor-not-allowed disabled:opacity-40 ${
        tone === "danger"
          ? "text-slate-500 hover:bg-alert-soft hover:text-alert"
          : "text-slate-500 hover:bg-slate-100 hover:text-ink"
      }`}
    >
      <Icon size={17} aria-hidden="true" />
    </button>
  );
}