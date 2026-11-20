import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { StagingDeployer, type Runner } from "./staging.ts";

const tmpFile = () =>
  path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cro-stg-")), "staging.json");
const settle = () => new Promise((r) => setTimeout(r, 20));
const mains = () => ({ "page-a": "v2-variant-b" });

test("successful deploy records the main variants and persists them", async () => {
  const file = tmpFile();
  const run: Runner = async (onLine) => {
    onLine("Building");
    return 0;
  };
  const d = new StagingDeployer(file, run, mains);
  assert.equal(d.snapshot().deployed, null);
  d.start();
  assert.equal(d.snapshot().status, "running");
  await settle();
  const s = d.snapshot();
  assert.equal(s.status, "succeeded");
  assert.deepEqual(s.deployed?.mains, mains());
  assert.deepEqual(s.log, ["Building"]);
  // A fresh instance (server restart) still knows what is on staging.
  const again = new StagingDeployer(file, run, mains);
  assert.deepEqual(again.snapshot().deployed?.mains, mains());
  assert.equal(again.snapshot().status, "idle");
});

test("failed deploy keeps the previous deployed record and reports the error", async () => {
  const file = tmpFile();
  let code = 0;
  const run: Runner = async () => code;
  const d = new StagingDeployer(file, run, mains);
  d.start();
  await settle();
  const first = d.snapshot().deployed;
  assert.ok(first);
  code = 2;
  d.start();
  await settle();
  const s = d.snapshot();
  assert.equal(s.status, "failed");
  assert.match(s.error ?? "", /code 2/);
  assert.deepEqual(s.deployed, first);
});

test("a runner that throws fails the deploy", async () => {
  const d = new StagingDeployer(
    tmpFile(),
    async () => {
      throw new Error("spawn bash ENOENT");
    },
    mains,
  );
  d.start();
  await settle();
  assert.equal(d.snapshot().status, "failed");
  assert.match(d.snapshot().error ?? "", /ENOENT/);
});

test("refuses a second deploy while one is running", async () => {
  let release!: () => void;
  const run: Runner = () => new Promise((r) => (release = () => r(0)));
  const d = new StagingDeployer(tmpFile(), run, mains);
  d.start();
  assert.throws(() => d.start(), /already running/);
  release();
  await settle();
  assert.equal(d.snapshot().status, "succeeded");
});

test("log keeps only the last lines and skips blanks", async () => {
  const run: Runner = async (onLine) => {
    for (let i = 0; i < 100; i++) onLine(`line ${i}`);
    onLine("   ");
    return 0;
  };
  const d = new StagingDeployer(tmpFile(), run, mains);
  d.start();
  await settle();
  const { log } = d.snapshot();
  assert.equal(log.length, 40);
  assert.equal(log.at(-1), "line 99");
});

test("corrupt persisted file is ignored", () => {
  const file = tmpFile();
  fs.writeFileSync(file, "{not json");
  const d = new StagingDeployer(file, async () => 0, mains);
  assert.equal(d.snapshot().deployed, null);
});
