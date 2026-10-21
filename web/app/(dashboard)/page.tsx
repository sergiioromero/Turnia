"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type AdminEntry = {
  id: number;
  userId: number;
  userName: string;
  type: "CLOCK_IN" | "BREAK_START" | "BREAK_END" | "CLOCK_OUT";
  occurredAt: string;
  source: "MOBILE" | "WEB" | "ADMIN";
};

const TYPE_LABEL: Record<AdminEntry["type"], string> = {
  CLOCK_IN: "Entrada",
  BREAK_START: "Inicio de pausa",
  BREAK_END: "Fin de pausa",
  CLOCK_OUT: "Salida",
};

const SOURCE_LABEL: Record<AdminEntry["source"], string> = {
  MOBILE: "App",
  WEB: "Web",
  ADMIN: "Jefe",
};

export default function TodayPage() {
  const [entries, setEntries] = useState<AdminEntry[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<AdminEntry[]>("/api/admin/time-entries")
      .then(setEntries)
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <section>
      <h1 className="mb-6 text-2xl font-semibold">Fichajes de hoy</h1>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {!entries && !error && <p className="text-slate-500">Cargando...</p>}

      {entries && entries.length === 0 && (
        <p className="text-slate-500">Todavía no hay fichajes hoy.</p>
      )}

      {entries && entries.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Hora</th>
                <th className="px-4 py-3 font-medium">Empleado</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Origen</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 tabular-nums">
                    {new Date(e.occurredAt).toLocaleTimeString("es-ES", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3">{e.userName}</td>
                  <td className="px-4 py-3">{TYPE_LABEL[e.type]}</td>
                  <td className="px-4 py-3">{SOURCE_LABEL[e.source]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}