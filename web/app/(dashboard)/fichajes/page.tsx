"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Modal from "@/components/Modal";
import { api } from "@/lib/api";
import { formatDateTime, toLocalInput, todayStr } from "@/lib/dates";
import { errorMessage } from "@/lib/errors";
import { btnGhost, btnLink, btnPrimary, errorCls, inputCls, labelCls } from "@/lib/ui";
import {
  AdminEntry,
  AuditRow,
  EntryType,
  SOURCE_LABEL,
  TYPE_LABEL,
  UserRow,
} from "@/lib/types";

type ModalState =
  | { kind: "create" }
  | { kind: "edit"; entry: AdminEntry }
  | { kind: "delete"; entry: AdminEntry }
  | { kind: "audit"; entry: AdminEntry }
  | null;

const TYPES: EntryType[] = ["CLOCK_IN", "BREAK_START", "BREAK_END", "CLOCK_OUT"];

export default function FichajesPage() {
  const [from, setFrom] = useState(todayStr());
  const [to, setTo] = useState(todayStr());
  const [userId, setUserId] = useState("");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [entries, setEntries] = useState<AdminEntry[] | null>(null);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<ModalState>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ from, to });
    if (userId) params.set("userId", userId);
    try {
      const data = await api<AdminEntry[]>(`/api/admin/time-entries?${params}`);
      setEntries(data);
      setError("");
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [from, to, userId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api<UserRow[]>("/api/admin/users")
      .then(setUsers)
      .catch(() => {});
  }, []);

  function closeAndReload() {
    setModal(null);
    load();
  }

  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Fichajes</h1>
        <button className={btnPrimary} onClick={() => setModal({ kind: "create" })}>
          Añadir fichaje
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-4">
        <label className="text-sm font-medium">
          Desde
          <input type="date" className={inputCls} value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="text-sm font-medium">
          Hasta
          <input type="date" className={inputCls} value={to} min={from} onChange={(e) => setTo(e.target.value)} />
        </label>
        <label className="text-sm font-medium">
          Empleado
          <select className={inputCls} value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="">Todos</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <p className={`${errorCls} mb-4`}>{error}</p>}
      {!entries && !error && <p className="text-slate-500">Cargando...</p>}
      {entries && entries.length === 0 && (
        <p className="text-slate-500">No hay fichajes en este rango.</p>
      )}

      {entries && entries.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Fecha y hora</th>
                <th className="px-4 py-3 font-medium">Empleado</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Origen</th>
                <th className="px-4 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 tabular-nums">{formatDateTime(e.occurredAt)}</td>
                  <td className="px-4 py-3">{e.userName}</td>
                  <td className="px-4 py-3">{TYPE_LABEL[e.type]}</td>
                  <td className="px-4 py-3">{SOURCE_LABEL[e.source]}</td>
                  <td className="space-x-3 px-4 py-3">
                    <button className={btnLink} onClick={() => setModal({ kind: "edit", entry: e })}>
                      Editar
                    </button>
                    <button className={btnLink} onClick={() => setModal({ kind: "delete", entry: e })}>
                      Borrar
                    </button>
                    <button className={btnLink} onClick={() => setModal({ kind: "audit", entry: e })}>
                      Historial
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal?.kind === "create" && (
        <Modal title="Añadir fichaje" onClose={() => setModal(null)}>
          <EntryForm users={users} onDone={closeAndReload} onCancel={() => setModal(null)} />
        </Modal>
      )}
      {modal?.kind === "edit" && (
        <Modal title="Editar fichaje" onClose={() => setModal(null)}>
          <EntryForm
            users={users}
            entry={modal.entry}
            onDone={closeAndReload}
            onCancel={() => setModal(null)}
          />
        </Modal>
      )}
      {modal?.kind === "delete" && (
        <Modal title="Borrar fichaje" onClose={() => setModal(null)}>
          <DeleteForm entry={modal.entry} onDone={closeAndReload} onCancel={() => setModal(null)} />
        </Modal>
      )}
      {modal?.kind === "audit" && (
        <Modal title="Historial de cambios" onClose={() => setModal(null)}>
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
        await api(`/api/admin/time-entries/${entry.id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
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
    <form onSubmit={submit} className="space-y-3">
      {entry ? (
        <p className="text-sm text-slate-500">
          Empleado: <span className="font-medium text-slate-900">{entry.userName}</span>
        </p>
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

      <label className={labelCls}>
        Motivo del cambio (obligatorio)
        <textarea
          className={inputCls}
          rows={3}
          maxLength={500}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ej.: el empleado olvidó fichar al llegar"
        />
      </label>

      {error && <p role="alert" className={errorCls}>{error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className={btnGhost} onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className={btnPrimary} disabled={busy}>
          {busy ? "Guardando..." : "Guardar"}
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
    <form onSubmit={submit} className="space-y-3">
      <p className="text-sm">
        Vas a borrar el fichaje de <strong>{entry.userName}</strong>:{" "}
        {TYPE_LABEL[entry.type]} del {formatDateTime(entry.occurredAt)}. Quedará registrado en el
        historial de cambios.
      </p>

      <label className={labelCls}>
        Motivo (obligatorio)
        <textarea
          className={inputCls}
          rows={3}
          maxLength={500}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>

      {error && <p role="alert" className={errorCls}>{error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className={btnGhost} onClick={onCancel}>
          Cancelar
        </button>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {busy ? "Borrando..." : "Borrar fichaje"}
        </button>
      </div>
    </form>
  );
}

const ACTION_LABEL = { CREATE: "Creado", UPDATE: "Modificado", DELETE: "Borrado" } as const;

// El servidor guarda el estado del fichaje como JSON; lo convertimos en una frase legible.
function describe(raw: string | null): string {
  if (!raw) return "—";
  try {
    let value: unknown = JSON.parse(raw);
    if (typeof value === "string") value = JSON.parse(value);
    const s = value as { type: EntryType; occurredAt: string; deleted?: boolean };
    return `${TYPE_LABEL[s.type] ?? s.type} · ${formatDateTime(s.occurredAt)}${
      s.deleted ? " (borrado)" : ""
    }`;
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

  if (error) return <p className={errorCls}>{error}</p>;
  if (!rows) return <p className="text-slate-500">Cargando...</p>;
  if (rows.length === 0) {
    return <p className="text-sm text-slate-500">Este fichaje no tiene cambios registrados.</p>;
  }

  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.id} className="rounded-lg border border-slate-200 p-3 text-sm">
          <p className="font-medium">
            {ACTION_LABEL[r.action]} por {r.changedByName}
          </p>
          <p className="text-xs text-slate-500">{formatDateTime(r.changedAt)}</p>
          <p className="mt-2">
            <span className="text-slate-500">Antes:</span> {describe(r.oldValue)}
          </p>
          <p>
            <span className="text-slate-500">Después:</span> {describe(r.newValue)}
          </p>
          <p className="mt-2">
            <span className="text-slate-500">Motivo:</span> {r.reason}
          </p>
        </li>
      ))}
    </ul>
  );
}