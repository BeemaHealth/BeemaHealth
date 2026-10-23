import { CloudUpload, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { fmtDateTime } from "@shared/time.ts";
import { api, ApiError } from "../api.ts";
import { useLab } from "../lab.tsx";
import { Button } from "../ui.tsx";

/**
 * Deploys the working tree (uncommitted changes included) to staging. The
 * deploy covers the whole site, not just one page.
 */
export function StagingDeploy() {
  const { mode, state, setState, reload } = useLab();
  const staging = state?.staging ?? null;
  const running = staging?.status === "running";
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  // Poll while the script runs; the server keeps going if this tab closes.
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => void reload(), 3000);
    return () => clearInterval(t);
  }, [running, reload]);

  if (mode !== "live" || !staging) return null;

  async function deploy() {
    setError(null);
    setStarting(true);
    try {
      setState(await api.deployStaging());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not start the deploy");
    } finally {
      setStarting(false);
    }
  }

  const last = staging.log.at(-1);
  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="outline"
        loading={running || starting}
        onClick={deploy}
        title="Builds the site as it is on disk, including uncommitted changes, and publishes it to staging. Covers every page."
      >
        {!running && !starting && <CloudUpload className="size-4" />}
        {running ? "Deploying to staging..." : "Deploy to staging"}
      </Button>
      <p className="max-w-72 text-right text-[11px] text-faint" role="status">
        {running ? (
          (last ?? "Starting...")
        ) : staging.status === "failed" ? (
          <span className="text-rose">
            Deploy failed: {staging.error}
            {last ? ` (${last})` : ""}
          </span>
        ) : staging.deployed ? (
          <>
            Last staging deploy {fmtDateTime(staging.deployed.at)}.{" "}
            <a
              href={staging.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-0.5 text-teal"
            >
              Open <ExternalLink className="size-3" />
            </a>
          </>
        ) : (
          "Not deployed to staging yet."
        )}
      </p>
      {error && (
        <p role="alert" className="max-w-72 text-right text-[11px] text-rose">
          {error}
        </p>
      )}
    </div>
  );
}
