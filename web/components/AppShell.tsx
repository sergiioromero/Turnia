"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, type LucideIcon } from "lucide-react";
import { useAuth } from "@/lib/auth";
import Avatar from "./Avatar";
import Logo from "./Logo";

export type NavItem = { href: string; label: string; icon: LucideIcon; exact?: boolean };

export default function AppShell({ nav, children }: { nav: NavItem[]; children: ReactNode }) {
  const { session, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  return (
    <div className="min-h-screen md:grid md:grid-cols-[16rem_minmax(0,1fr)]">
      {/* Barra lateral (escritorio) */}
      <aside className="sticky top-0 hidden h-screen flex-col bg-ink p-4 text-slate-300 md:flex">
        <div className="px-2 pb-8 pt-2">
          <Logo tone="light" />
        </div>

        <nav aria-label="Principal" className="flex-1 space-y-1">
          {nav.map((item) => {
            const active = isActive(item);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active ? "bg-white/10 text-white" : "hover:bg-white/5 hover:text-white"
                }`}
              >
                {active && (
                  <span className="absolute -left-4 bottom-2 top-2 w-1 rounded-r bg-[#6edcc0]" />
                )}
                <Icon size={18} aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3 border-t border-white/10 px-2 pt-4">
          <Avatar name={session?.fullName ?? "?"} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{session?.fullName}</p>
            <p className="text-xs text-slate-400">
              {session?.role === "ADMIN" ? "Administrador" : "Empleado"}
            </p>
          </div>
          <button
            onClick={handleLogout}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
            className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Cabecera (móvil) */}
      <header className="bg-ink px-4 pb-3 pt-4 md:hidden">
        <div className="flex items-center justify-between">
          <Logo tone="light" size={28} />
          <button
            onClick={handleLogout}
            aria-label="Cerrar sesión"
            className="rounded-lg p-2 text-slate-300 hover:bg-white/10"
          >
            <LogOut size={18} />
          </button>
        </div>
        <nav aria-label="Principal" className="-mx-4 mt-3 flex gap-1 overflow-x-auto px-4">
          {nav.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium ${
                  active ? "bg-white text-ink" : "text-slate-300 hover:bg-white/10"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="min-w-0 px-4 py-6 md:px-10 md:py-9">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
