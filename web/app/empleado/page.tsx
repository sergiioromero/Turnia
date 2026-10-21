"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { btnGhost, btnPrimary, errorCls } from "@/lib/ui";

type StatusResponse = {
  state: "OUT" | "WORKING" | "ON_BREAK";
  allowedActions: string[];
  lastEntryAt: string | null;
};

type EntryRow = {
  id: number;
  type: string;
  occurredAt: string;
  source: string;
};

const TYPE_LABEL: Record<string, string> = {
  CLOCK_IN: "Entrada",
  BREAK_START: "Inicio de pausa",
  BREAK_END: "Fin de pausa",
  CLOCK_OUT: "Salida",
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

function todayStr() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function getTodayEntries(entries: EntryRow[]) {
  const today = todayStr();
  return entries.filter((e) => e.occurredAt.startsWith(today));
}

function calculateWorkedMinutesToday(entries: EntryRow[]) {
  const todayEntries = [...entries]
    .filter((e) => e.occurredAt.startsWith(todayStr()))
    .sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());

  let workStart: Date | null = null;
  let totalMinutes = 0;

  for (const entry of todayEntries) {
    const time = new Date(entry.occurredAt);

    switch (entry.type) {
      case "CLOCK_IN":
        if (workStart === null) {
          workStart = time;
        }
        break;

      case "BREAK_START":
        if (workStart) {
          totalMinutes += Math.max(0, (time.getTime() - workStart.getTime()) / 60000);
          workStart = null;
        }
        break;

      case "BREAK_END":
        if (workStart === null) {
          workStart = time;
        }
        break;

      case "CLOCK_OUT":
        if (workStart) {
          totalMinutes += Math.max(0, (time.getTime() - workStart.getTime()) / 60000);
          workStart = null;
        }
        break;
    }
  }

  return Math.round(totalMinutes);
}

export default function EmpleadoPage() {
  const { session } = useAuth();
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

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
      setError(e instanceof Error ? e.message : "Error al cargar");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function doAction(type: string) {
    setBusy(true);
    setError("");
    try {
      await api("/api/time-entries", {
        method: "POST",
        body: JSON.stringify({ type, source: "WEB" }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo registrar");
    } finally {
      setBusy(false);
    }
  }

  const todayEntries = useMemo(() => getTodayEntries(entries), [entries]);
  const workedMinutes = useMemo(() => calculateWorkedMinutesToday(entries), [entries]);

  return (
    <section>
      <div className="mb-6">
        <p className="text-sm text-slate-500">Empleado</p>
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

        {todayEntries.length === 0 ? (
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
              {todayEntries
                .slice()
                .reverse()
                .map((entry) => (
                  <tr key={entry.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">{TYPE_LABEL[entry.type] ?? entry.type}</td>
                    <td className="px-4 py-3">{formatDateTime(entry.occurredAt)}</td>
                    <td className="px-4 py-3">{entry.source}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}