"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Pencil, RefreshCw, Search, UserCheck, UserPlus, UserX } from "lucide-react";
import Avatar from "@/components/Avatar";
import IconButton from "@/components/IconButton";
import Modal from "@/components/Modal";
import PageHeader from "@/components/PageHeader";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { errorMessage } from "@/lib/errors";
import { ROLE_LABEL, RoleName, UserRow } from "@/lib/types";
import { btnGhost, btnPrimary, errorCls, inputCls, labelCls, surfaceCls } from "@/lib/ui";

type ModalState =
  | { kind: "create" }
  | { kind: "edit"; user: UserRow }
  | { kind: "deactivate"; user: UserRow }
  | null;

type Filter = "all" | "active" | "inactive";

const ROW_GRID = "md:grid-cols-[minmax(0,2.4fr)_8.5rem_minmax(0,1.4fr)_8rem_11rem]";

const normalize = (s: string) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(`${iso}T12:00:00`).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = new Uint32Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (n) => chars[n % chars.length]).join("");
}

export default function UsuariosPage() {
  const { session } = useAuth();
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [modal, setModal] = useState<ModalState>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    api<UserRow[]>("/api/admin/users")
      .then((data) => {
        if (!alive) return;
        setUsers(data);
        setError("");
      })
      .catch((e) => {
        if (alive) setError(errorMessage(e));
      });
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  function reload() {
    setReloadKey((k) => k + 1);
  }

  function showNotice(text: string) {
    setNotice(text);
    setTimeout(() => setNotice(""), 4000);
  }

  async function setActive(u: UserRow, active: boolean) {
    try {
      await api(`/api/admin/users/${u.id}/${active ? "activate" : "deactivate"}`, { method: "PATCH" });
      setModal(null);
      showNotice(active ? `${u.fullName} vuelve a estar activo.` : `${u.fullName} ya está de baja.`);
      reload();
    } catch (e) {
      setModal(null);
      setError(errorMessage(e));
    }
  }

  const counts = useMemo(
    () => ({
      all: users?.length ?? 0,
      active: users?.filter((u) => u.active).length ?? 0,
      inactive: users?.filter((u) => !u.active).length ?? 0,
    }),
    [users],
  );

  const visible = useMemo(() => {
    if (!users) return [];
    const q = normalize(query.trim());
    return users
      .filter((u) => (filter === "all" ? true : filter === "active" ? u.active : !u.active))
      .filter(
        (u) =>
          !q || normalize(`${u.fullName} ${u.email} ${u.jobTitle ?? ""}`).includes(q),
      )
      .sort((a, b) => Number(b.active) - Number(a.active));
  }, [users, query, filter]);

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "all", label: "Todos" },
    { key: "active", label: "Activos" },
    { key: "inactive", label: "De baja" },
  ];

  return (
    <section>
      <PageHeader
        title="Usuarios"
        description={
          users ? `${counts.active} ${counts.active === 1 ? "activo" : "activos"}, ${counts.inactive} de baja` : undefined
        }
        actions={
          <button className={btnPrimary} onClick={() => setModal({ kind: "create" })}>
            <UserPlus size={16} aria-hidden="true" />
            Nuevo usuario
          </button>
        }
      />

      {notice && (
        <p role="status" className="mb-4 rounded-lg border border-brand/20 bg-brand-soft px-3 py-2 text-sm text-brand-ink">
          {notice}
        </p>
      )}
      {error && <p className={`${errorCls} mb-4`}>{error}</p>}

      {!users && !error && (
        <div className="space-y-3" aria-label="Cargando usuarios">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-200/60 motion-reduce:animate-none" />
          ))}
        </div>
      )}

      {users && (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-full sm:max-w-xs">
              <Search
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nombre, email o puesto"
                aria-label="Buscar usuarios"
                className={`${inputCls} mt-0 pl-9`}
              />
            </div>

            <div role="group" aria-label="Filtrar por estado" className="flex gap-1 rounded-lg bg-slate-100 p-1">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  aria-pressed={filter === f.key}
                  onClick={() => setFilter(f.key)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    filter === f.key ? "bg-white text-ink shadow-sm" : "text-slate-600 hover:text-ink"
                  }`}
                >
                  {f.label} <span className="tabular-nums text-slate-400">{counts[f.key]}</span>
                </button>
              ))}
            </div>
          </div>

          {users.length === 0 ? (
            <div className={`${surfaceCls} p-10 text-center`}>
              <p className="font-medium">Todavía no hay usuarios.</p>
              <p className="mt-1 text-sm text-slate-500">Crea el primero para que pueda empezar a fichar.</p>
              <button className={`${btnPrimary} mt-4`} onClick={() => setModal({ kind: "create" })}>
                <UserPlus size={16} aria-hidden="true" />
                Nuevo usuario
              </button>
            </div>
          ) : visible.length === 0 ? (
            <div className={`${surfaceCls} p-10 text-center`}>
              <p className="font-medium">Ningún usuario coincide con tu búsqueda.</p>
              <button
                className={`${btnGhost} mt-4`}
                onClick={() => {
                  setQuery("");
                  setFilter("all");
                }}
              >
                Quitar filtros
              </button>
            </div>
          ) : (
            <div className={surfaceCls}>
              <div
                aria-hidden="true"
                className={`hidden gap-x-4 border-b border-slate-100 px-4 py-2.5 text-xs font-medium text-slate-500 md:grid ${ROW_GRID}`}
              >
                <span>Nombre</span>
                <span>Rol</span>
                <span>Puesto</span>
                <span>Alta</span>
                <span className="w-24" />
              </div>

              <ul>
                {visible.map((u) => {
                  const isSelf = u.id === session?.userId;
                  return (
                    <li
                      key={u.id}
                      className={`grid gap-x-4 gap-y-2 border-t border-slate-100 px-4 py-3 first:border-t-0 md:items-center ${ROW_GRID} ${
                        u.active ? "" : "bg-slate-50/70"
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar name={u.fullName} />
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 text-sm font-medium">
                            <span className={`truncate ${u.active ? "" : "text-slate-500"}`}>{u.fullName}</span>
                            {isSelf && (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                                Tú
                              </span>
                            )}
                          </p>
                          <p className="truncate text-xs text-slate-500">{u.email}</p>
                          {u.jobTitle && <p className="text-xs text-slate-500 md:hidden">{u.jobTitle}</p>}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3 md:contents">
                        <div>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              u.role === "ADMIN"
                                ? "bg-brand-soft text-brand-ink"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {ROLE_LABEL[u.role]}
                          </span>
                        </div>

                        <div className="hidden min-w-0 text-sm md:block">
                          <p className="truncate">{u.jobTitle ?? "—"}</p>
                          {u.phone && <p className="truncate text-xs text-slate-500">{u.phone}</p>}
                        </div>

                        <div className="hidden text-sm text-slate-600 md:block">
                          {u.active ? formatDate(u.hiredAt) : `Baja ${formatDate(u.terminatedAt)}`}
                        </div>

                        <div className="flex items-center justify-end gap-1">
                          <span
                            className={`mr-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              u.active ? "bg-brand-soft text-brand-ink" : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {u.active ? "Activo" : "De baja"}
                          </span>
                          <IconButton
                            label={`Editar a ${u.fullName}`}
                            icon={Pencil}
                            onClick={() => setModal({ kind: "edit", user: u })}
                          />
                          {!isSelf &&
                            (u.active ? (
                              <IconButton
                                label={`Dar de baja a ${u.fullName}`}
                                icon={UserX}
                                tone="danger"
                                onClick={() => setModal({ kind: "deactivate", user: u })}
                              />
                            ) : (
                              <IconButton
                                label={`Reactivar a ${u.fullName}`}
                                icon={UserCheck}
                                onClick={() => void setActive(u, true)}
                              />
                            ))}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </>
      )}

      {modal?.kind === "create" && (
        <Modal title="Nuevo usuario" onClose={() => setModal(null)}>
          <UserForm
            onDone={() => {
              setModal(null);
              showNotice("Usuario creado. Ya puede iniciar sesión.");
              reload();
            }}
            onCancel={() => setModal(null)}
          />
        </Modal>
      )}

      {modal?.kind === "edit" && (
        <Modal title="Editar usuario" onClose={() => setModal(null)}>
          <UserForm
            user={modal.user}
            onDone={() => {
              setModal(null);
              showNotice("Cambios guardados.");
              reload();
            }}
            onCancel={() => setModal(null)}
          />
        </Modal>
      )}

      {modal?.kind === "deactivate" && (
        <Modal title="Dar de baja" onClose={() => setModal(null)}>
          <p className="text-sm text-slate-600">
            <strong className="text-ink">{modal.user.fullName}</strong> dejará de poder iniciar sesión y
            fichar. Sus fichajes anteriores se conservan, y podrás reactivarlo cuando quieras.
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" className={btnGhost} onClick={() => setModal(null)}>
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void setActive(modal.user, false)}
              className="rounded-lg bg-alert px-4 py-2 text-sm font-medium text-white transition hover:bg-[#9c2e10]"
            >
              Dar de baja
            </button>
          </div>
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
  const [showPassword, setShowPassword] = useState(false);
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
        await api(`/api/admin/users/${user.id}`, { method: "PUT", body: JSON.stringify(common) });
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
    <form onSubmit={submit} className="space-y-4">
      <label className={labelCls}>
        Nombre completo
        <input className={inputCls} required value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </label>

      <label className={labelCls}>
        Email
        <input
          type="email"
          className={`${inputCls} disabled:bg-slate-100 disabled:text-slate-500`}
          required
          disabled={!!user}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>

      {!user && (
        <div>
          <label htmlFor="new-user-password" className={labelCls}>
            Contraseña inicial
          </label>
          <div className="mt-1 flex gap-2">
            <div className="relative flex-1">
              <input
                id="new-user-password"
                type={showPassword ? "text" : "password"}
                className={`${inputCls} mt-0 pr-10`}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-ink"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <button
              type="button"
              className={btnGhost}
              onClick={() => {
                setPassword(generatePassword());
                setShowPassword(true);
              }}
            >
              <RefreshCw size={15} aria-hidden="true" />
              Generar
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Mínimo 8 caracteres. Cópiala y pásasela al empleado: después no se puede volver a ver.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelCls}>
          Rol
          <select className={inputCls} value={role} onChange={(e) => setRole(e.target.value as RoleName)}>
            <option value="EMPLOYEE">Empleado</option>
            <option value="ADMIN">Administrador</option>
          </select>
        </label>

        <label className={labelCls}>
          Fecha de alta
          <input type="date" className={inputCls} value={hiredAt} onChange={(e) => setHiredAt(e.target.value)} />
        </label>

        <label className={labelCls}>
          Puesto
          <input className={inputCls} value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
        </label>

        <label className={labelCls}>
          Teléfono
          <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
      </div>

      {error && (
        <p role="alert" className={errorCls}>
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className={btnGhost} onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className={btnPrimary} disabled={busy}>
          {busy ? "Guardando..." : user ? "Guardar cambios" : "Crear usuario"}
        </button>
      </div>
    </form>
  );
}