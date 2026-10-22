"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboard, Timer } from "lucide-react";
import AppShell, { type NavItem } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";

export default function EmpleadoLayout({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const router = useRouter();

  // Esta pantalla la pueden usar empleados y administradores: ambos pueden fichar.
  useEffect(() => {
    if (!loading && !session) router.replace("/login");
  }, [loading, session, router]);

  if (loading || !session) {
    return <p className="p-8 text-slate-500">Cargando...</p>;
  }

  const nav: NavItem[] = [
    ...(session.role === "ADMIN"
      ? [{ href: "/", label: "Panel de administración", icon: LayoutDashboard, exact: true }]
      : []),
    { href: "/empleado", label: "Mi jornada", icon: Timer },
  ];

  return <AppShell nav={nav}>{children}</AppShell>;
}