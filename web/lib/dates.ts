const pad = (n: number) => String(n).padStart(2, "0");

function dateStr(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Fecha de hoy en formato YYYY-MM-DD, en hora local. */
export function todayStr() {
  return dateStr(new Date());
}

/** Convierte un instante ISO al formato de <input type="datetime-local">. */
export function toLocalInput(iso: string) {
  const d = new Date(iso);
  return `${dateStr(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}