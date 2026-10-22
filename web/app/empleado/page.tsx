"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDateTime, todayStr } from "@/lib/dates";
import { errorMessage } from "@/lib/errors";
import { btnGhost, btnPrimary, errorCls } from "@/lib/ui";
import { EntrySource, EntryType, SOURCE_LABEL, TYPE_LABEL } from "@/lib/types";

type StatusResponse = {
  state: "OUT" | "WORKING" | "ON_BREAK";
  allowedActions: EntryType[];
  lastEntryAt: string | null;
};

type EntryRow = {
  id: number;
  type: EntryType;
  occurredAt: string;
  source: EntrySource;
};

function formatMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

// La API ya devuelve solo los fichajes del día, así que aquí no se filtra por fecha.
// Si hay un tramo abierto (trabajando ahora mismo), se suma hasta "now".
function calculateWorkedMinutes(entries: EntryRow[], now: number) {
  const sorted = [...entries].sort(
    (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
  );

  let start: number | null = null;
  let totalMs = 0;

  for (const e of sorted) {
    const t = new Date(e.occurredAt).getTime();
    if (e.type === "CLOCK_IN" || e.type === "BREAK_END") {
      if (start === null) start = t;
    } else if (e.type === "BREAK_START" || e.type === "CLOCK_OUT") {
      if (start !== null) {
        totalMs += t - start;
        start = null;
      }
    }
  }

  if (start !== null) totalMs += Math.max(0, now - start); // tramo en curso
  return Math.floor(totalMs / 60000);
}

export default function EmpleadoPage() {
  const { session } = useAuth();
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  async function load() {
    try {
      const today = todayStr();
      const [statusRes, historyRes] = await Promise.all([
        api<StatusResponse>("/api/time-entries/me/status"),
        api<EntryRow[]>(`/api/time-entries/me?from=${today}&to=${today}`),
      ]);

      setStatus(statusRes);
      setEntries(historyRes);
      setError("");
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  // Refresca el contador cada 30 s para que el tramo en curso se vaya sumando
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  async function doAction(type: EntryType) {
    setBusy(true);
    setError("");
    try {
      await api("/api/time-entries", {
        method: "POST",
        body: JSON.stringify({ type, source: "WEB" }),
      });
      setNow(Date.now());
      await load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const workedMinutes = useMemo(() => calculateWorkedMinutes(entries, now), [entries, now]);

  return (
    <section>
      <div className="mb-6">
        <p className="text-sm text-slate-500">Mi jornada</p>
        <h2 className="text-2xl font-semibold">{session?.fullName}</h2>
      </div>

      {error && <p className={`${errorCls} mb-4`}>{error}</p>}

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Estado</p>
          <p className="mt-2 text-2xl font-semibold">
            {status?.state === "OUT" && "Fuera de trabajo"}
            {status?.state === "WORKING" && "Trabajando"}
            {status?.state === "ON_BREAK" && "En pausa"}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Hoy</p>
          <p className="mt-2 text-2xl font-semibold">{formatMinutes(workedMinutes)}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Última acción</p>
          <p className="mt-2 text-lg">
            {status?.lastEntryAt ? formatDateTime(status.lastEntryAt) : "Sin registros"}
          </p>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        {status?.allowedActions.includes("CLOCK_IN") && (
          <button className={btnPrimary} disabled={busy} onClick={() => doAction("CLOCK_IN")}>
            Fichar entrada
          </button>
        )}

        {status?.allowedActions.includes("BREAK_START") && (
          <button className={btnPrimary} disabled={busy} onClick={() => doAction("BREAK_START")}>
            Inicio de pausa
          </button>
        )}

        {status?.allowedActions.includes("BREAK_END") && (
          <button className={btnPrimary} disabled={busy} onClick={() => doAction("BREAK_END")}>
            Fin de pausa
          </button>
        )}

        {status?.allowedActions.includes("CLOCK_OUT") && (
          <button className={btnGhost} disabled={busy} onClick={() => doAction("CLOCK_OUT")}>
            Fichar salida
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="font-semibold">Últimos fichajes de hoy</h2>
        </div>

        {entries.length === 0 ? (
          <p className="p-4 text-slate-500">Todavía no hay fichajes para hoy.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Hora</th>
                <th className="px-4 py-3">Origen</th>
              </tr>
            </thead>
            <tbody>
              {entries
                .slice()
                .reverse()
                .map((entry) => (
                  <tr key={entry.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">{TYPE_LABEL[entry.type] ?? entry.type}</td>
                    <td className="px-4 py-3">{formatDateTime(entry.occurredAt)}</td>
                    <td className="px-4 py-3">{SOURCE_LABEL[entry.source] ?? entry.source}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}