/**
 * npx lazy-apply: the Lazy Apply runner in one command.
 *
 *   npx lazy-apply                 connect this computer (once), offer automatic start, run
 *   npx lazy-apply start           run in the foreground (what automatic start uses)
 *   npx lazy-apply status          account, automatic start, whether it is running
 *   npx lazy-apply autostart on|off
 *   npx lazy-apply logout          forget this computer and stop automatic start
 *
 * Settings live in ~/.lazy-apply/config.json. The Chrome profile the runner fills forms in stays in
 * ~/.auto-apply/chrome-profile, shared with runners started from the repository.
 */
import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, hostname, platform, tmpdir, userInfo } from "node:os";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline/promises";

declare const __VERSION__: string;
const VERSION = typeof __VERSION__ === "string" ? __VERSION__ : "dev";
const DEFAULT_APP = "https://lazyapply.online";
const HOME = join(homedir(), ".lazy-apply");
const CONFIG = join(HOME, "config.json");
const LOG = join(HOME, "runner.log");
const LABEL = "online.lazyapply.runner";

type Config = { appUrl: string; token?: string; account?: string; autostart?: boolean };

// ---- output -------------------------------------------------------------------------
const tty = process.stdout.isTTY;
const paint = (code: string) => (s: string) => (tty ? `\x1b[${code}m${s}\x1b[0m` : s);
const bold = paint("1"), dim = paint("2"), teal = paint("36"), green = paint("32"), red = paint("31"), yellow = paint("33");
const say = (s = "") => console.log(s);
const fail = (s: string): never => { console.error(`${red("✗")} ${s}`); process.exit(1); };

// ---- config -------------------------------------------------------------------------
function load(): Config {
  const fromFlag = flag("--app-url");
  try {
    const c = JSON.parse(readFileSync(CONFIG, "utf8")) as Config;
    return fromFlag && fromFlag !== c.appUrl ? { appUrl: fromFlag } : c;
  } catch { return { appUrl: fromFlag || process.env.LAZY_APPLY_URL || DEFAULT_APP }; }
}
function save(c: Config) { mkdirSync(HOME, { recursive: true }); writeFileSync(CONFIG, JSON.stringify(c, null, 2), { mode: 0o600 }); }
function flag(name: string): string | undefined { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; }

// ---- connect this computer ----------------------------------------------------------
function openBrowser(url: string) {
  if (process.env.LAZY_APPLY_NO_BROWSER) return;
  const [cmd, args] = platform() === "darwin" ? ["open", [url]] : platform() === "win32" ? ["cmd", ["/c", "start", "", url]] : ["xdg-open", [url]];
  try { spawn(cmd, args as string[], { stdio: "ignore", detached: true }).unref(); } catch { /* the URL is printed anyway */ }
}

async function connect(c: Config): Promise<Config> {
  const device = `${userInfo().username}@${hostname().replace(/\.local$/, "")}`;
  let start: { secret: string; code: string; url: string; expiresAt: number };
  try {
    const r = await fetch(`${c.appUrl}/api/runner/link`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ device }) });
    if (!r.ok) throw new Error(`${r.status}`);
    start = await r.json();
  } catch (e) { return fail(`Could not reach ${c.appUrl} (${(e as Error).message}). Check your internet connection and try again.`); }

  say(`${bold("Connect this computer to your Lazy Apply account")}`);
  say(`Your browser is opening. Check it shows this code, then press ${bold("Connect this computer")}:`);
  say();
  say(`    ${bold(teal(start.code))}`);
  say();
  say(dim(`If it did not open, go to ${start.url}`));
  openBrowser(start.url);

  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  let i = 0;
  while (Date.now() < start.expiresAt) {
    if (tty) process.stdout.write(`\r${teal(frames[i++ % frames.length])} Waiting for you to confirm in the browser…`);
    await new Promise((r) => setTimeout(r, 2000));
    try {
      const r = await fetch(`${c.appUrl}/api/runner/link?secret=${start.secret}`);
      const d = (await r.json()) as { status: string; token?: string; account?: string };
      if (d.status === "approved" && d.token) {
        if (tty) process.stdout.write("\r\x1b[2K");
        const next = { ...c, token: d.token, account: d.account };
        save(next);
        say(`${green("✓")} Connected${d.account ? ` as ${bold(d.account)}` : ""}.`);
        return next;
      }
      if (d.status === "expired") break;
    } catch { /* keep waiting through a network blip */ }
  }
  if (tty) process.stdout.write("\r\x1b[2K");
  return fail("The code expired before it was confirmed. Run npx lazy-apply again for a new one.");
}

// ---- prerequisites ------------------------------------------------------------------
function chromeInstalled(): boolean {
  const p = platform();
  const candidates = p === "darwin" ? ["/Applications/Google Chrome.app", join(homedir(), "Applications/Google Chrome.app")]
    : p === "win32" ? [process.env["PROGRAMFILES"], process.env["PROGRAMFILES(X86)"], process.env.LOCALAPPDATA].filter(Boolean).map((d) => join(d!, "Google/Chrome/Application/chrome.exe"))
      : ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/opt/google/chrome/chrome"];
  return candidates.some((c) => existsSync(c));
}

// ---- automatic start ----------------------------------------------------------------
/**
 * The npx a login item should call. Prefer the stable links Homebrew and the Node installer keep
 * (/opt/homebrew/bin, /usr/local/bin) over the versioned folder node runs from, which disappears on
 * the next upgrade. `lazy-apply@latest` then keeps the runner itself up to date.
 */
function npxPath() {
  if (platform() === "win32") return join(dirname(process.execPath), "npx.cmd");
  const stable = ["/opt/homebrew/bin/npx", "/usr/local/bin/npx", "/usr/bin/npx"].find((p) => existsSync(p));
  return stable ?? join(dirname(process.execPath), "npx");
}
const RUN_ARGS = ["-y", "lazy-apply@latest", "start"];

function plistPath() { return join(homedir(), "Library/LaunchAgents", `${LABEL}.plist`); }
function unitPath() { return join(homedir(), ".config/systemd/user/lazy-apply.service"); }
function startupPath() { return join(process.env.APPDATA || "", "Microsoft/Windows/Start Menu/Programs/Startup/lazy-apply.cmd"); }
const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function launchAgentPlist(npx: string, path: string, log: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>${[npx, ...RUN_ARGS].map((a) => `<string>${xml(a)}</string>`).join("")}</array>
  <key>EnvironmentVariables</key>
  <dict><key>PATH</key><string>${xml(path)}</string></dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><dict><key>SuccessfulExit</key><false/></dict>
  <key>ThrottleInterval</key><integer>30</integer>
  <key>StandardOutPath</key><string>${xml(log)}</string>
  <key>StandardErrorPath</key><string>${xml(log)}</string>
</dict>
</plist>
`;
}

function enableAutostart(): string {
  const p = platform();
  const path = `${dirname(npxPath())}:/opt/homebrew/bin:/usr/local/bin:${dirname(process.execPath)}:/usr/bin:/bin:/usr/sbin:/sbin`;
  mkdirSync(HOME, { recursive: true });
  if (p === "darwin") {
    mkdirSync(dirname(plistPath()), { recursive: true });
    writeFileSync(plistPath(), launchAgentPlist(npxPath(), path, LOG));
    const uid = process.getuid?.() ?? 501;
    try { execFileSync("launchctl", ["bootout", `gui/${uid}/${LABEL}`], { stdio: "ignore" }); } catch { /* not loaded yet */ }
    execFileSync("launchctl", ["bootstrap", `gui/${uid}`, plistPath()], { stdio: "ignore" });
    return "macOS login item";
  }
  if (p === "linux") {
    mkdirSync(dirname(unitPath()), { recursive: true });
    writeFileSync(unitPath(), `[Unit]
Description=Lazy Apply runner
After=graphical-session.target network-online.target

[Service]
ExecStart=${npxPath()} ${RUN_ARGS.join(" ")}
Environment=PATH=${path}
${process.env.DISPLAY ? `Environment=DISPLAY=${process.env.DISPLAY}\n` : ""}${process.env.WAYLAND_DISPLAY ? `Environment=WAYLAND_DISPLAY=${process.env.WAYLAND_DISPLAY}\n` : ""}Restart=on-failure
RestartSec=30
StandardOutput=append:${LOG}
StandardError=append:${LOG}

[Install]
WantedBy=default.target
`);
    execFileSync("systemctl", ["--user", "daemon-reload"], { stdio: "ignore" });
    execFileSync("systemctl", ["--user", "enable", "--now", "lazy-apply.service"], { stdio: "ignore" });
    return "systemd user service";
  }
  if (p === "win32") {
    writeFileSync(startupPath(), `@echo off\r\nstart "Lazy Apply" /min "${npxPath()}" ${RUN_ARGS.join(" ")}\r\n`);
    spawn("cmd", ["/c", startupPath()], { detached: true, stdio: "ignore" }).unref();
    return "Windows startup item";
  }
  return fail(`Automatic start is not supported on ${p}. Run npx lazy-apply start yourself instead.`);
}

function disableAutostart() {
  const p = platform();
  if (p === "darwin") {
    try { execFileSync("launchctl", ["bootout", `gui/${process.getuid?.() ?? 501}/${LABEL}`], { stdio: "ignore" }); } catch { /* not loaded */ }
    rmSync(plistPath(), { force: true });
  } else if (p === "linux") {
    try { execFileSync("systemctl", ["--user", "disable", "--now", "lazy-apply.service"], { stdio: "ignore" }); } catch { /* not installed */ }
    rmSync(unitPath(), { force: true });
  } else if (p === "win32") rmSync(startupPath(), { force: true });
}

const autostartInstalled = () => existsSync(platform() === "darwin" ? plistPath() : platform() === "linux" ? unitPath() : startupPath());

// ---- running ------------------------------------------------------------------------
/** The runner's own lock file holds the pid of the instance that is running. */
function runningPid(appUrl: string): number | null {
  const lock = join(tmpdir(), `auto-apply-runner-chrome-profile-${appUrl.replace(/[^a-z0-9]+/gi, "_")}.lock`);
  try { const pid = Number(readFileSync(lock, "utf8")); process.kill(pid, 0); return pid; } catch { return null; }
}

async function run(c: Config) {
  if (!c.token) fail("This computer is not connected yet. Run npx lazy-apply first.");
  process.env.APP_URL = c.appUrl;
  process.env.RUNNER_TOKEN = c.token;
  process.env.RUNNER_PROFILE ||= "chrome-profile";
  process.env.RUNNER_CLIENT = `lazy-apply-cli/${VERSION} ${platform()}`;
  say(`${teal("●")} Lazy Apply runner ${dim(`v${VERSION}`)}${c.account ? ` for ${bold(c.account)}` : ""}. Approved applications fill in a Chrome window. ${dim("Ctrl+C to stop.")}`);
  // @ts-expect-error: built next to this file by the package build
  await import("./runner.js");
}

async function ask(question: string, yes = true): Promise<boolean> {
  // Never change login items for a script or CI run: only a person at a terminal can say yes.
  if (!process.stdin.isTTY) return false;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const a = (await rl.question(`${question} ${dim(yes ? "[Y/n]" : "[y/N]")} `)).trim().toLowerCase();
  rl.close();
  return a ? a.startsWith("y") : yes;
}

// ---- commands -----------------------------------------------------------------------
async function main() {
  const cmd = process.argv.slice(2).find((a) => !a.startsWith("--") && a !== flag("--app-url")) || "setup";
  const [major] = process.versions.node.split(".").map(Number);
  if (major < 18) fail(`Node.js 18 or newer is needed (you have ${process.versions.node}). Install it from https://nodejs.org and try again.`);

  if (cmd === "help" || process.argv.includes("--help") || process.argv.includes("-h")) {
    say(`${bold("lazy-apply")} ${dim(`v${VERSION}`)}: fills your approved Lazy Apply applications on this computer.\n`);
    say(`  npx lazy-apply                  set up (once) and start`);
    say(`  npx lazy-apply status           what it is doing`);
    say(`  npx lazy-apply autostart on     start automatically when you log in`);
    say(`  npx lazy-apply autostart off    stop starting automatically`);
    say(`  npx lazy-apply start            run now, in this terminal`);
    say(`  npx lazy-apply logout           disconnect this computer`);
    return;
  }
  if (cmd === "version" || process.argv.includes("--version")) return say(VERSION);

  let c = load();

  if (cmd === "start") return run(c);

  if (cmd === "status") {
    const pid = runningPid(c.appUrl);
    say(`${bold("Lazy Apply runner")} ${dim(`v${VERSION}`)}`);
    say(`  Account          ${c.token ? (c.account || "connected") : yellow("not connected (run npx lazy-apply)")}`);
    say(`  Server           ${c.appUrl}`);
    say(`  Automatic start  ${autostartInstalled() ? green("on") : "off"}`);
    say(`  Running          ${pid ? green(`yes (pid ${pid})`) : "no"}`);
    say(`  Log              ${LOG}`);
    return;
  }

  if (cmd === "autostart") {
    const on = (process.argv[process.argv.indexOf("autostart") + 1] || "on") !== "off";
    if (on) { if (!c.token) c = await connect(c); const how = enableAutostart(); save({ ...c, autostart: true }); say(`${green("✓")} Automatic start is on (${how}). It runs in the background whenever you log in.`); }
    else { disableAutostart(); save({ ...c, autostart: false }); say(`${green("✓")} Automatic start is off.`); }
    return;
  }

  if (cmd === "logout") {
    disableAutostart();
    save({ appUrl: c.appUrl, autostart: false });
    say(`${green("✓")} This computer is disconnected and will not start automatically. Run npx lazy-apply to connect again.`);
    return;
  }

  if (cmd !== "setup") fail(`Unknown command "${cmd}". Try npx lazy-apply help.`);

  // Setup: connect, check Chrome, offer automatic start, then run.
  say(`${bold(teal("Lazy Apply"))} ${dim(`runner v${VERSION}`)}`);
  say();
  if (!c.token) { c = await connect(c); say(); }
  else say(`${green("✓")} Connected${c.account ? ` as ${bold(c.account)}` : ""}.`);

  if (!chromeInstalled()) {
    say(`${yellow("!")} Google Chrome was not found. The runner fills forms in Chrome, so install it from ${bold("https://www.google.com/chrome/")} and run ${bold("npx lazy-apply")} again.`);
    process.exit(1);
  }
  say(`${green("✓")} Google Chrome found.`);

  // On Linux a background service can only open Chrome inside a desktop session.
  const canAutostart = platform() !== "linux" || !!process.env.DISPLAY || !!process.env.WAYLAND_DISPLAY;
  if (c.autostart === undefined && canAutostart) {
    const yes = await ask(`Start automatically in the background whenever you log in? It also keeps itself up to date.`);
    if (yes) {
      const how = enableAutostart();
      save({ ...c, autostart: true });
      say(`${green("✓")} Done (${how}). The runner is now running in the background.`);
      say(dim(`  It opens a Chrome window only when an approved application needs filling.`));
      say(dim(`  Check on it any time with npx lazy-apply status. Logs: ${LOG}`));
      return;
    }
    save({ ...c, autostart: false });
    say(dim(`  No problem. Turn it on later with npx lazy-apply autostart on.`));
  } else if (c.autostart && autostartInstalled()) {
    const pid = runningPid(c.appUrl);
    if (pid) { say(`${green("✓")} Already running in the background (pid ${pid}). Nothing else to do.`); return; }
    enableAutostart();
    say(`${green("✓")} Started it in the background again.`);
    return;
  }
  say();
  await run(c);
}

main().catch((e) => fail((e as Error).message));
