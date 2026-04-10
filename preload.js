const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  onUsageData: (cb) => ipcRenderer.on("usage-data", (_, d) => cb(d)),
  onTopTenUpdate: (cb) => ipcRenderer.on("top-ten-update", (_, d) => cb(d)),
  onTotalUsetimeUpdate: (cb) => ipcRenderer.on("total-usetime-update", (_, d) => cb(d)),
  onTodayHistory: (cb) => ipcRenderer.on("today-history", (_, d) => cb(d)),
  onWeeklyHistory: (callback) => ipcRenderer.on("weekly-history", (event, data) => callback(data)),
});
