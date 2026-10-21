"use client";

import { ReactNode, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

const NAV = [
  { href: "/", label: "Fichajes de hoy" },
  // Estas rutas las crearemos en los siguientes pasos:
  // { href: "/usuarios", label: "Usuarios" },
  // { href: "/informes", label: "Informes" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { session, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !session) router.replace("/login");
  }, [loading, session, router]);

  if (loading || !session) {
    return <p className="p-8 text-slate-500">Cargando...</p>;
  }

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 flex-col border-r border-slate-200 bg-white p-4">
        <h2 className="mb-6 text-lg font-semibold">Turnia</h2>
        <nav className="flex-1 space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-lg px-3 py-2 text-sm hover:bg-slate-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-slate-200 pt-4 text-sm">
          <p className="font-medium">{session.fullName}</p>
          <button
            onClick={() => {
              logout();
              router.replace("/login");
            }}
            className="mt-1 text-slate-500 underline hover:text-slate-900"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}