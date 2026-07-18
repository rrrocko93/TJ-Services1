import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { tjAuth } from "./supabase";
import type { SessionUser, SessionRole } from "./types";

const STORAGE_KEY = "tj_session";

interface AuthContextValue {
  user: SessionUser | null;
  loading: boolean;
  login: (role: SessionRole, identifier: string, secret: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const parsed = JSON.parse(stored) as SessionUser;
      const me = await tjAuth<any>("me", { token: parsed.token });
      if (me.role === "admin") {
        setUser({ token: parsed.token, role: "admin", admin: me.admin });
      } else {
        setUser({ token: parsed.token, role: "customer", customer: me.customer });
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (role: SessionRole, identifier: string, secret: string) => {
    const res = await tjAuth<{ token: string; role: string; admin?: any; customer?: any }>("login", {
      method: "POST",
      body: { role, identifier, secret },
    });
    const session: SessionUser = {
      token: res.token,
      role: res.role as SessionRole,
      admin: res.admin || null,
      customer: res.customer || null,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    setUser(session);
  };

  const logout = async () => {
    if (user) {
      try {
        await tjAuth("logout", { method: "POST", body: { token: user.token } });
      } catch {
        /* ignore */
      }
    }
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
