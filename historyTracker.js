const path = require("path");
const fs = require("fs");
const { app } = require("electron");
const { getAppUsage } = require("./tracker");

const dataDir = path.join(app.getPath("userData"), "dailyHistory");
console.log(`Daily history directory: ${dataDir}`);

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

function getTodayFilename() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();
  return path.join(dataDir, `${day}-${month}-${year}.json`);
}

function loadTodayHistory() {
  const file = getTodayFilename();

  if (!fs.existsSync(file)) {
    return { totals: {}, lastSeen: {} };
  }

  try {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));

    if (data.totals && data.lastSeen) {
      return data;
    }

    console.log("Migrating old history format → new format");
    return {
      totals: data,
      lastSeen: {}
    };

  } catch (err) {
    console.warn("Failed to read history file, resetting:", err);
    return { totals: {}, lastSeen: {} };
  }
}

function saveHistory(data) {
  const file = getTodayFilename();
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Failed to save history:", err);
  }
}

function UpdateDailyHistory() {
  const history = loadTodayHistory();
  const totals = history.totals;
  const lastSeen = history.lastSeen;

  const currentTotals = getAppUsage();

  for (const app in currentTotals) {
    const current = currentTotals[app];
    const last = lastSeen[app] ?? 0;
    const saved = totals[app] ?? 0;

    let delta = 0;

    if (current < last) {
      delta = current;
    } else {
      delta = current - last;
    }

    totals[app] = saved + delta;
    lastSeen[app] = current;
  }

  saveHistory({ totals, lastSeen });

  return totals;
}

function start() {
  setInterval(UpdateDailyHistory, 1000);
}

function calculateWeeklyHistory() {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const now = Date.now();

  const weeklyHistory = [];
  const weeklyHistoryTotals = {};
  const weeklyTopTen = [];
  let largest = null;
  for (let i = 0; i < 7; i++) {
    const ts = now - i * MS_PER_DAY;
    const date = new Date(ts);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const filename = `${day}-${month}-${year}.json`;
    weeklyHistory.push(loadHistoryOfDay(filename)); 
  } // this loop accumulates everything into the weekly history array;
  for(let entry of weeklyHistory) {
    for(let app in entry.totals) {
      const value = entry.totals[app];
      if(!weeklyHistoryTotals[app]) {
        weeklyHistoryTotals[app] = 0;
      }
      weeklyHistoryTotals[app] += value;
    }
  }


  const labels = Object.keys(weeklyHistoryTotals);
  const data = Object.values(weeklyHistoryTotals);

  return { weeklyHistoryTotals, labels, data };

}



function loadHistoryOfDay(day) {
  const historyDir = path.join(app.getPath("userData"), "dailyHistory");
  const file = path.join(historyDir, day);

  if (!fs.existsSync(file)) {
    return { totals: {}, lastSeen: {} };
  }

  try {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));

    if (data.totals && data.lastSeen) {
      return data;
    }

    console.log("Migrating old history format → new format");
    return {
      totals: data,
      lastSeen: {}
    };

  } catch (err) {
    console.warn("Failed to read history file, resetting:", err);
    return { totals: {}, lastSeen: {} };
  }
}


module.exports = { start, UpdateDailyHistory, calculateWeeklyHistory };
