"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { api, tokenStore } from "./api";

export type Session = { userId: number; fullName: string; role: string };

type LoginResponse = { token: string; userId: number; fullName: string; role: string };

type AuthContextType = {
  session: Session | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const SESSION_KEY = "fichajes_session";
const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Recuperamos la sesión al cargar (solo se puede leer localStorage en el cliente)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw && tokenStore.get()) {
        setSession(JSON.parse(raw));
      }
    } catch {
      localStorage.removeItem(SESSION_KEY);
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    // De momento el panel es solo para jefes; la pantalla de fichar de empleados llegará después
    if (res.role !== "ADMIN") {
      throw new Error("Este panel es solo para administradores.");
    }

    const next: Session = { userId: res.userId, fullName: res.fullName, role: res.role };
    tokenStore.set(res.token);
    localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    setSession(next);
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider value={{ session, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}