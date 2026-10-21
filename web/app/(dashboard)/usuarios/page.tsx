"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Modal from "@/components/Modal";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { errorMessage } from "@/lib/errors";
import { btnGhost, btnLink, btnPrimary, errorCls, inputCls, labelCls } from "@/lib/ui";
import { ROLE_LABEL, RoleName, UserRow } from "@/lib/types";

type ModalState = { kind: "create" } | { kind: "edit"; user: UserRow } | null;

export default function UsuariosPage() {
  const { session } = useAuth();
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<ModalState>(null);

  const load = useCallback(async () => {
    try {
      setUsers(await api<UserRow[]>("/api/admin/users"));
      setError("");
    } catch (e) {
      setError(errorMessage(e));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleActive(u: UserRow) {
    const text = u.active
      ? `¿Dar de baja a ${u.fullName}? Sus fichajes se conservan.`
      : `¿Reactivar a ${u.fullName}?`;
    if (!window.confirm(text)) return;
    try {
      await api(`/api/admin/users/${u.id}/${u.active ? "deactivate" : "activate"}`, {
        method: "PATCH",
      });
      await load();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  function closeAndReload() {
    setModal(null);
    load();
  }

  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Usuarios</h1>
        <button className={btnPrimary} onClick={() => setModal({ kind: "create" })}>
          Nuevo usuario
        </button>
      </div>

      {error && <p className={`${errorCls} mb-4`}>{error}</p>}
      {!users && !error && <p className="text-slate-500">Cargando...</p>}

      {users && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Rol</th>
                <th className="px-4 py-3 font-medium">Puesto</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium">{u.fullName}</td>
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3">{ROLE_LABEL[u.role]}</td>
                  <td className="px-4 py-3">{u.jobTitle ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.active ? "bg-green-100 text-green-800" : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {u.active ? "Activo" : "De baja"}
                    </span>
                  </td>
                  <td className="space-x-3 px-4 py-3">
                    <button className={btnLink} onClick={() => setModal({ kind: "edit", user: u })}>
                      Editar
                    </button>
                    {u.id !== session?.userId && (
                      <button className={btnLink} onClick={() => toggleActive(u)}>
                        {u.active ? "Dar de baja" : "Reactivar"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal
          title={modal.kind === "create" ? "Nuevo usuario" : "Editar usuario"}
          onClose={() => setModal(null)}
        >
          <UserForm
            user={modal.kind === "edit" ? modal.user : undefined}
            onDone={closeAndReload}
            onCancel={() => setModal(null)}
          />
        </Modal>
      )}
    </section>
  );
}

function UserForm({
  user,
  onDone,
  onCancel,
}: {
  user?: UserRow;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [role, setRole] = useState<RoleName>(user?.role ?? "EMPLOYEE");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [jobTitle, setJobTitle] = useState(user?.jobTitle ?? "");
  const [hiredAt, setHiredAt] = useState(user?.hiredAt ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const common = {
        fullName: fullName.trim(),
        role,
        phone: phone.trim() || null,
        jobTitle: jobTitle.trim() || null,
        hiredAt: hiredAt || null,
      };
      if (user) {
        await api(`/api/admin/users/${user.id}`, {
          method: "PUT",
          body: JSON.stringify(common),
        });
      } else {
        await api("/api/admin/users", {
          method: "POST",
          body: JSON.stringify({ ...common, email: email.trim(), password }),
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
      <label className={labelCls}>
        Nombre completo
        <input className={inputCls} required value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </label>

      <label className={labelCls}>
        Email
        <input
          type="email"
          className={`${inputCls} disabled:bg-slate-100`}
          required
          disabled={!!user}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>

      {!user && (
        <label className={labelCls}>
          Contraseña inicial (mínimo 8 caracteres)
          <input
            type="password"
            className={inputCls}
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
      )}

      <label className={labelCls}>
        Rol
        <select className={inputCls} value={role} onChange={(e) => setRole(e.target.value as RoleName)}>
          <option value="EMPLOYEE">Empleado</option>
          <option value="ADMIN">Administrador</option>
        </select>
      </label>

      <label className={labelCls}>
        Puesto
        <input className={inputCls} value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
      </label>

      <label className={labelCls}>
        Teléfono
        <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} />
      </label>

      <label className={labelCls}>
        Fecha de alta
        <input type="date" className={inputCls} value={hiredAt} onChange={(e) => setHiredAt(e.target.value)} />
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