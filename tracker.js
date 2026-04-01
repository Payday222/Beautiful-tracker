const { exec, execSync } = require("child_process");
const { BrowserWindow } = require("electron");
const os = require("os");

const platform = os.platform();

const windowHistory = [];
let ThisStartTime = 0;

function endPreviousWindow() {
  const last = windowHistory[windowHistory.length - 1];
  if (last && !last.endTime) {
    last.endTime = Date.now();
    last.duration = (last.endTime - last.startTime) / 1000;
  }
}

// -----------------------------
// LINUX IMPLEMENTATION
// -----------------------------
function getActiveWindowLinux() {
  exec("xdotool getactivewindow getwindowname", (err, stdout) => {
    if (err) {
      if (!/BadWindow/.test(err.message)) console.error(err);
      return;
    }

    let windowName = stdout.trim();
    windowName = windowName.replace(/and \d+ other pages/g, "").trim();
    if (!windowName) return;

    const last = windowHistory[windowHistory.length - 1];

    if (!last || last.name !== windowName) {
      endPreviousWindow();
      windowHistory.push({ name: windowName, startTime: Date.now() });
    }
  });
}

// -----------------------------
// MACOS
// -----------------------------
function getActiveWindowMac() {
  try {
    const script = `
      tell application "System Events"
        set frontApp to name of first application process whose frontmost is true
      end tell
      return frontApp
    `;
    const appName = execSync(`osascript -e '${script}'`).toString().trim();

    if (!appName) return;

    const last = windowHistory[windowHistory.length - 1];

    if (!last || last.name !== appName) {
      endPreviousWindow();
      windowHistory.push({ name: appName, startTime: Date.now() });
    }
  } catch (err) {
    console.error("macOS active window error:", err);
  }
}

// -----------------------------
// WINDOWS IMPLEMENTATION (placeholder)
// -----------------------------

async function getActiveWindowWindows() {
  // Placeholder for future Windows support
}

// -----------------------------
// UNIFIED DISPATCHER
// -----------------------------
function pollActiveWindow() {
  if (platform === "linux") return getActiveWindowLinux();
  if (platform === "darwin") return getActiveWindowMac();
  if (platform === "win32") return getActiveWindowWindows();
}

function getAppUsage() {
  const totals = {};
  for (const entry of windowHistory) {
    if (!totals[entry.name]) totals[entry.name] = 0;
    totals[entry.name] += entry.endTime
      ? entry.duration
      : (Date.now() - entry.startTime) / 1000;
  }
  return totals;
}


function FindTopTen() {
  const totals = getAppUsage();
  const arr = Object.entries(totals)
    .map(([name, total]) => ({ name, total: Number(total) || 0 }))
    .filter(entry => entry.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  const win = BrowserWindow.getAllWindows()[0];
  if (win) win.webContents.send("top-ten-update", arr);
}

function CalculateTotalUseTime() {
  const totalRuntime = Date.now() - ThisStartTime;
  const win = BrowserWindow.getAllWindows()[0];
  if (win) win.webContents.send("total-usetime-update", totalRuntime);
}

// -----------------------------
// START LOOP
// -----------------------------
function start(callback) {
  ThisStartTime = Date.now();

  setInterval(pollActiveWindow, 1000);

  setInterval(() => {
    const stats = getAppUsage();
    callback(stats);
  }, 1000);

  setInterval(FindTopTen, 1000);
  setInterval(CalculateTotalUseTime, 1000);
}

module.exports = {
  start,
  getAppUsage
};
