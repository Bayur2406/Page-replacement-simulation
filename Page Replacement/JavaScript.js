// ─── FIFO ────────────────────────────────────────────────
function simulateFIFO(refs, nf) {
  let frames = new Array(nf).fill(null);
  let queue = [];
  let steps = [];
  for (let i = 0; i < refs.length; i++) {
    let p = refs[i];
    if (frames.includes(p)) {
      steps.push({ page: p, frames: [...frames], fault: false, victim: null,
        note: `Hit: halaman ${p} sudah ada di frame` });
    } else {
      let victim = null, victimIdx = -1;
      if (frames.includes(null)) {
        victimIdx = frames.indexOf(null);
      } else {
        victim = queue.shift();
        victimIdx = frames.indexOf(victim);
      }
      frames[victimIdx] = p;
      queue.push(p);
      steps.push({ page: p, frames: [...frames], fault: true, victim, victimIdx,
        note: victim !== null ? `Fault: ganti halaman ${victim} (FIFO, masuk pertama)`
                              : `Fault: isi frame kosong dengan halaman ${p}` });
    }
  }
  return steps;
}

// ─── LRU ────────────────────────────────────────────────
function simulateLRU(refs, nf) {
  let frames = new Array(nf).fill(null);
  let steps = [], lastUsed = {};
  for (let i = 0; i < refs.length; i++) {
    let p = refs[i];
    if (frames.includes(p)) {
      lastUsed[p] = i;
      steps.push({ page: p, frames: [...frames], fault: false, victim: null,
        note: `Hit: halaman ${p} ada di frame, waktu akses diperbarui` });
    } else {
      let victim = null, victimIdx = -1;
      if (frames.includes(null)) {
        victimIdx = frames.indexOf(null);
      } else {
        let minTime = Infinity;
        for (let j = 0; j < frames.length; j++) {
          let t = lastUsed[frames[j]] ?? -1;
          if (t < minTime) { minTime = t; victim = frames[j]; victimIdx = j; }
        }
      }
      frames[victimIdx] = p;
      lastUsed[p] = i;
      steps.push({ page: p, frames: [...frames], fault: true, victim, victimIdx,
        note: victim !== null ? `Fault: ganti ${victim} (paling lama tidak digunakan)`
                              : `Fault: isi frame kosong dengan ${p}` });
    }
  }
  return steps;
}

// ─── OPT ────────────────────────────────────────────────
function simulateOPT(refs, nf) {
  let frames = new Array(nf).fill(null);
  let steps = [];
  for (let i = 0; i < refs.length; i++) {
    let p = refs[i];
    if (frames.includes(p)) {
      steps.push({ page: p, frames: [...frames], fault: false, victim: null,
        note: `Hit: halaman ${p} sudah ada di frame` });
    } else {
      let victim = null, victimIdx = -1;
      if (frames.includes(null)) {
        victimIdx = frames.indexOf(null);
      } else {
        let maxNext = -1;
        for (let j = 0; j < frames.length; j++) {
          let nextUse = refs.indexOf(frames[j], i + 1);
          if (nextUse === -1) { victim = frames[j]; victimIdx = j; break; }
          if (nextUse > maxNext) { maxNext = nextUse; victim = frames[j]; victimIdx = j; }
        }
      }
      frames[victimIdx] = p;
      steps.push({ page: p, frames: [...frames], fault: true, victim, victimIdx,
        note: victim !== null ? `Fault: ganti ${victim} (paling lama tidak akan dipakai berikutnya)`
                              : `Fault: isi frame kosong dengan ${p}` });
    }
  }
  return steps;
}

const scenarios = {
  1: {
    refs: [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2],
    frames: 3,
    algorithm: "fifo",
    title: "Skenario 1 — Klasik FIFO",
    description: "Contoh umum untuk melihat page fault dan page hit pada algoritma FIFO."
  },
  2: {
    refs: [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5],
    frames: 3,
    algorithm: "fifo",
    title: "Skenario 2 — Belady's Anomaly",
    description: "Urutan referensi klasik untuk memperlihatkan Belady's Anomaly pada FIFO."
  },
  3: {
    refs: [1, 2, 3, 1, 2, 3, 4, 1, 2, 3, 4, 1, 2],
    frames: 3,
    algorithm: "lru",
    title: "Skenario 3 — Lokalitas Temporal",
    description: "Halaman yang sama diakses kembali dalam rentang dekat untuk menggambarkan lokalitas temporal."
  }
};

const algorithms = {
  fifo: { label: "FIFO", simulate: simulateFIFO },
  lru: { label: "LRU", simulate: simulateLRU },
  opt: { label: "OPT", simulate: simulateOPT }
};

let simulation = null;
let currentStep = 0;
let autoplayTimer = null;
let faultChart = null;
let compareChart = null;

function byId(id) {
  return document.getElementById(id);
}

function setError(message) {
  byId("errMsg").textContent = message;
}

function setCompareError(message) {
  byId("cmpErrMsg").textContent = message;
}

function parseReferenceString(value) {
  const tokens = value.trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) {
    throw new Error("Masukkan minimal satu angka pada reference string.");
  }
  if (tokens.length > 20) {
    throw new Error("Reference string maksimal 20 angka.");
  }
  if (tokens.some(token => !/^\d+$/.test(token))) {
    throw new Error("Reference string hanya boleh berisi angka positif atau nol.");
  }
  return tokens.map(Number);
}

function parseFrameCount(value) {
  const frames = Number(value);
  if (!Number.isInteger(frames) || frames < 1 || frames > 6) {
    throw new Error("Jumlah frame harus berupa bilangan bulat antara 1 dan 6.");
  }
  return frames;
}

function validateInput() {
  const input = byId("refString");
  input.setCustomValidity("");
  try {
    parseReferenceString(input.value);
    setError("");
    return true;
  } catch (error) {
    input.setCustomValidity(error.message);
    setError(error.message);
    return false;
  }
}

function switchTab(tabName, button) {
  ["sim", "guide", "compare"].forEach(name => {
    byId(`tab-${name}`).classList.toggle("hidden", name !== tabName);
  });
  document.querySelectorAll(".tab-btn").forEach(tabButton => {
    tabButton.classList.toggle("active", tabButton === button);
  });
  if (tabName !== "sim") stopAutoplay();
}

function loadScenario(number) {
  const scenario = scenarios[number];
  if (!scenario) {
    setCompareError("Skenario tidak ditemukan.");
    return;
  }
  byId("refString").value = scenario.refs.join(" ");
  byId("numFrames").value = scenario.frames;
  byId("algorithm").value = scenario.algorithm;
  byId("refString").setCustomValidity("");
  setError("");
}

function loadCmpScenario(number) {
  const scenario = scenarios[number];
  if (!scenario) {
    setError("Skenario tidak ditemukan.");
    return;
  }
  byId("cmpRef").value = scenario.refs.join(" ");
  byId("cmpFrames").value = scenario.frames;
  byId("scenarioTitle").textContent = scenario.title;
  byId("scenarioText").textContent = scenario.description;
  byId("scenarioDesc").classList.remove("hidden");
  setCompareError("");
}

function randomize() {
  const length = 8 + Math.floor(Math.random() * 7);
  const refs = Array.from({ length }, () => Math.floor(Math.random() * 10));
  byId("refString").value = refs.join(" ");
  byId("refString").setCustomValidity("");
  setError("");
}

function runSimulation() {
  stopAutoplay();
  try {
    const refs = parseReferenceString(byId("refString").value);
    const frameCount = parseFrameCount(byId("numFrames").value);
    const algorithm = algorithms[byId("algorithm").value];
    if (!algorithm) throw new Error("Pilih algoritma yang tersedia.");

    simulation = {
      refs,
      frameCount,
      algorithm: algorithm.label,
      steps: algorithm.simulate(refs, frameCount)
    };
    currentStep = 0;
    setError("");
    byId("resultArea").classList.remove("hidden");
    ["stepBtn", "autoBtn", "resetBtn"].forEach(id => {
      byId(id).style.display = "";
    });
    renderSimulation();
  } catch (error) {
    setError(error.message);
  }
}

function renderSimulation() {
  if (!simulation) return;

  const { refs, frameCount, steps, algorithm } = simulation;
  const faults = steps.filter(step => step.fault).length;
  const hits = steps.length - faults;
  byId("statAlgo").textContent = algorithm;
  byId("statFault").textContent = faults;
  byId("statHit").textContent = hits;
  byId("statRatio").textContent = `${((hits / steps.length) * 100).toFixed(1)}%`;
  byId("stepLabel").textContent = `Langkah ${currentStep} / ${steps.length}`;
  byId("progressFill").style.width = `${(currentStep / steps.length) * 100}%`;

  byId("refRow").replaceChildren(...refs.map((page, index) => {
    const badge = document.createElement("span");
    badge.className = "px-2 py-1 text-sm font-mono bg-[var(--background)]";
    badge.textContent = page;
    if (index === currentStep - 1) badge.classList.add("ref-active");
    if (index < currentStep) badge.classList.add(steps[index].fault ? "ref-fault" : "ref-hit");
    return badge;
  }));

  const initialFrames = new Array(frameCount).fill(null);
  byId("frameGrid").replaceChildren(...steps.map((step, index) => {
    const column = document.createElement("div");
    column.className = "flex flex-col items-center gap-1";
    column.style.opacity = index < currentStep ? "1" : index === currentStep - 1 ? "1" : "0.45";
    const pageLabel = document.createElement("span");
    pageLabel.className = "text-xs text-[var(--muted-foreground)]";
    pageLabel.textContent = refs[index];
    column.append(pageLabel);

    step.frames.forEach((page, frameIndex) => {
      const cell = document.createElement("div");
      cell.className = `frame-cell ${page === null ? "cell-empty" : step.fault ? "cell-fault" : "cell-hit"}`;
      cell.textContent = page === null ? "—" : page;
      if (step.victimIdx === frameIndex) cell.classList.add("cell-victim");
      column.append(cell);
    });
    return column;
  }));

  byId("stepTable").replaceChildren(...steps.map((step, index) => {
    const row = document.createElement("tr");
    row.className = "step-row border-b border-[var(--border)]";
    if (index === currentStep - 1) row.classList.add("step-current");
    const values = [
      index + 1,
      step.page,
      step.fault ? "Fault" : "Hit",
      `[${step.frames.map(page => page === null ? "—" : page).join(", ")}]`,
      step.note
    ];
    values.forEach((value, column) => {
      const cell = document.createElement("td");
      cell.className = column === 1 || column === 2 ? "py-2 text-center" : "py-2";
      cell.textContent = value;
      if (column === 2) cell.classList.add(step.fault ? "text-red-400" : "text-green-400");
      row.append(cell);
    });
    return row;
  }));

  byId("stepBtn").disabled = currentStep >= steps.length;
  byId("autoBtn").disabled = currentStep >= steps.length && !autoplayTimer;
  renderFaultChart(steps);
}

function stepMode() {
  if (!simulation || currentStep >= simulation.steps.length) return;
  currentStep += 1;
  renderSimulation();
}

function autoPlay() {
  if (autoplayTimer) {
    stopAutoplay();
    return;
  }
  if (!simulation || currentStep >= simulation.steps.length) return;
  byId("autoBtn").textContent = "Jeda pemutaran";
  autoplayTimer = window.setInterval(() => {
    if (currentStep >= simulation.steps.length) {
      stopAutoplay();
      return;
    }
    stepMode();
    if (currentStep >= simulation.steps.length) stopAutoplay();
  }, 700);
}

function stopAutoplay() {
  if (autoplayTimer) {
    window.clearInterval(autoplayTimer);
    autoplayTimer = null;
  }
  const button = byId("autoBtn");
  if (button) button.textContent = "Putar otomatis";
  if (simulation) {
    const done = currentStep >= simulation.steps.length;
    byId("autoBtn").disabled = done;
  }
}

function resetSim() {
  stopAutoplay();
  simulation = null;
  currentStep = 0;
  byId("resultArea").classList.add("hidden");
  ["stepBtn", "autoBtn", "resetBtn"].forEach(id => {
    byId(id).style.display = "none";
    byId(id).disabled = false;
  });
  byId("autoBtn").textContent = "Putar otomatis";
  if (faultChart) {
    faultChart.destroy();
    faultChart = null;
  }
}

function renderFaultChart(steps) {
  if (typeof Chart === "undefined") return;
  const cumulativeFaults = [];
  let totalFaults = 0;
  steps.forEach(step => {
    if (step.fault) totalFaults += 1;
    cumulativeFaults.push(totalFaults);
  });
  if (faultChart) faultChart.destroy();
  faultChart = new Chart(byId("faultChart"), {
    type: "line",
    data: {
      labels: steps.map((_, index) => index + 1),
      datasets: [{
        label: "Page fault kumulatif",
        data: cumulativeFaults,
        borderColor: "#83b79b",
        backgroundColor: "rgba(131, 183, 155, 0.14)",
        fill: true,
        tension: 0.25
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { ticks: { color: "#9aa79f" }, grid: { color: "rgba(154, 167, 159, 0.12)" } },
        y: { ticks: { color: "#9aa79f" }, grid: { color: "rgba(154, 167, 159, 0.12)" } }
      },
      plugins: { legend: { labels: { color: "#d5e0d9" } } }
    }
  });
}

function runCompare() {
  try {
    const refs = parseReferenceString(byId("cmpRef").value);
    const frameCount = parseFrameCount(byId("cmpFrames").value);
    const results = Object.entries(algorithms).map(([key, algorithm]) => ({
      key,
      label: algorithm.label,
      steps: algorithm.simulate(refs, frameCount)
    }));
    byId("compareResult").classList.remove("hidden");
    byId("cmpCards").replaceChildren(...results.map(result => {
      const faults = result.steps.filter(step => step.fault).length;
      const card = document.createElement("div");
      card.className = "stat-box";
      const title = document.createElement("div");
      title.className = "text-sm text-[var(--muted-foreground)]";
      title.textContent = result.label;
      const count = document.createElement("div");
      count.className = "text-2xl font-bold text-red-400";
      count.textContent = `${faults} fault`;
      const ratio = document.createElement("div");
      ratio.className = "text-xs text-[var(--muted-foreground)]";
      ratio.textContent = `${(100 * faults / refs.length).toFixed(1)}% page fault`;
      card.append(title, count, ratio);
      return card;
    }));
    if (byId("scenarioDesc").classList.contains("hidden")) {
      byId("scenarioTitle").textContent = "";
      byId("scenarioText").textContent = "";
    }
    renderCompareChart(results, refs.length);
    setCompareError("");
  } catch (error) {
    setCompareError(error.message);
  }
}

function renderCompareChart(results, referenceCount) {
  if (typeof Chart === "undefined") return;
  const datasets = results.map((result, index) => {
    let faults = 0;
    return {
      label: result.label,
      data: result.steps.map(step => {
        if (step.fault) faults += 1;
        return faults;
      }),
      borderColor: ["#83b79b", "#91b8c8", "#d2ad78"][index],
      tension: 0.25
    };
  });
  if (compareChart) compareChart.destroy();
  compareChart = new Chart(byId("cmpChart"), {
    type: "line",
    data: {
      labels: Array.from({ length: referenceCount }, (_, index) => index + 1),
      datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { ticks: { color: "#9aa79f" }, grid: { color: "rgba(154, 167, 159, 0.12)" } },
        y: { ticks: { color: "#9aa79f" }, grid: { color: "rgba(154, 167, 159, 0.12)" } }
      },
      plugins: { legend: { labels: { color: "#d5e0d9" } } }
    }
  });
}