"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { errorMessage } from "@/lib/errors";
import { btnGhost, btnPrimary, errorCls, inputCls, labelCls } from "@/lib/ui";
import Logo from "@/components/Logo";

// Con NEXT_PUBLIC_DEMO_LOGIN=true se muestran accesos rápidos a las cuentas de demostración
const DEMO = process.env.NEXT_PUBLIC_DEMO_LOGIN === "true";
const DEMO_ACCOUNTS = [
  { label: "Entrar como administrador", email: "admin@demo.com", password: "Admin1234!" },
  { label: "Entrar como empleado", email: "empleado@demo.com", password: "Empleado1234!" },
];

// Jornadas de ejemplo para la ilustración del panel izquierdo (horas de 7 a 19)
const PREVIEW: { name: string; segs: [number, number, "work" | "pause"][] }[] = [
  { name: "Marta", segs: [[9, 13, "work"], [13, 13.75, "pause"], [13.75, 17, "work"]] },
  { name: "Luis", segs: [[8, 12, "work"], [12, 12.5, "pause"], [12.5, 15.5, "work"]] },
  { name: "Ana", segs: [[10, 18, "work"]] },
];
const P_START = 7;
const P_SPAN = 12;

export default function LoginPage() {
  const { session, loading, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && session) {
      router.replace(session.role === "ADMIN" ? "/" : "/empleado");
    }
  }, [loading, session, router]);

  async function signIn(emailValue: string, passwordValue: string) {
    setError("");
    setSubmitting(true);
    try {
      await login(emailValue.trim(), passwordValue);
      const raw = localStorage.getItem("fichajes_session");
      const next = raw ? JSON.parse(raw) : null;
      router.replace(next?.role === "ADMIN" ? "/" : "/empleado");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void signIn(email, password);
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* Panel de marca */}
      <section className="hidden flex-col justify-between bg-ink p-12 text-white lg:flex">
        <Logo tone="light" />

        <div>
          <div className="mb-12 max-w-md space-y-4" aria-hidden="true">
            {PREVIEW.map((row) => (
              <div key={row.name} className="grid grid-cols-[3.5rem_1fr] items-center gap-3">
                <span className="text-sm text-slate-300">{row.name}</span>
                <div className="relative h-4 rounded-full bg-white/5">
                  {row.segs.map(([from, to, kind], i) => (
                    <span
                      key={i}
                      className={`absolute top-0 h-4 rounded-full ${
                        kind === "work" ? "bg-[#6edcc0]" : "hatch-pause"
                      }`}
                      style={{
                        left: `${((from - P_START) / P_SPAN) * 100}%`,
                        width: `${((to - from) / P_SPAN) * 100}%`,
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <h1 className="max-w-md text-5xl font-semibold leading-[1.05]">
            Quién trabaja ahora, de un vistazo.
          </h1>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-slate-300">
            Tu equipo ficha desde el móvil o el navegador. Tú corriges los errores con un motivo y
            todo queda registrado para cuando lo pida la inspección.
          </p>
        </div>

        <p className="text-sm text-slate-400">Control horario para equipos pequeños</p>
      </section>

      {/* Formulario */}
      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-10 lg:hidden">
            <Logo />
          </div>

          <h2 className="text-3xl font-semibold">Iniciar sesión</h2>
          <p className="mt-1 text-sm text-slate-500">
            Usa el email y la contraseña que te dio tu empresa.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <label className={labelCls}>
              Email
              <input
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputCls}
              />
            </label>

            <label className={labelCls}>
              Contraseña
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputCls}
              />
            </label>

            {error && (
              <p role="alert" className={errorCls}>
                {error}
              </p>
            )}

            <button type="submit" disabled={submitting} className={`${btnPrimary} w-full py-2.5`}>
              {submitting ? "Entrando..." : "Entrar"}
            </button>
          </form>

          {DEMO && (
            <div className="mt-10 border-t border-slate-200 pt-6">
              <p className="mb-3 text-sm font-medium">Probar con una cuenta de demostración</p>
              <div className="space-y-2">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    disabled={submitting}
                    onClick={() => void signIn(acc.email, acc.password)}
                    className={`${btnGhost} w-full`}
                  >
                    {acc.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}