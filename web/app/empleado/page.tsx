"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Coffee, LogIn, LogOut, Play, type LucideIcon } from "lucide-react";
import DayBoard from "@/components/DayBoard";
import PageHeader from "@/components/PageHeader";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { buildPeople, formatClock, formatDuration } from "@/lib/board";
import { errorMessage } from "@/lib/errors";
import {
  AdminEntry,
  EntrySource,
  EntryType,
  RoleName,
  SOURCE_LABEL,
  TYPE_LABEL,
  UserRow,
} from "@/lib/types";
import { errorCls, surfaceCls } from "@/lib/ui";

type StatusResponse = {
  state: "OUT" | "WORKING" | "ON_BREAK";
  allowedActions: EntryType[];
  lastEntryAt: string | null;
};

type EntryRow = { id: number; type: EntryType; occurredAt: string; source: EntrySource };
type Mine = { status: StatusResponse; week: EntryRow[] };

const HOUR = 3600000;
const DAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const pad = (n: number) => String(n).padStart(2, "0");
const dateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function mondayOf(d: Date) {
  const m = new Date(d);
  m.setHours(0, 0, 0, 0);
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
  return m;
}

function hm(ms: number) {
  const minutes = Math.floor(ms / 60000);
  return `${Math.floor(minutes / 60)}:${pad(minutes % 60)}`;
}

function longDate(now: number) {
  const text = new Date(now).toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function clockWithSeconds(ms: number) {
  return new Date(ms).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

// Estado del día y fichajes de la semana (de lunes a hoy)
async function fetchMine(): Promise<Mine> {
  const today = new Date();
  const from = dateKey(mondayOf(today));
  const to = dateKey(today);
  const [status, week] = await Promise.all([
    api<StatusResponse>("/api/time-entries/me/status"),
    api<EntryRow[]>(`/api/time-entries/me?from=${from}&to=${to}`),
  ]);
  return { status, week };
}

const ACTIONS: Record<EntryType, { label: string; icon: LucideIcon; style: "go" | "dark" | "ghost" }> = {
  CLOCK_IN: { label: "Fichar entrada", icon: LogIn, style: "go" },
  BREAK_END: { label: "Volver de la pausa", icon: Play, style: "go" },
  BREAK_START: { label: "Iniciar pausa", icon: Coffee, style: "ghost" },
  CLOCK_OUT: { label: "Fichar salida", icon: LogOut, style: "dark" },
};
const ACTION_ORDER: EntryType[] = ["CLOCK_IN", "BREAK_END", "BREAK_START", "CLOCK_OUT"];

const BTN_BASE =
  "inline-flex items-center justify-center gap-2.5 rounded-xl px-6 py-3.5 text-base font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";
const BTN_STYLE = {
  go: "bg-brand-ink text-white hover:bg-[#085446]",
  dark: "bg-ink text-white hover:bg-slate-800",
  ghost: "border border-slate-300 bg-white text-ink hover:bg-slate-50",
};

const STATE_UI = {
  OUT: { accent: "border-l-slate-300", dot: "bg-slate-400" },
  WORKING: { accent: "border-l-brand", dot: "bg-brand" },
  ON_BREAK: { accent: "border-l-pause", dot: "bg-pause" },
};

const ENTRY_DOT: Record<EntryType, string> = {
  CLOCK_IN: "bg-brand",
  BREAK_END: "bg-brand",
  BREAK_START: "bg-pause",
  CLOCK_OUT: "bg-slate-400",
};

export default function MiJornadaPage() {
  const { session } = useAuth();
  const [data, setData] = useState<Mine | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmOut, setConfirmOut] = useState(false);

  const apply = useCallback((mine: Mine) => {
    setData(mine);
    setNow(Date.now());
    setError("");
  }, []);

  useEffect(() => {
    let alive = true;
    fetchMine()
      .then((mine) => {
        if (alive) apply(mine);
      })
      .catch((e) => {
        if (alive) setError(errorMessage(e));
      });
    return () => {
      alive = false;
    };
  }, [apply]);

  // Reloj en vivo
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  async function doAction(type: EntryType) {
    setBusy(true);
    setError("");
    setConfirmOut(false);
    try {
      await api("/api/time-entries", {
        method: "POST",
        body: JSON.stringify({ type, source: "WEB" }),
      });
      apply(await fetchMine());
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  // Los datos de la sesión se adaptan al formato que usa el tablero del jefe
  const me: UserRow = useMemo(
    () => ({
      id: session?.userId ?? 0,
      email: "",
      fullName: session?.fullName ?? "",
      role: (session?.role as RoleName) ?? "EMPLOYEE",
      active: true,
      phone: null,
      jobTitle: null,
      hiredAt: null,
      terminatedAt: null,
    }),
    [session],
  );

  const byDay = useMemo(() => {
    const map = new Map<string, AdminEntry[]>();
    for (const e of data?.week ?? []) {
      const key = dateKey(new Date(e.occurredAt));
      const list = map.get(key) ?? [];
      list.push({ ...e, userId: me.id, userName: me.fullName });
      map.set(key, list);
    }
    return map;
  }, [data, me]);

  const todayKey = dateKey(new Date(now));
  const todayEntries = useMemo(() => byDay.get(todayKey) ?? [], [byDay, todayKey]);
  const people = useMemo(() => buildPeople([me], todayEntries, now), [me, todayEntries, now]);
  const person = people[0];

  const weekDays = useMemo(() => {
    const monday = mondayOf(new Date(now));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const key = dateKey(d);
      const isToday = key === todayKey;
      const future = key > todayKey;
      const p = buildPeople([me], byDay.get(key) ?? [], now)[0];
      // En días anteriores, un tramo sin cerrar no se suma: se avisa de que falta la salida
      const ms = future
        ? 0
        : p.segs
            .filter((s) => s.kind === "work" && (isToday || !s.open))
            .reduce((sum, s) => sum + (s.to - s.from), 0);
      return {
        key,
        label: DAY_LABELS[i],
        ms,
        isToday,
        future,
        unclosed: !isToday && p.segs.some((s) => s.open),
      };
    });
  }, [byDay, me, now, todayKey]);

  const weekTotal = weekDays.reduce((sum, d) => sum + d.ms, 0);
  const maxMs = Math.max(8 * HOUR, ...weekDays.map((d) => d.ms));

  const status = data?.status;
  const ui = STATE_UI[status?.state ?? "OUT"];
  const firstName = session?.fullName.split(" ")[0] ?? "";

  let statusLine = "Fuera de trabajo";
  if (status?.state === "WORKING") {
    statusLine = person?.since ? `Trabajando desde las ${formatClock(person.since)}` : "Trabajando";
  } else if (status?.state === "ON_BREAK") {
    statusLine = person?.since ? `En pausa desde las ${formatClock(person.since)}` : "En pausa";
  }

  const workedMs = person?.workedMs ?? 0;
  let subLine = "Todavía no has fichado hoy.";
  if (workedMs > 0) {
    subLine =
      status?.state === "OUT"
        ? `Hoy has trabajado ${formatDuration(workedMs)}.`
        : `Llevas ${formatDuration(workedMs)} trabajadas hoy.`;
  } else if (todayEntries.length > 0) {
    subLine = "Todavía no has acumulado tiempo de trabajo hoy.";
  }

  const actions = ACTION_ORDER.filter((a) => status?.allowedActions.includes(a));
  const todayList = [...todayEntries].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );

  return (
    <section>
      <PageHeader title="Mi jornada" description={longDate(now)} />

      {error && <p className={`${errorCls} mb-4`}>{error}</p>}
      {!data && !error && <p className="text-slate-500">Cargando...</p>}

      {data && status && (
        <>
          <div
            className={`${surfaceCls} grid gap-8 border-l-4 p-6 md:p-8 lg:grid-cols-[minmax(0,1fr)_21rem] ${ui.accent}`}
          >
            <div>
              <p className="text-sm text-slate-500">Hola, {firstName}</p>
              <p
                aria-label="Hora actual"
                className="mt-1 font-display text-6xl font-semibold tabular-nums tracking-tight md:text-7xl"
              >
                {clockWithSeconds(now)}
              </p>

              <p className="mt-3 flex items-center gap-2 text-base font-medium">
                <span aria-hidden="true" className={`size-2.5 rounded-full ${ui.dot}`} />
                {statusLine}
              </p>
              <p className="mt-0.5 text-sm text-slate-500">{subLine}</p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                {confirmOut ? (
                  <>
                    <p className="text-sm font-medium">
                      ¿Fichar la salida a las {formatClock(now)}?
                    </p>
                    <button
                      disabled={busy}
                      onClick={() => doAction("CLOCK_OUT")}
                      className={`${BTN_BASE} ${BTN_STYLE.dark}`}
                    >
                      Sí, fichar salida
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => setConfirmOut(false)}
                      className={`${BTN_BASE} ${BTN_STYLE.ghost}`}
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  actions.map((type) => {
                    const a = ACTIONS[type];
                    const Icon = a.icon;
                    return (
                      <button
                        key={type}
                        disabled={busy}
                        onClick={() => (type === "CLOCK_OUT" ? setConfirmOut(true) : doAction(type))}
                        className={`${BTN_BASE} ${BTN_STYLE[a.style]}`}
                      >
                        <Icon size={20} aria-hidden="true" />
                        {a.label}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <section
              aria-label="Esta semana"
              className="border-t border-slate-100 pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0"
            >
              <div className="flex items-baseline justify-between">
                <h2 className="text-base font-semibold">Esta semana</h2>
                <p className="text-sm tabular-nums text-slate-600">
                  Total: <span className="font-semibold text-ink">{formatDuration(weekTotal)}</span>
                </p>
              </div>
              <div className="mt-4 flex gap-2">
                {weekDays.map((d) => {
                  const pct = d.ms > 0 ? Math.max(4, (d.ms / maxMs) * 100) : 0;
                  return (
                    <div key={d.key} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                      <div className="flex h-24 w-full items-end justify-center">
                        {d.future ? (
                          <div className="h-full w-full max-w-7 rounded-md border border-dashed border-slate-200" />
                        ) : (
                          <div
                            title={`${d.label}: ${formatDuration(d.ms)}`}
                            className={`min-h-[3px] w-full max-w-7 rounded-md ${
                              d.isToday ? "bg-brand" : "bg-slate-300"
                            }`}
                            style={{ height: `${pct}%` }}
                          />
                        )}
                      </div>
                      <span className="text-[11px] tabular-nums text-slate-500">
                        {d.ms > 0 ? hm(d.ms) : "—"}
                      </span>
                      <span
                        className={`text-xs ${d.isToday ? "font-semibold text-ink" : "text-slate-500"}`}
                      >
                        {d.label}
                      </span>
                      {d.unclosed && (
                        <span className="text-center text-[11px] leading-tight text-alert">
                          Sin salida
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          <div className="mt-6">
            <DayBoard people={people} now={now} />
          </div>

          <section className={`${surfaceCls} mt-6`} aria-label="Fichajes de hoy">
            <h2 className="border-b border-slate-100 px-4 py-3 text-base font-semibold">
              Fichajes de hoy
            </h2>
            {todayList.length === 0 ? (
              <p className="p-4 text-sm text-slate-500">
                Aún no hay fichajes. Pulsa «Fichar entrada» cuando empieces.
              </p>
            ) : (
              <ul>
                {todayList.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center gap-3 border-b border-slate-100 px-4 py-2.5 last:border-0"
                  >
                    <span className="w-12 text-sm tabular-nums text-slate-500">
                      {formatClock(new Date(e.occurredAt).getTime())}
                    </span>
                    <span aria-hidden="true" className={`size-2 rounded-full ${ENTRY_DOT[e.type]}`} />
                    <span className="flex-1 text-sm font-medium">{TYPE_LABEL[e.type]}</span>
                    {e.source === "ADMIN" ? (
                      <span className="rounded-full bg-pause-soft px-2 py-0.5 text-xs font-medium text-pause-ink">
                        Añadido por tu jefe
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">{SOURCE_LABEL[e.source]}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </section>
  );
}