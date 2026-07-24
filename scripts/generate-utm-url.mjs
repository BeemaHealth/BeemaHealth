#!/usr/bin/env node
/**
 * Generate unique GA4 / Formspree-trackable Beema Health URLs for social posts.
 *
 * Examples:
 *   npm run utm -- waitlist --source instagram
 *   npm run utm -- home --source x --medium social
 *   npm run utm -- waitlist --source instagram --content ig_post_launch_a
 *   npm run utm -- daily-pack
 *   npm run utm -- waitlist --source instagram --debug   # QA only — never publish ga_debug
 *
 * Measurement (no backend required):
 *   - Visits → GA4 (utm_source / medium / campaign / content) when the browser allows GA
 *   - Waitlist signups → Formspree fields with the same UTMs
 */

const ORIGIN = "https://beemahealth.com";

const DESTINATIONS = {
  waitlist: "/waitlist/",
  home: "/",
};

const DEFAULT_MEDIUM = {
  instagram: "social",
  facebook: "social",
  threads: "social",
  x: "social",
  twitter: "social",
  reddit: "social",
  tiktok: "social",
  google: "gbp",
  meta: "paid_social",
  youtube: "social",
  linkedin: "social",
  email: "email",
};

function todayDate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function shortId(length = 4) {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

function slug(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^[_-]+|[_-]+$/g, "")
    .slice(0, 64);
}

/**
 * @param {{
 *   dest?: 'waitlist' | 'home',
 *   source: string,
 *   medium?: string,
 *   campaign?: string,
 *   content?: string,
 *   date?: string,
 *   debug?: boolean,
 * }} opts
 */
export function buildTrackableUrl(opts) {
  const destKey = opts.dest === "home" ? "home" : "waitlist";
  const path = DESTINATIONS[destKey];
  const date = opts.date || todayDate();
  const source = slug(opts.source || "unknown");
  const medium = slug(
    opts.medium || DEFAULT_MEDIUM[source] || "social",
  );
  const campaign = slug(opts.campaign || `daily_${date}`);
  const content = opts.content
    ? slug(opts.content)
    : `${source}_${date.replace(/-/g, "")}_${shortId()}`;

  const params = new URLSearchParams({
    utm_source: source,
    utm_medium: medium,
    utm_campaign: campaign,
    utm_content: content,
  });
  if (opts.debug) params.set("ga_debug", "1");

  return {
    url: `${ORIGIN}${path}?${params.toString()}`,
    dest: destKey,
    path,
    utm_source: source,
    utm_medium: medium,
    utm_campaign: campaign,
    utm_content: content,
    date,
  };
}

/** Evergreen bio / profile links (stable — do not randomize). */
export function buildBioLinks() {
  return {
    instagram: buildTrackableUrl({
      dest: "waitlist",
      source: "instagram",
      medium: "social",
      campaign: "instagram_bio",
      content: "instagram_link_in_bio",
    }),
    facebook: buildTrackableUrl({
      dest: "waitlist",
      source: "facebook",
      medium: "social",
      campaign: "facebook_bio",
      content: "facebook_link_in_bio",
    }),
    threads: buildTrackableUrl({
      dest: "waitlist",
      source: "threads",
      medium: "social",
      campaign: "threads_bio",
      content: "threads_link_in_bio",
    }),
    x: buildTrackableUrl({
      dest: "home",
      source: "x",
      medium: "social",
      campaign: "x_bio",
      content: "x_link_in_bio",
    }),
  };
}

/** Daily pack: bio links + unique X / Reddit / GBP post URLs (no TikTok; no per-post IG). */
export function buildDailyPack(date = todayDate()) {
  const campaign = `daily_${date}`;
  const pack = {
    date,
    campaign,
    bio: buildBioLinks(),
    gbp: null,
    x: [],
    reddit: null,
  };

  for (let i = 1; i <= 3; i++) {
    const content = `x_post_${i}_${date.replace(/-/g, "")}_${shortId(3)}`;
    pack.x.push(
      buildTrackableUrl({
        dest: "waitlist",
        source: "x",
        medium: "social",
        campaign,
        content,
        date,
      }),
    );
  }

  pack.reddit = buildTrackableUrl({
    dest: "waitlist",
    source: "reddit",
    medium: "social",
    campaign,
    content: `reddit_post_1_${date.replace(/-/g, "")}_${shortId(3)}`,
    date,
  });

  pack.gbp = buildTrackableUrl({
    dest: "waitlist",
    source: "google",
    medium: "gbp",
    campaign,
    content: `gbp_post_1_${date.replace(/-/g, "")}_${shortId(3)}`,
    date,
  });

  return pack;
}

function printHelp() {
  console.log(`Beema Health trackable URL generator

Usage:
  npm run utm -- <waitlist|home> --source <platform> [options]
  npm run utm -- bio-links
  npm run utm -- daily-pack
  npm run utm -- prompt

Options:
  --source, -s     utm_source (instagram, facebook, threads, x, reddit, google, …)
  --medium, -m     utm_medium (default: social, or gbp for google)
  --campaign, -c   utm_campaign (default: daily_YYYY-MM-DD)
  --content        utm_content (default: unique auto id)
  --date           YYYY-MM-DD for campaign/content defaults
  --debug          append ga_debug=1 (testing only — never publish)
  --json           print JSON

Examples:
  npm run utm -- bio-links
  npm run utm -- waitlist -s x
  npm run utm -- daily-pack
`);
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") args.help = true;
    else if (a === "--json") args.json = true;
    else if (a === "--debug") args.debug = true;
    else if (a === "--source" || a === "-s") args.source = argv[++i];
    else if (a === "--medium" || a === "-m") args.medium = argv[++i];
    else if (a === "--campaign" || a === "-c") args.campaign = argv[++i];
    else if (a === "--content") args.content = argv[++i];
    else if (a === "--date") args.date = argv[++i];
    else if (a.startsWith("-")) {
      console.error(`Unknown flag: ${a}`);
      process.exit(1);
    } else args._.push(a);
  }
  return args;
}

function printBioLinks(bio, asJson) {
  if (asJson) {
    console.log(JSON.stringify(bio, null, 2));
    return;
  }
  console.log("Instagram bio:");
  console.log(`  ${bio.instagram.url}`);
  console.log("Facebook website:");
  console.log(`  ${bio.facebook.url}`);
  console.log("Threads bio:");
  console.log(`  ${bio.threads.url}`);
  console.log("X website / bio:");
  console.log(`  ${bio.x.url}`);
}

function printDailyPack(pack, asJson) {
  if (asJson) {
    console.log(JSON.stringify(pack, null, 2));
    return;
  }
  console.log(`Campaign (X/Reddit/GBP): ${pack.campaign}\n`);
  printBioLinks(pack.bio, false);
  console.log("\nGBP:");
  console.log(`  ${pack.gbp.url}`);
  console.log("\nX/Twitter:");
  pack.x.forEach((u, i) => console.log(`  ${i + 1}. ${u.url}`));
  console.log(`\nReddit:\n  ${pack.reddit.url}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args._.length === 0) {
    printHelp();
    process.exit(args.help ? 0 : 1);
  }

  const cmd = args._[0];

  if (cmd === "prompt") {
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const { dirname, join } = await import("node:path");
    const dir = dirname(fileURLToPath(import.meta.url));
    process.stdout.write(readFileSync(join(dir, "utm-url-agent-prompt.txt"), "utf8"));
    return;
  }

  if (cmd === "bio-links") {
    printBioLinks(buildBioLinks(), args.json);
    return;
  }

  if (cmd === "daily-pack") {
    printDailyPack(buildDailyPack(args.date), args.json);
    return;
  }

  if (cmd !== "waitlist" && cmd !== "home") {
    console.error(
      `Unknown destination "${cmd}". Use waitlist, home, bio-links, or daily-pack.`,
    );
    process.exit(1);
  }

  if (!args.source) {
    console.error("--source is required (e.g. --source instagram)");
    process.exit(1);
  }

  const result = buildTrackableUrl({
    dest: cmd,
    source: args.source,
    medium: args.medium,
    campaign: args.campaign,
    content: args.content,
    date: args.date,
    debug: Boolean(args.debug),
  });

  if (args.json) console.log(JSON.stringify(result, null, 2));
  else console.log(result.url);
}

// top-level await for prompt subcommand
const isMain =
  process.argv[1] &&
  (process.argv[1].endsWith("generate-utm-url.mjs") ||
    process.argv[1].includes("generate-utm-url"));

if (isMain) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
