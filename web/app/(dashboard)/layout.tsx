"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, FileText, LayoutDashboard, Timer, Users } from "lucide-react";
import AppShell, { type NavItem } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";

const NAV: NavItem[] = [
  { href: "/", label: "Hoy", icon: LayoutDashboard, exact: true },
  { href: "/fichajes", label: "Fichajes", icon: ClipboardList },
  { href: "/usuarios", label: "Usuarios", icon: Users },
  { href: "/informes", label: "Informes", icon: FileText },
  { href: "/empleado", label: "Mi jornada", icon: Timer },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !session) router.replace("/login");
    if (!loading && session && session.role !== "ADMIN") router.replace("/empleado");
  }, [loading, session, router]);

  if (loading || !session) {
    return <p className="p-8 text-slate-500">Cargando...</p>;
  }

  return <AppShell nav={NAV}>{children}</AppShell>;
}