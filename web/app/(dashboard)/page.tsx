"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { buildAttention, buildPeople, formatClock, formatDuration } from "@/lib/board";
import { errorMessage } from "@/lib/errors";
import { AdminEntry, SOURCE_LABEL, TYPE_LABEL, UserRow } from "@/lib/types";
import { btnLink, errorCls, surfaceCls } from "@/lib/ui";
import Avatar from "@/components/Avatar";
import DayBoard from "@/components/DayBoard";
import PageHeader from "@/components/PageHeader";

function longDate(now: number) {
  const text = new Date(now).toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default function HoyPage() {
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [entries, setEntries] = useState<AdminEntry[] | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState("");

  // Carga inicial y actualización cada minuto
  useEffect(() => {
    let alive = true;
    const run = () =>
      Promise.all([
        api<UserRow[]>("/api/admin/users"),
        api<AdminEntry[]>("/api/admin/time-entries"),
      ])
        .then(([u, e]) => {
          if (!alive) return;
          setUsers(u);
          setEntries(e);
          setNow(Date.now());
          setError("");
        })
        .catch((err) => {
          if (alive) setError(errorMessage(err));
        });

    void run();
    const id = setInterval(run, 60000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  // El tramo en curso avanza cada 30 s sin pedir nada al servidor
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const people = useMemo(
    () => (users && entries ? buildPeople(users, entries, now) : null),
    [users, entries, now],
  );
  const attention = useMemo(() => (people ? buildAttention(people, now) : []), [people, now]);
  const recent = useMemo(
    () =>
      entries
        ? [...entries]
            .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
            .slice(0, 8)
        : [],
    [entries],
  );

  const working = people?.filter((p) => p.state === "WORKING").length ?? 0;
  const onBreak = people?.filter((p) => p.state === "ON_BREAK").length ?? 0;
  const away = people?.filter((p) => p.state === "OUT" || p.state === "NONE").length ?? 0;
  const totalMs = people?.reduce((sum, p) => sum + p.workedMs, 0) ?? 0;

  return (
    <section>
      <PageHeader
        title="Hoy"
        description={longDate(now)}
        actions={
          people && <span className="text-xs text-slate-500">Actualizado a las {formatClock(now)}</span>
        }
      />

      {error && <p className={`${errorCls} mb-4`}>{error}</p>}
      {!people && !error && <p className="text-slate-500">Cargando...</p>}

      {people && (
        <>
          <dl className="mb-5 flex flex-wrap items-center gap-x-8 gap-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-brand" aria-hidden="true" />
              <dd className="font-semibold tabular-nums">{working}</dd>
              <dt className="text-slate-600">trabajando</dt>
            </div>
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-pause" aria-hidden="true" />
              <dd className="font-semibold tabular-nums">{onBreak}</dd>
              <dt className="text-slate-600">en pausa</dt>
            </div>
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-slate-300" aria-hidden="true" />
              <dd className="font-semibold tabular-nums">{away}</dd>
              <dt className="text-slate-600">fuera</dt>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <dt>Horas del equipo hoy:</dt>
              <dd className="font-semibold tabular-nums text-ink">{formatDuration(totalMs)}</dd>
            </div>
          </dl>

          {people.length === 0 ? (
            <div className={`${surfaceCls} p-8 text-center`}>
              <p className="font-medium">Todavía no hay empleados.</p>
              <p className="mt-1 text-sm text-slate-500">
                Da de alta al primero en{" "}
                <Link href="/usuarios" className={btnLink}>
                  Usuarios
                </Link>{" "}
                y aparecerá aquí cuando fiche.
              </p>
            </div>
          ) : (
            <DayBoard people={people} now={now} />
          )}

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <section className={surfaceCls} aria-label="Actividad reciente">
              <h2 className="border-b border-slate-100 px-4 py-3 text-base font-semibold">
                Actividad reciente
              </h2>
              {recent.length === 0 ? (
                <p className="p-4 text-sm text-slate-500">Todavía no hay fichajes hoy.</p>
              ) : (
                <ul>
                  {recent.map((e) => (
                    <li
                      key={e.id}
                      className="flex items-center gap-3 border-b border-slate-100 px-4 py-2.5 last:border-0"
                    >
                      <span className="w-12 text-sm tabular-nums text-slate-500">
                        {formatClock(new Date(e.occurredAt).getTime())}
                      </span>
                      <Avatar name={e.userName} size="sm" />
                      <span className="min-w-0 flex-1 truncate text-sm">
                        <span className="font-medium">{e.userName}</span>{" "}
                        <span className="text-slate-600">{TYPE_LABEL[e.type].toLowerCase()}</span>
                      </span>
                      {e.source === "ADMIN" && (
                        <span className="rounded-full bg-pause-soft px-2 py-0.5 text-xs font-medium text-pause-ink">
                          {SOURCE_LABEL[e.source]}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className={surfaceCls} aria-label="Requiere atención">
              <h2 className="border-b border-slate-100 px-4 py-3 text-base font-semibold">
                Requiere atención
              </h2>
              {attention.length === 0 ? (
                <p className="p-4 text-sm text-slate-500">Sin incidencias por ahora.</p>
              ) : (
                <>
                  <ul>
                    {attention.map((a, i) => (
                      <li
                        key={`${a.user.id}-${i}`}
                        className="flex items-center gap-3 border-b border-slate-100 px-4 py-2.5 last:border-0"
                      >
                        <Avatar name={a.user.fullName} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{a.user.fullName}</p>
                          <p className="text-xs text-alert">{a.message}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="border-t border-slate-100 px-4 py-3">
                    <Link href="/fichajes" className={btnLink}>
                      Corregir en fichajes
                    </Link>
                  </div>
                </>
              )}
            </section>
          </div>
        </>
      )}
    </section>
  );
}