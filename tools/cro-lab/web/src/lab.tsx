import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { DailyRow, LabState, Mode, PathRow } from "@shared/types.ts";
import { api, ApiError } from "./api.ts";

export type Period = "1" | "3" | "7" | "14" | "30" | "all";

type Ctx = {
  mode: Mode;
  setMode: (m: Mode) => void;
  state: LabState | null;
  rows: DailyRow[];
  paths: PathRow[];
  error: string | null;
  loading: boolean;
  refreshedAt: Date | null;
  reload: (force?: boolean) => Promise<void>;
  setState: (s: LabState) => void;
  period: Period;
  setPeriod: (p: Period) => void;
};

const LabCtx = createContext<Ctx | null>(null);
export const useLab = () => {
  const c = useContext(LabCtx);
  if (!c) throw new Error("useLab outside provider");
  return c;
};

const read = (k: string, fallback: string) => {
  try {
    return localStorage.getItem(k) ?? fallback;
  } catch {
    return fallback;
  }
};
const write = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* preference only */
  }
};

export function LabProvider({ children }: { children: ReactNode }) {
  const [mode, setModeRaw] = useState<Mode>(
    read("cro.mode", "demo") === "live" ? "live" : "demo",
  );
  const [period, setPeriodRaw] = useState<Period>(() => {
    const saved = read("cro.period", "30");
    return ["1", "3", "7", "14", "30", "all"].includes(saved)
      ? (saved as Period)
      : "30";
  });
  const [state, setState] = useState<LabState | null>(null);
  const [rows, setRows] = useState<DailyRow[]>([]);
  const [paths, setPaths] = useState<PathRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);

  const reload = useCallback(
    async (force = false) => {
      setLoading(true);
      try {
        // Rows first: a forced fetch refreshes the cache that state then reads.
        const r = await api.rows(mode, force);
        const s = await api.state(mode);
        setState(s);
        setRows(r.rows);
        setPaths(r.paths ?? []);
        setError(null);
        setRefreshedAt(new Date());
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Unexpected error");
      } finally {
        setLoading(false);
      }
    },
    [mode],
  );

  useEffect(() => {
    setState(null);
    void reload();
  }, [reload]);

  const value = useMemo<Ctx>(
    () => ({
      mode,
      state,
      rows,
      paths,
      error,
      loading,
      refreshedAt,
      reload,
      setState,
      period,
      setMode: (m) => {
        write("cro.mode", m);
        setModeRaw(m);
      },
      setPeriod: (p) => {
        write("cro.period", p);
        setPeriodRaw(p);
      },
    }),
    [mode, state, rows, paths, error, loading, refreshedAt, reload, period],
  );

  return <LabCtx.Provider value={value}>{children}</LabCtx.Provider>;
}

/** Tiny hash router: #/, #/page/:id, #/page/:id/:variantId, #/queue */
export function useRoute(): string[] {
  const get = () =>
    location.hash
      .replace(/^#\/?/, "")
      .split("/")
      .filter(Boolean)
      .map(decodeURIComponent);
  const [route, setRoute] = useState(get);
  useEffect(() => {
    const on = () => setRoute(get());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}
export const go = (...parts: string[]) => {
  location.hash = "/" + parts.map(encodeURIComponent).join("/");
};
