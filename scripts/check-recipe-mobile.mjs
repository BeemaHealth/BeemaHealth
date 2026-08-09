#!/usr/bin/env node

import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const urls =
  process.argv.length > 2
    ? process.argv.slice(2)
    : ["http://localhost:8080/recipes/"];
const viewportWidth = Number(process.env.RECIPE_AUDIT_WIDTH ?? 375);
if (![320, 375, 390].includes(viewportWidth)) {
  console.error("RECIPE_AUDIT_WIDTH must be 320, 375, or 390.");
  process.exit(1);
}
const chromeCandidates = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);
const chromePath = chromeCandidates.find(existsSync);

if (!chromePath) {
  console.error("Chrome or Chromium was not found. Set CHROME_PATH and retry.");
  process.exit(1);
}

const port = 9300 + (process.pid % 500);
const profile = mkdtempSync(join(tmpdir(), "beema-recipe-audit-"));
const chrome = spawn(
  chromePath,
  [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    "about:blank",
  ],
  { stdio: "ignore" },
);

const delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function waitForDebugger() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) return;
    } catch {
      // Chrome is still starting.
    }
    await delay(100);
  }
  throw new Error("Timed out waiting for Chrome DevTools.");
}

async function audit(url) {
  const targetResponse = await fetch(
    `http://127.0.0.1:${port}/json/new?about:blank`,
    { method: "PUT" },
  );
  const target = await targetResponse.json();
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  const pending = new Map();
  const requests = [];
  let commandId = 0;

  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    }
    if (message.method === "Network.requestWillBeSent") {
      requests.push(message.params.request.url);
    }
  });

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      commandId += 1;
      pending.set(commandId, { resolve, reject });
      socket.send(JSON.stringify({ id: commandId, method, params }));
    });

  await send("Page.enable");
  await send("Network.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width: viewportWidth,
    height: 812,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await send("Page.addScriptToEvaluateOnNewDocument", {
    source:
      "window.__beemaLcp = 0; new PerformanceObserver((list) => { const entries = list.getEntries(); window.__beemaLcp = entries.at(-1)?.startTime ?? window.__beemaLcp; }).observe({type:'largest-contentful-paint', buffered:true});",
  });

  const loaded = new Promise((resolve) => {
    const listener = (event) => {
      const message = JSON.parse(event.data);
      if (message.method === "Page.loadEventFired") {
        socket.removeEventListener("message", listener);
        resolve();
      }
    };
    socket.addEventListener("message", listener);
  });

  await send("Page.navigate", { url });
  await loaded;
  await delay(3500);

  const result = await send("Runtime.evaluate", {
    returnByValue: true,
    expression: `(() => ({
      url: location.href,
      viewportWidth: ${viewportWidth},
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      lcpMs: Math.round(window.__beemaLcp || 0),
      imageSources: [...document.images].map((image) => image.currentSrc),
      treatmentLinks: [...document.querySelectorAll('a')].filter((a) =>
        ['/weight-loss/', '/semaglutide/', '/tirzepatide/'].some((path) =>
          a.href.endsWith(path)
        )
      ).map((a) => a.getAttribute('href')),
    }))()`,
  });

  socket.close();
  await fetch(`http://127.0.0.1:${port}/json/close/${target.id}`);
  return {
    ...result.result.value,
    googleRequests: requests.filter((request) =>
      /google(tagmanager|analytics|ads|adservices)|doubleclick/.test(request),
    ),
  };
}

try {
  await waitForDebugger();
  const results = [];
  for (const url of urls) results.push(await audit(url));
  console.log(JSON.stringify(results, null, 2));
  if (
    results.some(
      ({ clientWidth, scrollWidth, bodyScrollWidth }) =>
        scrollWidth !== clientWidth || bodyScrollWidth !== clientWidth,
    )
  ) {
    process.exitCode = 1;
  }
} finally {
  chrome.kill("SIGTERM");
  await delay(300);
  rmSync(profile, {
    recursive: true,
    force: true,
    maxRetries: 5,
    retryDelay: 100,
  });
}
