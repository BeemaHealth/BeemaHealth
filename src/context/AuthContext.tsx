import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  applySession,
  clearSession,
  getCachedSession,
  subscribeSession,
  validateSession,
} from "@/lib/auth";
import type { SessionUser } from "@/lib/types/mvp";

type AuthContextValue = {
  session: SessionUser | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  setSession: (session: SessionUser) => void;
  refreshAuth: () => Promise<SessionUser | null>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<SessionUser | null>(() => getCachedSession());
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    let active = true;
    void validateSession().then((validated) => {
      if (!active) return;
      setSessionState(validated);
      setIsInitialized(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => subscribeSession(setSessionState), []);

  const setSession = useCallback((next: SessionUser) => {
    applySession(next);
  }, []);

  const refreshAuth = useCallback(async () => {
    const validated = await validateSession();
    setSessionState(validated);
    return validated;
  }, []);

  const signOut = useCallback(() => {
    clearSession();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isAuthenticated: Boolean(session),
      isInitialized,
      setSession,
      refreshAuth,
      signOut,
    }),
    [session, isInitialized, setSession, refreshAuth, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
