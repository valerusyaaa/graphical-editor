import { execSync } from "node:child_process";

const portArg = process.argv[2];
const port = Number(portArg);

if (!Number.isInteger(port) || port <= 0) {
  console.error("Usage: node scripts/free-port.mjs <port>");
  process.exit(1);
}

function getPidsOnWindows(targetPort) {
  const output = execSync("netstat -ano -p tcp", { encoding: "utf8" });
  const lines = output.split(/\r?\n/);
  const pids = new Set();
  const portSuffix = `:${targetPort}`;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("TCP")) continue;
    const parts = trimmed.split(/\s+/);
    if (parts.length < 5) continue;
    const localAddress = parts[1];
    const state = parts[3];
    const pid = parts[4];
    if (localAddress.endsWith(portSuffix) && state === "LISTENING") {
      pids.add(pid);
    }
  }

  return [...pids];
}

function getPidsOnUnix(targetPort) {
  try {
    const output = execSync(`lsof -ti tcp:${targetPort}`, { encoding: "utf8" });
    return output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function killPid(pid) {
  if (process.platform === "win32") {
    execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
  } else {
    execSync(`kill -9 ${pid}`, { stdio: "ignore" });
  }
}

const pids = process.platform === "win32" ? getPidsOnWindows(port) : getPidsOnUnix(port);

if (pids.length === 0) {
  console.log(`Port ${port} is free`);
  process.exit(0);
}

for (const pid of pids) {
  try {
    killPid(pid);
    console.log(`Killed PID ${pid} on port ${port}`);
  } catch {
    console.warn(`Failed to kill PID ${pid} on port ${port}`);
  }
}
