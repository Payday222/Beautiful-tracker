// Chart.js + treemap plugin loaded globally from HTML



// ----------------------
// ELEMENT REFERENCES
// ----------------------
const pieColors = {};
const treemapColors = {};
const lineCtx = document.getElementById("lineChart").getContext("2d");
const pieCtx = document.getElementById("pieChart").getContext("2d");
const historyCtx = document.getElementById("historyChart").getContext("2d");
const topTenList = document.getElementById("topTenList");
const rawDataBody = document.getElementById("raw-data-body");
const useTimeDisplay = document.getElementById("usetime-display");


// ----------------------
// UTILITIES
// ----------------------
function getRandomColor() {
  const hue = Math.floor(Math.random() * 360);
  const saturation = 65 + Math.random() * 10; // 65–75%
  const lightness = 45 + Math.random() * 10;  // 45–55%
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}
function getLineColor() {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 45%, 65%)`;
}
function getPieColor() {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 75%, 45%)`;
}
function getTreemapColor() {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 50%, 85%)`;
}



function formatTime(seconds) {
  seconds = Math.floor(seconds);

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

function truncateLabel(name, max = 25) {
  return name.length > max ? name.slice(0, max) + "…" : name;
}
function smartLabel(name, max = 25) {
  let clean = String(name || "");

  clean = clean.replace(/ and \d+ more pages - Personal - Microsoft.*$/i, "");
  clean = clean.replace(/ - Visual Studio Code$/i, "");
  clean = clean.replace(/ \| Messenger$/i, "");
  clean = clean.replace(/\.pdf$/i, "");
  clean = clean.replace(/Użytkownik .* wysłał wiadomość.*$/i, "Messenger");

  clean = clean.trim();

  return clean.length > max ? clean.slice(0, max) + "…" : clean;
}



// ----------------------
// LINE CHART
// ----------------------
const lineChart = new Chart(lineCtx, {
  type: "line",
  data: {
    labels: [],
    datasets: [],
  },
  options: {
    responsive: true,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: "#eee",
          font: { size: 11 },
          padding: 10,
          boxWidth: 10
        }
      }
    },
    scales: {
      x: {
        ticks: { color: "#ccc" },
        grid: { color: "rgba(255,255,255,0.1)" }
      },
      y: {
        ticks: { color: "#ccc" },
        grid: { color: "rgba(255,255,255,0.1)" }
      }
    }
  }
});


// ----------------------
// PIE CHART
// ----------------------
const pieChart = new Chart(pieCtx, {
  type: "pie",
  data: {
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: [],
      borderColor: "#1e1e1e",
      borderWidth: 2
    }]
  },
  options: {
    responsive: false,
    maintainAspectRatio: true,
    layout: {
      padding: {
        right: 100
      }
    },
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: "#eee",
          font: { size: 11 },
          padding: 10,
          boxWidth: 10
        }
      }
    }
  }
});


// ----------------------
// TREEMAP CHART
// ----------------------
const historyChart = new Chart(historyCtx, {
  type: "treemap",
  data: {
    datasets: [{
      tree: [],
      key: "value",
      groups: ["name"],
     backgroundColor(ctx) {
  const raw = ctx.raw?._data;
  if (!raw) return "#444"; 

  const name = raw.name;
  if (!treemapColors[name]) treemapColors[name] = getTreemapColor();
  return treemapColors[name];
},

      borderColor: "#1e1e1e",
      borderWidth: 2,
      spacing: 1,
      labels: {
        display: true,
       formatter(ctx) {
  const raw = ctx.raw?._data;
  if (!raw) return "";

  return truncateLabel(raw.name) + "\n" + formatTime(raw.value);
},

        color: "#eee",
        font: { size: 11 }
      }
    }]
  },
  options: {
    plugins: {
      legend: { display: false }
    }
  }
});


// ----------------------
// RAW DATA TABLE UPDATE
// ----------------------
function updateRawDataTable(data) {
  if (!rawDataBody) return;

  rawDataBody.innerHTML = "";

  const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]);

  for (const [name, time] of sorted) {
    const tr = document.createElement("tr");

    const tdName = document.createElement("td");
    tdName.textContent = name;

    const tdTime = document.createElement("td");
    tdTime.textContent = formatTime(time);

    tr.appendChild(tdName);
    tr.appendChild(tdTime);
    rawDataBody.appendChild(tr);
  }
}


// ----------------------
// TOP TEN LIST UPDATE
// ----------------------
function updateTopTenUI(topTen) {
  if (!topTenList) return;

  topTenList.innerHTML = "";

  topTen.forEach(entry => {
    if (!entry || typeof entry.total !== "number") return;

    const li = document.createElement("li");
    li.innerHTML = `
      <span class="app-name">${entry.name}</span>
      <span class="app-time">${formatTime(entry.total)}</span>
    `;
    topTenList.appendChild(li);
  });
}



function TotalUsetimeUpdate(totalUsetime) {
  if (!useTimeDisplay) return;
  useTimeDisplay.textContent = `Total usetime: ${totalUsetime}`;
}


// ----------------------
// IPC HANDLERS
// ----------------------
window.api.onUsageData((data) => {
  const now = new Date().toLocaleTimeString();

  lineChart.data.labels.push(now);

  Object.entries(data).forEach(([name, value]) => {
    let ds = lineChart.data.datasets.find(d => d.fullName === name);

    if (!ds) {
      ds = {
        fullName: name,
        label: truncateLabel(name),
        data: [],
        borderColor: getLineColor(),
        fill: false
      };
      lineChart.data.datasets.push(ds);
    }

    ds.data.push(value);
  });

  if (lineChart.data.labels.length > 300) {
    lineChart.data.labels.shift();
    lineChart.data.datasets.forEach(ds => ds.data.shift());
  }

  lineChart.update();


  const labels = Object.keys(data);
  const values = Object.values(data);

  const backgroundColors = labels.map(name => {
    if (!pieColors[name]) pieColors[name] = getPieColor();
    return pieColors[name];
  });

  pieChart.data.labels = labels.map(n => truncateLabel(n));
  pieChart.data.datasets[0].data = values;
  pieChart.data.datasets[0].backgroundColor = backgroundColors;
  pieChart.update();

  updateRawDataTable(data);
});


window.api.onTopTenUpdate((topTen) => {
  updateTopTenUI(topTen);
});


window.api.onTotalUsetimeUpdate((totalUsetime) => {
  TotalUsetimeUpdate(formatTime(totalUsetime / 1000));
});


// ----------------------
// TREEMAP
// ----------------------
window.api.onTodayHistory((totals) => {
  const treeData = Object.entries(totals).map(([name, value]) => ({
    name,
    value
  }));

  historyChart.data.datasets[0].tree = treeData;
  historyChart.update();
});

//----------------------
// WEEKLY
//----------------------

window.api.onWeeklyHistory((payload) => {
  const count = payload.labels.length;

  const height = Math.max(200, count * 30);
  const canvas = document.getElementById("weeklyChart");
  canvas.style.height = height + "px";

  console.log("WEEKLY PAYLOAD:", payload);
  console.log("LABEL COUNT:", payload?.labels?.length);
  console.log("DATA COUNT:", payload?.data?.length);

  if (!payload || !payload.labels || !payload.data) return;

  const { labels, data } = payload;

  const backgroundColors = labels.map(name => {
    if (!pieColors[name]) pieColors[name] = getPieColor();
    return pieColors[name];
  });

  const truncatedLabels = labels.map(name => truncateLabel(name, 25));

  weeklyChart.data.labels = truncatedLabels;
  weeklyChart.data.datasets[0].data = data;
  weeklyChart.data.datasets[0].backgroundColor = backgroundColors;

  weeklyChart.update();
  // -----------------------------
// WEEKLY TOP 10 LIST
// -----------------------------
const weeklyList = document.getElementById("weeklyTopTenList");
weeklyList.innerHTML = "";

const combined = labels.map((name, i) => ({
  name,
  time: data[i]
}));

combined.sort((a, b) => b.time - a.time);

const topTen = combined.slice(0, 10);

topTen.forEach(item => {
  const li = document.createElement("li");
  li.innerHTML = `
    <span class="weekly-app-name">${truncateLabel(item.name, 30)}</span>
    <span class="weekly-app-time">${formatTime(item.time)} min</span>
  `;
  weeklyList.appendChild(li);
});

});

const weeklyCtx = document.getElementById("weeklyChart").getContext("2d");

const weeklyChart = new Chart(weeklyCtx, {
  type: "bar",
  data: {
    labels: [],
  datasets: [{
  label: "Weekly Usage",
  data: [],
  backgroundColor: [],
  borderColor: "#1e1e1e",
  borderWidth: 2,
  barThickness: 20,  
  maxBarThickness: 30,
  }]

  },
  options: {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    scales: {
      x: {
        ticks: { color: "#ccc" },
        grid: { color: "rgba(255,255,255,0.1)" }
      },
      y: {
        ticks: { color: "#ccc" },
        grid: { color: "rgba(255,255,255,0.1)" }
      }
    }
  }
});
document.getElementById("weeklyChart").addEventListener("click", (evt) => {
  const points = weeklyChart.getElementsAtEventForMode(
    evt,
    "nearest",
    { intersect: false },
    false
  );

  if (!points.length) return;

  const index = points[0].index;

  weeklyChart._expanded[index] = !weeklyChart._expanded[index];

  weeklyChart.data.labels[index] =
    weeklyChart._expanded[index]
      ? weeklyChart._fullLabels[index]
      : weeklyChart._shortLabels[index];

  weeklyChart.update();
});

