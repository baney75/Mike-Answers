import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const wranglerConfigPath = resolve(repoRoot, "wrangler.jsonc");
const wranglerConfig = readFileSync(wranglerConfigPath, "utf8");

function readJsoncString(key) {
  const pattern = new RegExp(`"${key}"\\s*:\\s*"([^"]+)"`);
  const match = wranglerConfig.match(pattern);
  return match?.[1] ?? "";
}

function inferOpenRouterRefererFromRoutes() {
  const routePattern = /"pattern"\s*:\s*"([^"]+)"/g;
  let match = routePattern.exec(wranglerConfig);
  while (match) {
    const value = match[1]?.trim();
    if (value && !value.includes("*")) {
      return value.startsWith("http://") || value.startsWith("https://")
        ? value
        : `https://${value}`;
    }
    match = routePattern.exec(wranglerConfig);
  }

  return "";
}

function pushLine(lines, status, message) {
  lines.push(`${status} ${message}`);
}

function runWranglerWhoami() {
  try {
    const output = execSync("wrangler whoami", {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf8",
      env: process.env,
    });
    return { ok: true, output };
  } catch (error) {
    return {
      ok: false,
      output: String(error?.stdout || error?.stderr || error?.message || "Unknown Wrangler failure"),
    };
  }
}

const accountId = readJsoncString("account_id") || process.env.CLOUDFLARE_ACCOUNT_ID || "";
const openRouterReferer = process.env.OPENROUTER_REFERER || inferOpenRouterRefererFromRoutes();

const whoami = runWranglerWhoami();

const errors = [];
const warnings = [];
const info = [];

if (!whoami.ok && !process.env.CLOUDFLARE_API_TOKEN) {
  errors.push("Cloudflare auth is missing. Run `wrangler login` or provide `CLOUDFLARE_API_TOKEN`.");
} else if (whoami.ok) {
  info.push("Wrangler authentication is available in this shell.");
}

if (!accountId) {
  errors.push("Cloudflare account targeting is missing. Set `account_id` in `wrangler.jsonc` or `CLOUDFLARE_ACCOUNT_ID` in the environment.");
} else {
  info.push(`Cloudflare account target is set to ${accountId}.`);
}

info.push("Running in Cloudflare-only browser-local mode.");

if (!openRouterReferer) {
  warnings.push("`OPENROUTER_REFERER` is unset. OpenRouter requests still work, but they will not send your deployed app origin for attribution.");
}

if (errors.length === 0) {
  info.push("No hard preflight blockers detected for the repo-side production path.");
}

const lines = ["Production preflight summary"];
for (const message of info) pushLine(lines, "INFO", message);
for (const message of warnings) pushLine(lines, "WARN", message);
for (const message of errors) pushLine(lines, "ERROR", message);

console.log(lines.join("\n"));

if (errors.length > 0) {
  process.exitCode = 1;
}
