"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { History, Pencil, Plus, Trash2 } from "lucide-react";
import Avatar from "@/components/Avatar";
import IconButton from "@/components/IconButton";
import Modal from "@/components/Modal";
import PageHeader from "@/components/PageHeader";
import { api } from "@/lib/api";
import { formatDateTime, toLocalInput } from "@/lib/dates";
import { errorMessage } from "@/lib/errors";
import { btnGhost, btnPrimary, errorCls, inputCls, labelCls, surfaceCls } from "@/lib/ui";
import { AdminEntry, AuditRow, EntryType, SOURCE_LABEL, TYPE_LABEL, UserRow } from "@/lib/types";

type ModalState =
  | { kind: "create" }
  | { kind: "edit"; entry: AdminEntry }
  | { kind: "delete"; entry: AdminEntry }
  | { kind: "audit"; entry: AdminEntry }
  | null;

type RangeKind = "today" | "yesterday" | "week" | "month";

const TYPES: EntryType[] = ["CLOCK_IN", "BREAK_START", "BREAK_END", "CLOCK_OUT"];

const TYPE_CHIP: Record<EntryType, string> = {
  CLOCK_IN: "bg-brand-soft text-brand-ink",
  BREAK_END: "bg-brand-soft text-brand-ink",
  BREAK_START: "bg-pause-soft text-pause-ink",
  CLOCK_OUT: "bg-slate-100 text-slate-700",
};

const REASON_SUGGESTIONS = [
  "El empleado olvidó fichar",
  "Error al fichar",
  "Corrección acordada con el empleado",
];

const ROW_GRID = "md:grid-cols-[4rem_minmax(0,1.6fr)_10.5rem_8.5rem_7rem]";

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function rangeOf(kind: RangeKind): [string, string] {
  const now = new Date();
  const today = ymd(now);
  switch (kind) {
    case "today":
      return [today, today];
    case "yesterday": {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return [ymd(y), ymd(y)];
    }
    case "week": {
      const monday = new Date(now);
      monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
      return [ymd(monday), today];
    }
    case "month":
      return [`${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`, today];
  }
}

const RANGES: { kind: RangeKind; label: string }[] = [
  { kind: "today", label: "Hoy" },
  { kind: "yesterday", label: "Ayer" },
  { kind: "week", label: "Esta semana" },
  { kind: "month", label: "Este mes" },
];

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function longDay(key: string) {
  return capitalize(
    new Date(`${key}T12:00:00`).toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }),
  );
}

function shortDay(key: string) {
  return new Date(`${key}T12:00:00`).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

function clock(iso: string) {
  return new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export default function FichajesPage() {
  const [from, setFrom] = useState(() => rangeOf("today")[0]);
  const [to, setTo] = useState(() => rangeOf("today")[1]);
  const [userId, setUserId] = useState("");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [entries, setEntries] = useState<AdminEntry[] | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [modal, setModal] = useState<ModalState>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    const params = new URLSearchParams({ from, to });
    if (userId) params.set("userId", userId);
    api<AdminEntry[]>(`/api/admin/time-entries?${params}`)
      .then((data) => {
        if (!alive) return;
        setEntries(data);
        setError("");
      })
      .catch((e) => {
        if (alive) setError(errorMessage(e));
      });
    return () => {
      alive = false;
    };
  }, [from, to, userId, reloadKey]);

  useEffect(() => {
    api<UserRow[]>("/api/admin/users")
      .then(setUsers)
      .catch(() => {});
  }, []);

  function afterChange(message: string) {
    setModal(null);
    setNotice(message);
    setTimeout(() => setNotice(""), 4000);
    setReloadKey((k) => k + 1);
  }

  const groups = useMemo(() => {
    const map = new Map<string, AdminEntry[]>();
    for (const e of entries ?? []) {
      const d = new Date(e.occurredAt);
      const key = ymd(d);
      const list = map.get(key) ?? [];
      list.push(e);
      map.set(key, list);
    }
    return Array.from(map, ([key, items]) => ({ key, items }));
  }, [entries]);

  const description = from === to ? longDay(from) : `Del ${shortDay(from)} al ${shortDay(to)}`;

  return (
    <section>
      <PageHeader
        title="Fichajes"
        description={description}
        actions={
          <button className={btnPrimary} onClick={() => setModal({ kind: "create" })}>
            <Plus size={16} aria-hidden="true" />
            Añadir fichaje
          </button>
        }
      />

      {notice && (
        <p role="status" className="mb-4 rounded-lg border border-brand/20 bg-brand-soft px-3 py-2 text-sm text-brand-ink">
          {notice}
        </p>
      )}

      <div className={`${surfaceCls} mb-5 flex flex-wrap items-end gap-x-5 gap-y-4 p-4`}>
        <div role="group" aria-label="Rangos rápidos" className="flex gap-1 rounded-lg bg-slate-100 p-1">
          {RANGES.map((r) => {
            const [f, t] = rangeOf(r.kind);
            const active = f === from && t === to;
            return (
              <button
                key={r.kind}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setFrom(f);
                  setTo(t);
                }}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  active ? "bg-white text-ink shadow-sm" : "text-slate-600 hover:text-ink"
                }`}
              >
                {r.label}
              </button>
            );
          })}
        </div>

        <label className="text-sm font-medium text-slate-700">
          Desde
          <input type="date" className={inputCls} value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Hasta
          <input type="date" className={inputCls} value={to} min={from} onChange={(e) => setTo(e.target.value)} />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Empleado
          <select className={inputCls} value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="">Todos</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName}
                {u.active ? "" : " (de baja)"}
              </option>
            ))}
          </select>
        </label>

        {entries && (
          <p className="ml-auto text-sm text-slate-500">
            <span className="font-semibold tabular-nums text-ink">{entries.length}</span>{" "}
            {entries.length === 1 ? "fichaje" : "fichajes"}
          </p>
        )}
      </div>

      {error && <p className={`${errorCls} mb-4`}>{error}</p>}

      {!entries && !error && (
        <div className="space-y-3" aria-label="Cargando fichajes">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-200/60 motion-reduce:animate-none" />
          ))}
        </div>
      )}

      {entries && entries.length === 0 && (
        <div className={`${surfaceCls} p-10 text-center`}>
          <p className="font-medium">No hay fichajes en este rango.</p>
          <p className="mt-1 text-sm text-slate-500">
            Prueba con otro periodo, o añade uno a mano si alguien olvidó fichar.
          </p>
          <button className={`${btnGhost} mt-4`} onClick={() => setModal({ kind: "create" })}>
            <Plus size={16} aria-hidden="true" />
            Añadir fichaje
          </button>
        </div>
      )}

      {entries && entries.length > 0 && (
        <div className={surfaceCls}>
          <div
            aria-hidden="true"
            className={`hidden gap-x-4 border-b border-slate-100 px-4 py-2.5 text-xs font-medium text-slate-500 md:grid ${ROW_GRID}`}
          >
            <span>Hora</span>
            <span>Empleado</span>
            <span>Tipo</span>
            <span>Origen</span>
            <span className="w-28" />
          </div>

          {groups.map((g) => (
            <div key={g.key}>
              {groups.length > 1 && (
                <h2 className="border-b border-t border-slate-100 bg-slate-50 px-4 py-2 font-sans text-xs font-semibold uppercase tracking-wide text-slate-500 first:border-t-0">
                  {longDay(g.key)}
                </h2>
              )}
              <ul>
                {g.items.map((e) => (
                  <li
                    key={e.id}
                    className={`grid grid-cols-[3.25rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 md:gap-x-4 border-b border-slate-100 px-4 py-2.5 last:border-b-0 ${ROW_GRID}`}
                  >
                    <span className="text-sm font-medium tabular-nums">{clock(e.occurredAt)}</span>

                    <div className="flex min-w-0 items-center gap-2.5">
                      <Avatar name={e.userName} size="sm" />
                      <span className="truncate text-sm">{e.userName}</span>
                    </div>

                    <div className="order-last col-span-3 col-start-1 flex items-center gap-3 md:contents">
                      <span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_CHIP[e.type]}`}
                        >
                          {TYPE_LABEL[e.type]}
                        </span>
                      </span>
                      <span>
                        {e.source === "ADMIN" ? (
                          <span className="rounded-full bg-pause-soft px-2.5 py-0.5 text-xs font-medium text-pause-ink">
                            Añadido a mano
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">{SOURCE_LABEL[e.source]}</span>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-end">
                      <IconButton
                        label="Editar fichaje"
                        icon={Pencil}
                        onClick={() => setModal({ kind: "edit", entry: e })}
                      />
                      <IconButton
                        label="Ver historial de cambios"
                        icon={History}
                        onClick={() => setModal({ kind: "audit", entry: e })}
                      />
                      <IconButton
                        label="Borrar fichaje"
                        icon={Trash2}
                        tone="danger"
                        onClick={() => setModal({ kind: "delete", entry: e })}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {modal?.kind === "create" && (
        <Modal title="Añadir fichaje" onClose={() => setModal(null)}>
          <EntryForm
            users={users}
            onDone={() => afterChange("Fichaje añadido y registrado en el historial.")}
            onCancel={() => setModal(null)}
          />
        </Modal>
      )}
      {modal?.kind === "edit" && (
        <Modal title="Editar fichaje" onClose={() => setModal(null)}>
          <EntryForm
            users={users}
            entry={modal.entry}
            onDone={() => afterChange("Fichaje modificado. El cambio queda en el historial.")}
            onCancel={() => setModal(null)}
          />
        </Modal>
      )}
      {modal?.kind === "delete" && (
        <Modal title="Borrar fichaje" onClose={() => setModal(null)}>
          <DeleteForm
            entry={modal.entry}
            onDone={() => afterChange("Fichaje borrado. Sigue visible en el historial de cambios.")}
            onCancel={() => setModal(null)}
          />
        </Modal>
      )}
      {modal?.kind === "audit" && (
        <Modal title="Historial de cambios" wide onClose={() => setModal(null)}>
          <AuditList entry={modal.entry} />
        </Modal>
      )}
    </section>
  );
}

function EntryForm({
  users,
  entry,
  onDone,
  onCancel,
}: {
  users: UserRow[];
  entry?: AdminEntry;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [userId, setUserId] = useState("");
  const [type, setType] = useState<EntryType>(entry?.type ?? "CLOCK_IN");
  const [when, setWhen] = useState(toLocalInput(entry?.occurredAt ?? new Date().toISOString()));
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (reason.trim().length < 5) {
      setError("El motivo debe tener al menos 5 caracteres.");
      return;
    }
    if (!entry && !userId) {
      setError("Selecciona un empleado.");
      return;
    }

    setBusy(true);
    try {
      const body = {
        type,
        occurredAt: new Date(when).toISOString(),
        reason: reason.trim(),
      };
      if (entry) {
        await api(`/api/admin/time-entries/${entry.id}`, { method: "PUT", body: JSON.stringify(body) });
      } else {
        await api("/api/admin/time-entries", {
          method: "POST",
          body: JSON.stringify({ ...body, userId: Number(userId) }),
        });
      }
      onDone();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {entry ? (
        <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2.5">
          <Avatar name={entry.userName} />
          <div className="text-sm">
            <p className="font-medium">{entry.userName}</p>
            <p className="text-slate-500">
              Ahora: {TYPE_LABEL[entry.type]}, {formatDateTime(entry.occurredAt)}
            </p>
          </div>
        </div>
      ) : (
        <label className={labelCls}>
          Empleado
          <select className={inputCls} value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="">Selecciona...</option>
            {users
              .filter((u) => u.active)
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName}
                </option>
              ))}
          </select>
        </label>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelCls}>
          Tipo
          <select className={inputCls} value={type} onChange={(e) => setType(e.target.value as EntryType)}>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </label>

        <label className={labelCls}>
          Fecha y hora
          <input
            type="datetime-local"
            className={inputCls}
            required
            value={when}
            onChange={(e) => setWhen(e.target.value)}
          />
        </label>
      </div>

      <div>
        <label htmlFor="entry-reason" className={labelCls}>
          Motivo del cambio (obligatorio)
        </label>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {REASON_SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setReason(s)}
              className="rounded-full border border-slate-300 px-2.5 py-1 text-xs text-slate-600 transition hover:border-brand hover:text-brand-ink"
            >
              {s}
            </button>
          ))}
        </div>
        <textarea
          id="entry-reason"
          className={inputCls}
          rows={3}
          maxLength={500}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Queda guardado junto al cambio, para cualquier inspección."
        />
      </div>

      {error && (
        <p role="alert" className={errorCls}>
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" className={btnGhost} onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className={btnPrimary} disabled={busy}>
          {busy ? "Guardando..." : entry ? "Guardar cambios" : "Añadir fichaje"}
        </button>
      </div>
    </form>
  );
}

function DeleteForm({
  entry,
  onDone,
  onCancel,
}: {
  entry: AdminEntry;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (reason.trim().length < 5) {
      setError("El motivo debe tener al menos 5 caracteres.");
      return;
    }
    setBusy(true);
    try {
      await api(`/api/admin/time-entries/${entry.id}`, {
        method: "DELETE",
        body: JSON.stringify({ reason: reason.trim() }),
      });
      onDone();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="rounded-lg bg-slate-50 px-3 py-2.5 text-sm">
        <p className="font-medium">{entry.userName}</p>
        <p className="text-slate-500">
          {TYPE_LABEL[entry.type]}, {formatDateTime(entry.occurredAt)}
        </p>
      </div>
      <p className="text-sm text-slate-600">
        El fichaje dejará de contar en los informes, pero queda registrado en el historial de cambios.
      </p>

      <div>
        <label htmlFor="delete-reason" className={labelCls}>
          Motivo (obligatorio)
        </label>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {["Fichaje duplicado", "Fichaje por error", "Fichaje de prueba"].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setReason(s)}
              className="rounded-full border border-slate-300 px-2.5 py-1 text-xs text-slate-600 transition hover:border-brand hover:text-brand-ink"
            >
              {s}
            </button>
          ))}
        </div>
        <textarea
          id="delete-reason"
          className={inputCls}
          rows={3}
          maxLength={500}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>

      {error && (
        <p role="alert" className={errorCls}>
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" className={btnGhost} onClick={onCancel}>
          Cancelar
        </button>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-alert px-4 py-2 text-sm font-medium text-white transition hover:bg-[#9c2e10] disabled:opacity-50"
        >
          {busy ? "Borrando..." : "Borrar fichaje"}
        </button>
      </div>
    </form>
  );
}

const ACTION_UI = {
  CREATE: { label: "Creado", icon: Plus, tone: "bg-brand-soft text-brand-ink" },
  UPDATE: { label: "Modificado", icon: Pencil, tone: "bg-pause-soft text-pause-ink" },
  DELETE: { label: "Borrado", icon: Trash2, tone: "bg-alert-soft text-alert" },
} as const;

// El servidor guarda el estado del fichaje como JSON; lo convertimos en una frase legible.
function describe(raw: string | null): string {
  if (!raw) return "—";
  try {
    let value: unknown = JSON.parse(raw);
    if (typeof value === "string") value = JSON.parse(value);
    const s = value as { type: EntryType; occurredAt: string; deleted?: boolean };
    return `${TYPE_LABEL[s.type] ?? s.type}, ${formatDateTime(s.occurredAt)}${s.deleted ? " (borrado)" : ""}`;
  } catch {
    return raw;
  }
}

function AuditList({ entry }: { entry: AdminEntry }) {
  const [rows, setRows] = useState<AuditRow[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<AuditRow[]>(`/api/admin/time-entries/${entry.id}/audit`)
      .then(setRows)
      .catch((e) => setError(errorMessage(e)));
  }, [entry.id]);

  return (
    <div>
      <div className="mb-4 flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2.5">
        <Avatar name={entry.userName} />
        <div className="text-sm">
          <p className="font-medium">{entry.userName}</p>
          <p className="text-slate-500">
            {TYPE_LABEL[entry.type]}, {formatDateTime(entry.occurredAt)}
          </p>
        </div>
      </div>

      {error && <p className={errorCls}>{error}</p>}
      {!rows && !error && <p className="text-sm text-slate-500">Cargando...</p>}
      {rows && rows.length === 0 && (
        <p className="text-sm text-slate-500">
          Este fichaje no se ha modificado: es el registro original del empleado.
        </p>
      )}

      {rows && rows.length > 0 && (
        <ol className="space-y-4">
          {rows.map((r) => {
            const ui = ACTION_UI[r.action];
            const Icon = ui.icon;
            return (
              <li key={r.id} className="flex gap-3">
                <span
                  aria-hidden="true"
                  className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ${ui.tone}`}
                >
                  <Icon size={15} />
                </span>
                <div className="min-w-0 text-sm">
                  <p className="font-medium">
                    {ui.label} por {r.changedByName}
                  </p>
                  <p className="text-xs text-slate-500">{formatDateTime(r.changedAt)}</p>
                  {r.action !== "CREATE" && (
                    <p className="mt-2">
                      <span className="text-slate-500">Antes:</span> {describe(r.oldValue)}
                    </p>
                  )}
                  <p className={r.action === "CREATE" ? "mt-2" : ""}>
                    <span className="text-slate-500">Después:</span> {describe(r.newValue)}
                  </p>
                  <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-slate-700">
                    <span className="text-slate-500">Motivo:</span> {r.reason}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}