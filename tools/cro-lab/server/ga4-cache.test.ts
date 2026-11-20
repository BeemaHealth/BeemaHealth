import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  applyFetch,
  datesToFetch,
  emptyStore,
  isFinal,
  lastPulled,
  loadStore,
  saveStore,
  storeKey,
} from "./ga4-cache.ts";
import type { DailyRow } from "../shared/types.ts";

const day = (date: string, users: number): DailyRow => ({
  date,
  pageId: "p",
  sourceMedium: "a",
  campaign: "c",
  users,
  sessions: users,
  handoffUsers: 0,
  handoffEvents: 0,
});

test("isFinal only after GA4 can no longer revise the day", () => {
  // 2026-10-20 ends 10/21 00:00 Denver (06:00Z); final from 10/23 06:00Z.
  assert.equal(isFinal("2026-10-20", "2026-10-23T05:59:00.000Z"), false);
  assert.equal(isFinal("2026-10-20", "2026-10-23T06:00:00.000Z"), true);
  assert.equal(isFinal("2026-10-20", "2026-10-20T20:00:00.000Z"), false);
});

test("datesToFetch asks only for missing days, and recent days on force", () => {
  let store = emptyStore("k");
  assert.deepEqual(datesToFetch(store, "2026-10-20", "2026-10-22", false), [
    "2026-10-20",
    "2026-10-21",
    "2026-10-22",
  ]);
  // 10/20 pulled long after it settled; 10/21 and 10/22 pulled on the 23rd.
  store = {
    ...store,
    days: {
      "2026-10-20": "2026-10-30T12:00:00.000Z",
      "2026-10-21": "2026-10-23T15:00:00.000Z",
      "2026-10-22": "2026-10-23T15:00:00.000Z",
    },
  };
  assert.deepEqual(datesToFetch(store, "2026-10-20", "2026-10-22", false), []);
  assert.deepEqual(datesToFetch(store, "2026-10-20", "2026-10-23", false), [
    "2026-10-23",
  ]);
  assert.deepEqual(datesToFetch(store, "2026-10-20", "2026-10-22", true), [
    "2026-10-21",
    "2026-10-22",
  ]);
});

test("applyFetch replaces only the pulled days and records when", () => {
  let store = emptyStore("k");
  store = applyFetch(
    store,
    ["2026-10-20", "2026-10-21"],
    {
      rows: [day("2026-10-20", 5), day("2026-10-21", 6)],
      paths: [],
      downstream: [],
    },
    "2026-10-22T12:00:00.000Z",
  );
  store = applyFetch(
    store,
    ["2026-10-21", "2026-10-22"],
    {
      // The 10/20 row in a wider response must not overwrite the cached day.
      rows: [day("2026-10-20", 99), day("2026-10-21", 8), day("2026-10-22", 9)],
      paths: [],
      downstream: [],
    },
    "2026-10-23T12:00:00.000Z",
  );
  assert.deepEqual(
    store.rows.map((r) => [r.date, r.users]),
    [
      ["2026-10-20", 5],
      ["2026-10-21", 8],
      ["2026-10-22", 9],
    ],
  );
  assert.equal(store.days["2026-10-20"], "2026-10-22T12:00:00.000Z");
  assert.equal(lastPulled(store), "2026-10-23T12:00:00.000Z");
});

test("a day pulled with no traffic is still marked as pulled", () => {
  const store = applyFetch(
    emptyStore("k"),
    ["2026-10-20"],
    { rows: [], paths: [], downstream: [] },
    "2026-10-22T12:00:00.000Z",
  );
  assert.deepEqual(datesToFetch(store, "2026-10-20", "2026-10-20", false), []);
});

test("saved store round-trips and is dropped for other pages or bad files", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cro-store-"));
  const file = path.join(dir, "nested", "days.json");
  const key = storeKey(["b", "a"], "2026-10-19");
  assert.equal(key, storeKey(["a", "b"], "2026-10-19"));
  assert.equal(loadStore(file, key), null);
  const store = applyFetch(
    emptyStore(key),
    ["2026-10-20"],
    { rows: [day("2026-10-20", 5)], paths: [], downstream: [] },
    "2026-10-22T12:00:00.000Z",
  );
  saveStore(file, store);
  assert.deepEqual(loadStore(file, key), store);
  assert.equal(loadStore(file, storeKey(["a", "b", "c"], "2026-10-19")), null);
  assert.equal(loadStore(file, storeKey(["a", "b"], "2026-10-20")), null);
  fs.writeFileSync(file, "{not json");
  assert.equal(loadStore(file, key), null);
  fs.rmSync(dir, { recursive: true });
});
