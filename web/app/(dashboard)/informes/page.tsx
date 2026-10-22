"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { btnGhost, btnPrimary, errorCls, inputCls } from "@/lib/ui";
import type { MonthlyReportResponse } from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

function formatMinutes(totalMinutes: number) {
  const sign = totalMinutes < 0 ? "-" : "";
  const abs = Math.abs(totalMinutes);
  const hours = Math.floor(abs / 60);
  const minutes = abs % 60;
  return `${sign}${hours}:${String(minutes).padStart(2, "0")}`;
}

function formatHour(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatMonthLabel(month: string) {
  const [year, monthIndex] = month.split("-");
  const value = new Date(Number(year), Number(monthIndex) - 1, 1);
  return value.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
}

export default function InformesPage() {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [report, setReport] = useState<MonthlyReportResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api<MonthlyReportResponse>(`/api/admin/reports/monthly?month=${month}`);
      setReport(data);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  async function handleDownloadCsv() {
    try {
      const token = localStorage.getItem("fichajes_token");
      const response = await fetch(`${API_URL}/api/admin/reports/monthly.csv?month=${month}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message || body?.error || `Error ${response.status}`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `fichajes-${month}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  const summary = useMemo(() => {
    if (!report) return { employees: 0, totalMinutes: 0, incompleteDays: 0 };

    return report.employees.reduce(
      (acc, employee) => {
        acc.employees += 1;
        acc.totalMinutes += employee.workedMinutes;
        acc.incompleteDays += employee.incompleteDays;
        return acc;
      },
      { employees: 0, totalMinutes: 0, incompleteDays: 0 },
    );
  }, [report]);

  return (
    <section>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
                <h1 className="text-2xl font-semibold">Informes</h1>
                <p className="text-sm text-slate-500">
                {report ? `Resumen de ${formatMonthLabel(report.month)}` : "Cargando resumen..."}
                </p>
            </div>

            <div className="flex flex-wrap items-end gap-3">
                <label className="flex flex-col text-sm font-medium">
                Mes
                <input
                    type="month"
                    className={`${inputCls} mt-1`}
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                />
                </label>

                <button
                type="button"
                className={`${btnPrimary} self-end`}
                onClick={handleDownloadCsv}
                disabled={!report || loading}
                >
                Descargar CSV
                </button>
            </div>
        </div>

      {error && <p className={`${errorCls} mb-4`}>{error}</p>}

      {report && (
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Empleados</p>
            <p className="mt-2 text-2xl font-semibold">{summary.employees}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Horas totales</p>
            <p className="mt-2 text-2xl font-semibold">{formatMinutes(summary.totalMinutes)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Días incompletos</p>
            <p className="mt-2 text-2xl font-semibold">{summary.incompleteDays}</p>
          </div>
        </div>
      )}

      {!report && !error && <p className="text-slate-500">Cargando informe...</p>}

      {report && report.employees.length === 0 && (
        <p className="text-slate-500">No hay fichajes para este mes.</p>
      )}

      {report && report.employees.length > 0 && (
        <div className="space-y-4">
          {report.employees.map((employee) => (
            <div key={employee.userId} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
                <div>
                  <p className="font-semibold">{employee.fullName}</p>
                  <p className="text-xs text-slate-500">
                    {employee.active ? "Activo" : "De baja"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                  <span className="rounded-full bg-white px-2 py-1">{formatMinutes(employee.workedMinutes)} horas</span>
                  <span className="rounded-full bg-white px-2 py-1">{employee.daysWorked} días trabajados</span>
                  <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-800">
                    {employee.incompleteDays} días incompletos
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Fecha</th>
                      <th className="px-4 py-3 font-medium">Entrada</th>
                      <th className="px-4 py-3 font-medium">Salida</th>
                      <th className="px-4 py-3 font-medium">Horas</th>
                      <th className="px-4 py-3 font-medium">Incompleta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employee.days.map((day) => (
                      <tr
                        key={`${employee.userId}-${day.date}`}
                        className={day.incomplete ? "bg-amber-50/40" : "border-b border-slate-100 last:border-0"}
                      >
                        <td className="px-4 py-3">{formatDate(day.date)}</td>
                        <td className="px-4 py-3">{formatHour(day.firstIn)}</td>
                        <td className="px-4 py-3">{formatHour(day.lastOut)}</td>
                        <td className="px-4 py-3 tabular-nums">{formatMinutes(day.workedMinutes)}</td>
                        <td className="px-4 py-3">
                          {day.incomplete ? (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                              Sí
                            </span>
                          ) : (
                            <span className="text-slate-500">No</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4">
        <button type="button" className={btnGhost} onClick={() => {
            const n = new Date();
            setMonth(`${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`);
          }}>
          Mes actual
        </button>
      </div>
    </section>
  );
}