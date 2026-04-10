const { app, BrowserWindow } = require("electron");
const path = require("path");
const tracker = require("./tracker");
const historyTracker = require("./historyTracker");

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true
    }
  });

  mainWindow.loadFile("index.html");

  tracker.start((stats) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("usage-data", stats);
    }
  });

  historyTracker.start();

  setInterval(() => {
    const totals = historyTracker.UpdateDailyHistory();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("today-history", totals);
    }
  }, 1000);
}
setInterval(() => {
  const { weeklyHistoryTotals, labels, data } = historyTracker.calculateWeeklyHistory();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("weekly-history", { labels, data });
  }
}, 5000);


app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
