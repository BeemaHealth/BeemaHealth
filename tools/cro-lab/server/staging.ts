// Runs deploy-frontend-staging.sh from the dashboard. The script builds the
// working tree as it is on disk, so uncommitted changes are deployed too.
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { StagingState } from "../shared/types.ts";

export const STAGING_URL = "https://staging.beemahealth.com";
const LOG_LINES = 40;
const TIMEOUT_MS = 15 * 60_000;

type Persisted = Pick<StagingState, "deployed">;

export type Runner = (
  onLine: (line: string) => void,
  signal: AbortSignal,
) => Promise<number>;

/** Spawns the deploy script. SKIP_INSTALL keeps `npm ci` from wiping node_modules. */
export function scriptRunner(repoRoot: string): Runner {
  return (onLine, signal) =>
    new Promise((resolve, reject) => {
      const child = spawn(
        "bash",
        [path.join(repoRoot, "deploy-frontend-staging.sh")],
        {
          cwd: repoRoot,
          env: { ...process.env, SKIP_INSTALL: "1", CI: "1" },
          signal,
        },
      );
      let buf = "";
      const feed = (chunk: Buffer) => {
        buf += chunk.toString("utf8");
        const lines = buf.split(/\r?\n/);
        buf = lines.pop() ?? "";
        lines.forEach(onLine);
      };
      child.stdout.on("data", feed);
      child.stderr.on("data", feed);
      child.on("error", reject);
      child.on("close", (code) => {
        if (buf) onLine(buf);
        resolve(code ?? 1);
      });
    });
}

export class StagingDeployer {
  private state: StagingState;
  private file: string;
  private runner: Runner;
  private readMains: () => Record<string, string | null>;

  constructor(
    file: string,
    runner: Runner,
    readMains: () => Record<string, string | null>,
  ) {
    this.file = file;
    this.runner = runner;
    this.readMains = readMains;
    this.state = {
      status: "idle",
      startedAt: null,
      finishedAt: null,
      error: null,
      log: [],
      deployed: this.load(),
      url: STAGING_URL,
    };
  }

  private load(): StagingState["deployed"] {
    try {
      const p = JSON.parse(fs.readFileSync(this.file, "utf8")) as Persisted;
      const d = p.deployed;
      if (
        d &&
        typeof d.at === "string" &&
        d.mains &&
        typeof d.mains === "object"
      )
        return d;
    } catch {
      /* no deploy recorded yet */
    }
    return null;
  }

  private save() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(
      tmp,
      JSON.stringify({ deployed: this.state.deployed }, null, 2),
    );
    fs.renameSync(tmp, this.file);
  }

  snapshot(): StagingState {
    return { ...this.state, log: [...this.state.log] };
  }

  /** Starts a deploy and returns immediately; poll snapshot() for progress. */
  start(): StagingState {
    if (this.state.status === "running")
      throw new Error("A staging deploy is already running");
    const mains = this.readMains();
    this.state = {
      ...this.state,
      status: "running",
      startedAt: new Date().toISOString(),
      finishedAt: null,
      error: null,
      log: [],
    };
    void this.run(mains);
    return this.snapshot();
  }

  private async run(mains: Record<string, string | null>) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const onLine = (line: string) => {
      if (!line.trim()) return;
      this.state.log.push(line.slice(0, 300));
      if (this.state.log.length > LOG_LINES) this.state.log.shift();
    };
    try {
      const code = await this.runner(onLine, ctrl.signal);
      if (code !== 0) throw new Error(`Deploy script exited with code ${code}`);
      const at = new Date().toISOString();
      this.state.deployed = { at, mains };
      this.state.status = "succeeded";
      this.save();
    } catch (e) {
      this.state.status = "failed";
      this.state.error = ctrl.signal.aborted
        ? "Deploy timed out after 15 minutes"
        : (e as Error).message;
    } finally {
      clearTimeout(timer);
      this.state.finishedAt = new Date().toISOString();
    }
  }
}
