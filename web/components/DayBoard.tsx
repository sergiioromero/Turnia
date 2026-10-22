"use client";

import { useMemo } from "react";
import Avatar from "./Avatar";
import { formatClock, formatDuration, Person } from "@/lib/board";

const HOUR = 3600000;

function statusText(p: Person) {
  switch (p.state) {
    case "WORKING":
      return `Trabajando desde las ${formatClock(p.since!)}`;
    case "ON_BREAK":
      return `En pausa desde las ${formatClock(p.since!)}`;
    case "OUT":
      return `Salió a las ${formatClock(p.lastAt!)}`;
    default:
      return "Sin fichar hoy";
  }
}

function StatusDot({ state }: { state: Person["state"] }) {
  const cls =
    state === "WORKING"
      ? "bg-brand"
      : state === "ON_BREAK"
        ? "bg-pause"
        : state === "OUT"
          ? "bg-slate-400"
          : "border border-slate-400";
  return <span aria-hidden="true" className={`inline-block size-2 rounded-full ${cls}`} />;
}

export default function DayBoard({ people, now }: { people: Person[]; now: number }) {
  const { dayStart, startH, endH, ticks } = useMemo(() => {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    const dayStart = d.getTime();

    let minH = 8;
    let maxH = 20;
    for (const p of people) {
      for (const s of p.segs) {
        minH = Math.min(minH, (s.from - dayStart) / HOUR);
        maxH = Math.max(maxH, (s.to - dayStart) / HOUR + 1);
      }
    }
    const startH = Math.max(0, Math.floor(minH / 2) * 2);
    const endH = Math.min(24, Math.ceil(maxH / 2) * 2);
    const ticks: number[] = [];
    for (let h = startH; h <= endH; h += 2) ticks.push(h);
    return { dayStart, startH, endH, ticks };
  }, [people, now]);

  const origin = dayStart + startH * HOUR;
  const span = (endH - startH) * HOUR;
  const pct = (t: number) => Math.min(100, Math.max(0, ((t - origin) / span) * 100));
  const nowPct = pct(now);
  const nowVisible = now >= origin && now <= origin + span;

  const ROW_GRID = "grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 md:grid-cols-[15rem_minmax(0,1fr)_4.5rem]";

  return (
    <section aria-label="Jornada de hoy" className="rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <h2 className="text-base font-semibold">Jornada de hoy</h2>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-5 rounded-full bg-brand" /> Trabajo
          </span>
          <span className="flex items-center gap-1.5">
            <span className="hatch-pause h-2.5 w-5 rounded-full" /> Pausa
          </span>
        </div>
      </div>

      {/* Eje de horas */}
      <div className={`${ROW_GRID} hidden border-t border-slate-100 px-4 pb-1 pt-2 md:grid`}>
        <span />
        <div className="relative h-4">
          {ticks.map((h, i) => (
            <span
              key={h}
              className="absolute top-0 text-xs tabular-nums text-slate-400"
              style={{
                left: `${((h - startH) / (endH - startH)) * 100}%`,
                transform: i === 0 ? "none" : i === ticks.length - 1 ? "translateX(-100%)" : "translateX(-50%)",
              }}
            >
              {String(h).padStart(2, "0")}:00
            </span>
          ))}
        </div>
        <span />
      </div>

      <ul>
        {people.map((p) => (
          <li key={p.user.id} className={`${ROW_GRID} border-t border-slate-100 px-4 py-3`}>
            <div className="flex min-w-0 items-center gap-3">
              <Avatar name={p.user.fullName} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{p.user.fullName}</p>
                <p className="flex items-center gap-1.5 text-xs text-slate-500">
                  <StatusDot state={p.state} />
                  <span className="truncate">{statusText(p)}</span>
                </p>
              </div>
            </div>

            <div className="relative order-last col-span-2 h-8 md:order-none md:col-span-1">
              {ticks.map((h) => (
                <span
                  key={h}
                  aria-hidden="true"
                  className="absolute inset-y-0 w-px bg-slate-100"
                  style={{ left: `${((h - startH) / (endH - startH)) * 100}%` }}
                />
              ))}

              {p.segs.map((s, i) => {
                const left = pct(s.from);
                const width = Math.max(pct(s.to) - left, 0);
                return (
                  <span
                    key={i}
                    title={`${s.kind === "work" ? "Trabajo" : "Pausa"}: ${formatClock(s.from)}–${
                      s.open ? "ahora" : formatClock(s.to)
                    }`}
                    className={`absolute top-1/2 h-3.5 min-w-1.5 -translate-y-1/2 rounded-full ${
                      s.kind === "work" ? "bg-brand" : "hatch-pause"
                    }`}
                    style={{ left: `${left}%`, width: `${width}%` }}
                  >
                    {s.open && s.kind === "work" && (
                      <span className="absolute right-1 top-1/2 size-1.5 -translate-y-1/2 animate-pulse rounded-full bg-white motion-reduce:animate-none" />
                    )}
                  </span>
                );
              })}

              {nowVisible && (
                <span
                  aria-hidden="true"
                  className="absolute inset-y-0 w-px bg-ink/60"
                  style={{ left: `${nowPct}%` }}
                />
              )}
            </div>

            <p className="text-right text-sm font-medium tabular-nums">
              {p.workedMs > 0 ? formatDuration(p.workedMs) : "—"}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
