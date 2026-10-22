import { AdminEntry, UserRow } from "./types";

export type Seg = { kind: "work" | "pause"; from: number; to: number; open: boolean };
export type PersonState = "WORKING" | "ON_BREAK" | "OUT" | "NONE";

export type Person = {
  user: UserRow;
  segs: Seg[];
  state: PersonState;
  /** Inicio del tramo en curso (trabajo o pausa), si lo hay. */
  since: number | null;
  /** Hora del último fichaje del día. */
  lastAt: number | null;
  workedMs: number;
};

export type Attention = { user: UserRow; message: string };

const ORDER: Record<PersonState, number> = { WORKING: 0, ON_BREAK: 1, OUT: 2, NONE: 3 };
const HOUR = 3600000;

export function buildPeople(users: UserRow[], entries: AdminEntry[], now: number): Person[] {
  const byUser = new Map<number, AdminEntry[]>();
  for (const e of entries) {
    const list = byUser.get(e.userId) ?? [];
    list.push(e);
    byUser.set(e.userId, list);
  }

  const people = users
    .filter((u) => u.active || byUser.has(u.id))
    .map((user) => buildPerson(user, byUser.get(user.id) ?? [], now));

  return people.sort(
    (a, b) =>
      ORDER[a.state] - ORDER[b.state] || a.user.fullName.localeCompare(b.user.fullName, "es"),
  );
}

function buildPerson(user: UserRow, entries: AdminEntry[], now: number): Person {
  const sorted = [...entries].sort(
    (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
  );

  const segs: Seg[] = [];
  let cur: { kind: "work" | "pause"; from: number } | null = null;

  for (const e of sorted) {
    const t = new Date(e.occurredAt).getTime();
    switch (e.type) {
      case "CLOCK_IN":
        if (!cur) cur = { kind: "work", from: t };
        break;
      case "BREAK_START":
        if (cur && cur.kind === "work") {
          segs.push({ kind: "work", from: cur.from, to: t, open: false });
          cur = { kind: "pause", from: t };
        }
        break;
      case "BREAK_END":
        if (cur && cur.kind === "pause") {
          segs.push({ kind: "pause", from: cur.from, to: t, open: false });
          cur = { kind: "work", from: t };
        }
        break;
      case "CLOCK_OUT":
        if (cur) {
          segs.push({ kind: cur.kind, from: cur.from, to: t, open: false });
          cur = null;
        }
        break;
    }
  }

  const open = cur as { kind: "work" | "pause"; from: number } | null;
  if (open) {
    segs.push({ kind: open.kind, from: open.from, to: Math.max(now, open.from), open: true });
  }

  const state: PersonState = open
    ? open.kind === "work"
      ? "WORKING"
      : "ON_BREAK"
    : sorted.length > 0
      ? "OUT"
      : "NONE";

  const workedMs = segs.filter((s) => s.kind === "work").reduce((sum, s) => sum + (s.to - s.from), 0);
  const last = sorted[sorted.length - 1];

  return {
    user,
    segs,
    state,
    since: open ? open.from : null,
    lastAt: last ? new Date(last.occurredAt).getTime() : null,
    workedMs,
  };
}

/** Situaciones que el jefe probablemente tiene que revisar hoy. */
export function buildAttention(people: Person[], now: number): Attention[] {
  const out: Attention[] = [];
  const hour = new Date(now).getHours();

  for (const p of people) {
    if (p.state === "NONE" && p.user.active && p.user.role === "EMPLOYEE" && hour >= 10) {
      out.push({ user: p.user, message: "Todavía no ha fichado hoy" });
    }
    const open = p.segs.find((s) => s.open);
    if (open && open.kind === "work" && open.to - open.from > 10 * HOUR) {
      out.push({ user: p.user, message: "Lleva más de 10 h sin cerrar la jornada" });
    }
    if (open && open.kind === "pause" && open.to - open.from > 2 * HOUR) {
      out.push({ user: p.user, message: "Lleva más de 2 h de pausa" });
    }
  }
  return out;
}

export function formatClock(ms: number) {
  return new Date(ms).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function formatDuration(ms: number) {
  const totalMinutes = Math.floor(ms / 60000);
  return `${Math.floor(totalMinutes / 60)}h ${String(totalMinutes % 60).padStart(2, "0")}m`;
}
