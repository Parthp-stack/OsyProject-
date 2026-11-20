
/* ==========================================================================
   OS Microproject: CPU Scheduling, Banker's Algorithm & Paging Algorithms
   Realistic Working, Step-by-Step Simulation, Theory & Exam Tricks
   ========================================================================== */

// --------------------------------------------------------------------------
// TAB SWITCHING LOGIC
// --------------------------------------------------------------------------
function switchTab(tabId) {
  document.querySelectorAll(".tab-content").forEach(el => el.classList.remove("active"));
  document.querySelectorAll(".tab-btn").forEach(el => el.classList.remove("active"));

  const targetTab = document.getElementById(tabId);
  const targetBtn = document.getElementById("tab-btn-" + tabId);

  if (targetTab) targetTab.classList.add("active");
  if (targetBtn) targetBtn.classList.add("active");
}

// --------------------------------------------------------------------------
// 1. CPU SCHEDULING (PRESERVED & ENHANCED)
// --------------------------------------------------------------------------
let processes = [];

function addProcess() {
  const pnameInput = document.getElementById("pname");
  const btInput = document.getElementById("bt");
  const atInput = document.getElementById("at");
  const prInput = document.getElementById("priority");

  const pname = pnameInput.value.trim() || `P${processes.length + 1}`;
  const bt = parseInt(btInput.value);
  const at = parseInt(atInput.value);
  const pr = prInput.value !== "" ? parseInt(prInput.value) : null;

  if (isNaN(bt) || isNaN(at)) {
    alert("Please enter valid Burst Time and Arrival Time.");
    return;
  }

  processes.push({ pname, bt, at, pr });
  updateTable();
  document.getElementById("processForm").reset();
  pnameInput.focus();
}

function deleteProcess(index) {
  processes.splice(index, 1);
  updateTable();
}

function clearProcesses() {
  processes = [];
  updateTable();
  document.getElementById("results-table").innerHTML = "";
  document.getElementById("gantt-chart").innerHTML = "";
}

function loadSampleProcesses() {
  processes = [
    { pname: "P1", bt: 4, at: 0, pr: 2 },
    { pname: "P2", bt: 3, at: 1, pr: 1 },
    { pname: "P3", bt: 1, at: 2, pr: 4 },
    { pname: "P4", bt: 2, at: 3, pr: 3 },
    { pname: "P5", bt: 5, at: 4, pr: 5 }
  ];
  updateTable();
}

function updateTable() {
  const tbody = document.querySelector("#processTable tbody");
  tbody.innerHTML = "";
  if (processes.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="color:#888;">No processes added yet. Click "+ Add Process" or "Load Sample Processes".</td></tr>`;
    return;
  }

  processes.forEach((p, i) => {
    const row = `<tr>
      <td><strong>${p.pname}</strong></td>
      <td>${p.bt}</td>
      <td>${p.at}</td>
      <td>${p.pr ?? "-"}</td>
      <td><button onclick="deleteProcess(${i})" class="btn-danger" style="padding:4px 8px;font-size:0.8rem;">❌</button></td>
    </tr>`;
    tbody.innerHTML += row;
  });
}

function calculate(algo) {
  if (processes.length === 0) {
    alert("Please add at least one process first.");
    return;
  }

  let output;
  if (algo === "fcfs") {
    output = fcfs(processes);
  } else if (algo === "sjf") {
    output = sjf(processes);
  } else if (algo === "srtf") {
    output = srtf(processes);
  } else if (algo === "rr") {
    let qInput = prompt("Enter Time Quantum for Round Robin:", "2");
    if (qInput === null) return;
    let quantum = parseInt(qInput);
    if (isNaN(quantum) || quantum <= 0) {
      alert("Invalid Time Quantum. Must be a positive integer.");
      return;
    }
    output = rr(processes, quantum);
  } else if (algo === "priority") {
    const missingPriority = processes.some(p => p.pr === null || isNaN(p.pr));
    if (missingPriority) {
      alert("Note: One or more processes do not have a Priority specified. Treating missing priority as 999 (lowest).");
    }
    output = priority(processes);
  }

  if (output) {
    displayResults(output.results, output.gantt);
  }
}

// FCFS
function fcfs(procs) {
  let time = 0;
  let results = [];
  let gantt = [];
  let totalTAT = 0, totalWT = 0;
  let sorted = [...procs].sort((a, b) => a.at - b.at);

  sorted.forEach(p => {
    if (time < p.at) {
      gantt.push({ pid: "Idle", start: time, end: p.at, isIdle: true });
      time = p.at;
    }
    let start = time;
    time += p.bt;
    let ct = time;
    let tat = ct - p.at;
    let wt = tat - p.bt;
    let rt = start - p.at;

    results.push({
      pid: p.pname,
      arrival: p.at,
      burst: p.bt,
      completion: ct,
      tat, wt, rt
    });

    gantt.push({ pid: p.pname, start, end: ct });
    totalTAT += tat;
    totalWT += wt;
  });

  return { results, gantt };
}

// SJF (Non-preemptive)
function sjf(procs) {
  let time = 0, completed = [];
  let results = [], gantt = [];
  let totalTAT = 0, totalWT = 0;

  while (completed.length < procs.length) {
    let available = procs.filter(p => !completed.includes(p) && p.at <= time);
    if (available.length === 0) {
      let nextArrival = Math.min(...procs.filter(p => !completed.includes(p)).map(p => p.at));
      gantt.push({ pid: "Idle", start: time, end: nextArrival, isIdle: true });
      time = nextArrival;
      continue;
    }

    let shortest = available.reduce((a, b) => a.bt < b.bt ? a : b);
    let start = time;
    time += shortest.bt;
    let ct = time, tat = ct - shortest.at, wt = tat - shortest.bt;
    let rt = start - shortest.at;

    results.push({
      pid: shortest.pname,
      arrival: shortest.at,
      burst: shortest.bt,
      completion: ct,
      tat, wt, rt
    });
    gantt.push({ pid: shortest.pname, start, end: ct });
    totalTAT += tat; totalWT += wt;

    completed.push(shortest);
  }

  return { results, gantt };
}

// SRTF (Shortest Remaining Time First)
function srtf(procs) {
  let time = 0, completed = [], rem = procs.map(p => p.bt), n = procs.length;
  let ct = Array(n).fill(0), started = Array(n).fill(-1);
  let results = [], gantt = [];
  let lastPid = null;

  while (completed.length < n) {
    let idx = -1, min = 1e9;
    for (let i = 0; i < n; i++) {
      if (procs[i].at <= time && rem[i] > 0 && rem[i] < min) {
        min = rem[i]; idx = i;
      }
    }
    if (idx === -1) {
      if (lastPid !== "Idle") {
        if (lastPid !== null) gantt[gantt.length - 1].end = time;
        gantt.push({ pid: "Idle", start: time, end: null, isIdle: true });
        lastPid = "Idle";
      }
      time++;
      continue;
    }

    if (lastPid !== procs[idx].pname) {
      if (lastPid !== null) gantt[gantt.length - 1].end = time;
      gantt.push({ pid: procs[idx].pname, start: time, end: null });
      lastPid = procs[idx].pname;
    }

    if (started[idx] === -1) { started[idx] = time; }
    rem[idx]--; time++;

    if (rem[idx] === 0) {
      ct[idx] = time;
      completed.push(procs[idx]);
    }
  }
  if (gantt.length > 0) gantt[gantt.length - 1].end = time;

  for (let i = 0; i < n; i++) {
    let tat = ct[i] - procs[i].at;
    let wt = tat - procs[i].bt;
    let rt = (started[i] !== -1 ? started[i] : procs[i].at) - procs[i].at;
    results.push({
      pid: procs[i].pname,
      arrival: procs[i].at,
      burst: procs[i].bt,
      completion: ct[i],
      tat, wt, rt
    });
  }

  return { results, gantt };
}

// Round Robin
function rr(procs, q) {
  let time = 0, rem = procs.map(p => p.bt), n = procs.length;
  let ct = Array(n).fill(0), started = Array(n).fill(-1);
  let results = [], gantt = [];
  let done = 0;

  while (done < n) {
    let progressed = false;
    for (let i = 0; i < n; i++) {
      if (procs[i].at <= time && rem[i] > 0) {
        let run = Math.min(q, rem[i]);
        if (started[i] === -1) { started[i] = time; }
        gantt.push({ pid: procs[i].pname, start: time, end: time + run });
        time += run;
        rem[i] -= run;
        if (rem[i] === 0) { ct[i] = time; done++; }
        progressed = true;
      }
    }
    if (!progressed) {
      let nextArrival = Math.min(...procs.filter((p, i) => rem[i] > 0).map(p => p.at));
      if (nextArrival > time) {
        gantt.push({ pid: "Idle", start: time, end: nextArrival, isIdle: true });
        time = nextArrival;
      } else {
        time++;
      }
    }
  }

  for (let i = 0; i < n; i++) {
    let tat = ct[i] - procs[i].at;
    let wt = tat - procs[i].bt;
    let rt = started[i] - procs[i].at;
    results.push({
      pid: procs[i].pname,
      arrival: procs[i].at,
      burst: procs[i].bt,
      completion: ct[i],
      tat, wt, rt
    });
  }

  return { results, gantt };
}

// Priority Scheduling (Non-preemptive, lower number = higher priority)
function priority(procs) {
  let time = 0, completed = [];
  let results = [], gantt = [];

  while (completed.length < procs.length) {
    let available = procs.filter(p => !completed.includes(p) && p.at <= time);
    if (available.length === 0) {
      let nextArrival = Math.min(...procs.filter(p => !completed.includes(p)).map(p => p.at));
      gantt.push({ pid: "Idle", start: time, end: nextArrival, isIdle: true });
      time = nextArrival;
      continue;
    }

    let chosen = available.reduce((a, b) => {
      let prA = a.pr ?? 999;
      let prB = b.pr ?? 999;
      return prA < prB ? a : b;
    });

    let start = time;
    time += chosen.bt;
    let ct = time, tat = ct - chosen.at, wt = tat - chosen.bt, rt = start - chosen.at;

    results.push({
      pid: chosen.pname,
      arrival: chosen.at,
      burst: chosen.bt,
      completion: ct,
      tat, wt, rt
    });
    gantt.push({ pid: chosen.pname, start, end: ct });
    completed.push(chosen);
  }

  return { results, gantt };
}

function displayResults(results, gantt) {
  // Results Table
  let table = `<div class="table-wrapper"><table border="1">
    <thead>
      <tr><th>Process</th><th>Arrival Time (AT)</th><th>Burst Time (BT)</th><th>Completion Time (CT)</th>
      <th>Turnaround Time (TAT)</th><th>Waiting Time (WT)</th><th>Response Time (RT)</th></tr>
    </thead><tbody>`;
  let totalTAT = 0, totalWT = 0, totalRT = 0;

  results.forEach(r => {
    table += `<tr>
      <td><strong>${r.pid}</strong></td><td>${r.arrival}</td><td>${r.burst}</td>
      <td>${r.completion}</td><td>${r.tat}</td><td>${r.wt}</td><td>${r.rt}</td>
    </tr>`;
    totalTAT += r.tat;
    totalWT += r.wt;
    totalRT += r.rt;
  });

  table += `</tbody></table></div>`;

  const avgTAT = (totalTAT / results.length).toFixed(2);
  const avgWT = (totalWT / results.length).toFixed(2);
  const avgRT = (totalRT / results.length).toFixed(2);

  table += `<div class="stats-grid">
    <div class="stat-card"><div class="stat-label">Average TAT</div><div class="stat-value">${avgTAT}</div></div>
    <div class="stat-card"><div class="stat-label">Average WT</div><div class="stat-value">${avgWT}</div></div>
    <div class="stat-card"><div class="stat-label">Average RT</div><div class="stat-value">${avgRT}</div></div>
  </div>`;
  document.getElementById("results-table").innerHTML = table;

  // Gantt Chart
  let chart = `<h4>Timeline / Gantt Chart</h4><div class="gantt-container">`;
  gantt.forEach(g => {
    const bg = g.isIdle ? "#94a3b8" : "#2563eb";
    chart += `<div class="gantt-block" style="background:${bg};">
      ${g.pid}<br><small>${g.start} → ${g.end}</small>
    </div>`;
  });
  chart += `</div>`;
  document.getElementById("gantt-chart").innerHTML = chart;
}


// --------------------------------------------------------------------------
// 2. BANKER'S ALGORITHM (DEADLOCK AVOIDANCE)
// --------------------------------------------------------------------------
let bankerConfig = {
  n: 5, // Processes P0 - P4
  m: 3  // Resources A, B, C
};

function getResourceName(j) {
  return String.fromCharCode(65 + j); // 0 -> A, 1 -> B, 2 -> C
}

function initBankerInputs(n = 5, m = 3) {
  bankerConfig.n = n;
  bankerConfig.m = m;

  // Render Allocation Matrix
  let allocHtml = `<table class="matrix-input-table"><thead><tr><th>PID</th>`;
  for (let j = 0; j < m; j++) allocHtml += `<th>${getResourceName(j)}</th>`;
  allocHtml += `</tr></thead><tbody>`;
  for (let i = 0; i < n; i++) {
    allocHtml += `<tr><td><strong>P${i}</strong></td>`;
    for (let j = 0; j < m; j++) {
      allocHtml += `<td><input type="number" min="0" id="banker-alloc-${i}-${j}" value="0"></td>`;
    }
    allocHtml += `</tr>`;
  }
  allocHtml += `</tbody></table>`;
  document.getElementById("banker-alloc-container").innerHTML = allocHtml;

  // Render Max Matrix
  let maxHtml = `<table class="matrix-input-table"><thead><tr><th>PID</th>`;
  for (let j = 0; j < m; j++) maxHtml += `<th>${getResourceName(j)}</th>`;
  maxHtml += `</tr></thead><tbody>`;
  for (let i = 0; i < n; i++) {
    maxHtml += `<tr><td><strong>P${i}</strong></td>`;
    for (let j = 0; j < m; j++) {
      maxHtml += `<td><input type="number" min="0" id="banker-max-${i}-${j}" value="0"></td>`;
    }
    maxHtml += `</tr>`;
  }
  maxHtml += `</tbody></table>`;
  document.getElementById("banker-max-container").innerHTML = maxHtml;

  // Render Available Vector
  let availHtml = `<table class="matrix-input-table"><thead><tr>`;
  for (let j = 0; j < m; j++) availHtml += `<th>${getResourceName(j)}</th>`;
  availHtml += `</tr></thead><tbody><tr>`;
  for (let j = 0; j < m; j++) {
    availHtml += `<td><input type="number" min="0" id="banker-avail-${j}" value="0"></td>`;
  }
  availHtml += `</tr></tbody></table>`;
  document.getElementById("banker-avail-container").innerHTML = availHtml;

  // Update Request Process dropdown
  const reqProcSelect = document.getElementById("banker-req-proc");
  if (reqProcSelect) {
    reqProcSelect.innerHTML = "";
    for (let i = 0; i < n; i++) {
      reqProcSelect.innerHTML += `<option value="${i}">Process P${i}</option>`;
    }
  }

  // Update Request Vector inputs
  const reqVecContainer = document.getElementById("banker-req-vec-container");
  if (reqVecContainer) {
    let reqVecHtml = "";
    for (let j = 0; j < m; j++) {
      reqVecHtml += `<label style="display:inline-flex;align-items:center;margin-right:8px;font-size:0.9rem;">
        ${getResourceName(j)}: <input type="number" min="0" id="banker-req-${j}" value="0" style="width:50px;margin-left:4px;padding:4px;text-align:center;">
      </label>`;
    }
    reqVecContainer.innerHTML = reqVecHtml;
  }
}

function loadBankerExample() {
  initBankerInputs(5, 3);
  // Standard Galvin Textbook Example
  const alloc = [
    [0, 1, 0],
    [2, 0, 0],
    [3, 0, 2],
    [2, 1, 1],
    [0, 0, 2]
  ];
  const max = [
    [7, 5, 3],
    [3, 2, 2],
    [9, 0, 2],
    [2, 2, 2],
    [4, 3, 3]
  ];
  const avail = [3, 3, 2];

  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 3; j++) {
      document.getElementById(`banker-alloc-${i}-${j}`).value = alloc[i][j];
      document.getElementById(`banker-max-${i}-${j}`).value = max[i][j];
    }
  }
  for (let j = 0; j < 3; j++) {
    document.getElementById(`banker-avail-${j}`).value = avail[j];
  }

  // Preset request inputs for convenience
  document.getElementById("banker-req-proc").value = "1";
  document.getElementById("banker-req-0").value = "1";
  document.getElementById("banker-req-1").value = "0";
  document.getElementById("banker-req-2").value = "2";

  runBankerAlgorithm();
}

function loadBankerUnsafeExample() {
  initBankerInputs(4, 3);
  // Unsafe Deadlock Example
  const alloc = [
    [2, 1, 1],
    [1, 2, 0],
    [3, 1, 2],
    [1, 1, 1]
  ];
  const max = [
    [5, 4, 3],
    [4, 4, 2],
    [6, 3, 4],
    [3, 3, 3]
  ];
  const avail = [1, 0, 0];

  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 3; j++) {
      document.getElementById(`banker-alloc-${i}-${j}`).value = alloc[i][j];
      document.getElementById(`banker-max-${i}-${j}`).value = max[i][j];
    }
  }
  for (let j = 0; j < 3; j++) {
    document.getElementById(`banker-avail-${j}`).value = avail[j];
  }

  runBankerAlgorithm();
}

function extractBankerState() {
  const n = bankerConfig.n;
  const m = bankerConfig.m;
  let alloc = [], max = [], avail = [];

  for (let i = 0; i < n; i++) {
    alloc[i] = [];
    max[i] = [];
    for (let j = 0; j < m; j++) {
      alloc[i][j] = parseInt(document.getElementById(`banker-alloc-${i}-${j}`).value) || 0;
      max[i][j] = parseInt(document.getElementById(`banker-max-${i}-${j}`).value) || 0;
    }
  }
  for (let j = 0; j < m; j++) {
    avail[j] = parseInt(document.getElementById(`banker-avail-${j}`).value) || 0;
  }

  return { n, m, alloc, max, avail };
}

function runBankerAlgorithm() {
  const { n, m, alloc, max, avail } = extractBankerState();

  // Compute Need Matrix = Max - Allocation
  let need = [];
  for (let i = 0; i < n; i++) {
    need[i] = [];
    for (let j = 0; j < m; j++) {
      need[i][j] = max[i][j] - alloc[i][j];
      if (need[i][j] < 0) {
        alert(`Error: Allocation exceeds Max for Process P${i}, Resource ${getResourceName(j)}.`);
        return;
      }
    }
  }

  // Display Need Matrix Table
  let needHtml = `<div class="table-wrapper"><table class="matrix-input-table"><thead><tr><th>PID</th>`;
  for (let j = 0; j < m; j++) needHtml += `<th>${getResourceName(j)}</th>`;
  needHtml += `</tr></thead><tbody>`;
  for (let i = 0; i < n; i++) {
    needHtml += `<tr><td><strong>P${i}</strong></td>`;
    for (let j = 0; j < m; j++) {
      needHtml += `<td><span class="badge badge-info" style="font-size:0.95rem;">${need[i][j]}</span></td>`;
    }
    needHtml += `</tr>`;
  }
  needHtml += `</tbody></table></div>`;
  document.getElementById("banker-need-container").innerHTML = needHtml;

  // Execute Safety Algorithm
  let work = [...avail];
  let finish = Array(n).fill(false);
  let safeSeq = [];
  let logHtml = "";

  logHtml += `<div class="step-card"><strong>[Initialization]</strong> Initial Work = [${work.join(", ")}], Finish = [${finish.map(f => f ? "T" : "F").join(", ")}]</div>`;

  let stepCount = 1;
  let count = 0;

  while (count < n) {
    let found = false;
    for (let i = 0; i < n; i++) {
      if (!finish[i]) {
        // Check if Need[i] <= Work
        let possible = true;
        let checks = [];
        for (let j = 0; j < m; j++) {
          checks.push(`${getResourceName(j)}: ${need[i][j]} ≤ ${work[j]}`);
          if (need[i][j] > work[j]) {
            possible = false;
          }
        }

        if (possible) {
          let oldWork = [...work];
          for (let j = 0; j < m; j++) {
            work[j] += alloc[i][j];
          }
          finish[i] = true;
          safeSeq.push(`P${i}`);
          found = true;
          count++;

          logHtml += `<div class="step-card success">
            <strong>Step ${stepCount++}: Evaluating P${i}</strong><br>
            • Condition Need ≤ Work: (${checks.join(", ")}) → <span class="badge badge-success">TRUE</span><br>
            • Process P${i} finishes safely & releases allocation: [${alloc[i].join(", ")}]<br>
            • Updated Work = [${oldWork.join(", ")}] + [${alloc[i].join(", ")}] = <strong>[${work.join(", ")}]</strong><br>
            • Current Safe Sequence: [${safeSeq.join(" → ")}]
          </div>`;
          break; // restart scan
        }
      }
    }

    if (!found) {
      break;
    }
  }

  // Display Verdict Banner & Safe Sequence
  const outputContainer = document.getElementById("banker-output");
  if (safeSeq.length === n) {
    outputContainer.innerHTML = `
      <div class="status-banner safe">
        <span>✅ <strong>SYSTEM IS IN A SAFE STATE!</strong></span>
        <div>Safe Sequence: <span style="font-size:1.15rem;letter-spacing:1px;font-family:monospace;">${safeSeq.join(" ➔ ")}</span></div>
      </div>
      <h4>Step-by-Step Safety Algorithm Execution Trace:</h4>
      <div class="log-box">${logHtml}</div>
    `;
  } else {
    let deadlocked = [];
    for (let i = 0; i < n; i++) {
      if (!finish[i]) deadlocked.push(`P${i}`);
    }
    outputContainer.innerHTML = `
      <div class="status-banner unsafe">
        <span>⚠️ <strong>SYSTEM IS IN AN UNSAFE STATE! DEADLOCK DETECTED!</strong></span>
        <div>The system cannot satisfy the remaining requirements of: <strong>${deadlocked.join(", ")}</strong>.</div>
      </div>
      <h4>Step-by-Step Safety Algorithm Execution Trace:</h4>
      <div class="log-box">${logHtml}</div>
    `;
  }
}

// Test Resource Request Algorithm
function testResourceRequest() {
  const { n, m, alloc, max, avail } = extractBankerState();
  const procIndex = parseInt(document.getElementById("banker-req-proc").value);
  let request = [];

  for (let j = 0; j < m; j++) {
    request[j] = parseInt(document.getElementById(`banker-req-${j}`).value) || 0;
  }

  // Calculate Need
  let need = [];
  for (let i = 0; i < n; i++) {
    need[i] = [];
    for (let j = 0; j < m; j++) {
      need[i][j] = max[i][j] - alloc[i][j];
    }
  }

  const reqResultContainer = document.getElementById("banker-req-result");

  // Step 1: Request <= Need
  for (let j = 0; j < m; j++) {
    if (request[j] > need[procIndex][j]) {
      reqResultContainer.innerHTML = `
        <div class="status-banner unsafe">
          ❌ <strong>REQUEST DENIED (Step 1 Failed):</strong><br>
          Process P${procIndex} requested ${request[j]} of Resource ${getResourceName(j)}, which exceeds its declared Maximum Need (${need[procIndex][j]}). Process has exceeded its maximum claim!
        </div>`;
      return;
    }
  }

  // Step 2: Request <= Available
  for (let j = 0; j < m; j++) {
    if (request[j] > avail[j]) {
      reqResultContainer.innerHTML = `
        <div class="status-banner unsafe">
          ⏳ <strong>PROCESS MUST WAIT (Step 2 Failed):</strong><br>
          Process P${procIndex} requested ${request[j]} of Resource ${getResourceName(j)}, but only ${avail[j]} is currently Available.
        </div>`;
      return;
    }
  }

  // Step 3: Pretend to allocate
  let simAvail = [...avail];
  let simAlloc = alloc.map(row => [...row]);
  let simNeed = need.map(row => [...row]);

  for (let j = 0; j < m; j++) {
    simAvail[j] -= request[j];
    simAlloc[procIndex][j] += request[j];
    simNeed[procIndex][j] -= request[j];
  }

  // Run Safety on Tentative State
  let work = [...simAvail];
  let finish = Array(n).fill(false);
  let safeSeq = [];

  let count = 0;
  while (count < n) {
    let found = false;
    for (let i = 0; i < n; i++) {
      if (!finish[i]) {
        let possible = true;
        for (let j = 0; j < m; j++) {
          if (simNeed[i][j] > work[j]) {
            possible = false;
            break;
          }
        }
        if (possible) {
          for (let j = 0; j < m; j++) {
            work[j] += simAlloc[i][j];
          }
          finish[i] = true;
          safeSeq.push(`P${i}`);
          found = true;
          count++;
          break;
        }
      }
    }
    if (!found) break;
  }

  if (safeSeq.length === n) {
    reqResultContainer.innerHTML = `
      <div class="status-banner safe">
        🎉 <strong>REQUEST CAN BE GRANTED IMMEDIATELY!</strong><br>
        Granting request [${request.join(", ")}] to Process P${procIndex} leaves the system in a SAFE state.<br>
        Resulting Safe Sequence: <strong>${safeSeq.join(" ➔ ")}</strong>
      </div>`;
  } else {
    reqResultContainer.innerHTML = `
      <div class="status-banner unsafe">
        🚫 <strong>REQUEST CANNOT BE GRANTED (Unsafe State):</strong><br>
        Granting request [${request.join(", ")}] to Process P${procIndex} would leave the system in an UNSAFE state, risking Deadlock. P${procIndex} must wait!
      </div>`;
  }
}


// --------------------------------------------------------------------------
// 3. PAGING & PAGE REPLACEMENT ALGORITHMS
// --------------------------------------------------------------------------
function parsePageReferences() {
  const rawInput = document.getElementById("paging-references").value;
  // Splits by comma, space, tab, or semicolon
  const tokens = rawInput.split(/[\s,;]+/).filter(t => t.trim() !== "");
  const pages = tokens.map(t => parseInt(t)).filter(n => !isNaN(n));
  return pages;
}

function loadPagingTextbookExample() {
  document.getElementById("paging-references").value = "7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1";
  document.getElementById("paging-frames").value = 3;
  runPageReplacement();
}

function loadBeladyExample() {
  // Classic Belady's Anomaly Reference String
  document.getElementById("paging-references").value = "1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5";
  document.getElementById("paging-frames").value = 3;
  alert("Belady's Anomaly loaded! Try running with 3 frames (9 faults), then test with 4 frames (10 faults!) in FIFO.");
  runPageReplacement();
}

// FIFO Simulation
function simulateFIFO(pages, numFrames) {
  let frames = [];
  let history = [];
  let hits = 0, faults = 0;

  for (let t = 0; t < pages.length; t++) {
    const page = pages[t];
    let isHit = false;
    let replacedPage = null;

    if (frames.includes(page)) {
      isHit = true;
      hits++;
    } else {
      faults++;
      if (frames.length < numFrames) {
        frames.push(page);
      } else {
        replacedPage = frames.shift(); // Remove oldest (FIFO)
        frames.push(page);
      }
    }

    history.push({
      step: t + 1,
      page,
      frames: [...frames],
      isHit,
      replacedPage
    });
  }

  return { name: "FIFO (First In First Out)", pages, numFrames, history, hits, faults };
}

// LRU Simulation
function simulateLRU(pages, numFrames) {
  let frames = [];
  let lastUsed = {};
  let history = [];
  let hits = 0, faults = 0;

  for (let t = 0; t < pages.length; t++) {
    const page = pages[t];
    let isHit = false;
    let replacedPage = null;

    if (frames.includes(page)) {
      isHit = true;
      hits++;
      lastUsed[page] = t;
    } else {
      faults++;
      if (frames.length < numFrames) {
        frames.push(page);
        lastUsed[page] = t;
      } else {
        // Find page in frames with minimum lastUsed value
        let lruPage = frames[0];
        let minT = lastUsed[frames[0]];
        for (let f of frames) {
          if (lastUsed[f] < minT) {
            minT = lastUsed[f];
            lruPage = f;
          }
        }
        replacedPage = lruPage;
        let replaceIdx = frames.indexOf(lruPage);
        frames[replaceIdx] = page;
        lastUsed[page] = t;
      }
    }

    history.push({
      step: t + 1,
      page,
      frames: [...frames],
      isHit,
      replacedPage
    });
  }

  return { name: "LRU (Least Recently Used)", pages, numFrames, history, hits, faults };
}

// Optimal Simulation
function simulateOptimal(pages, numFrames) {
  let frames = [];
  let history = [];
  let hits = 0, faults = 0;

  for (let t = 0; t < pages.length; t++) {
    const page = pages[t];
    let isHit = false;
    let replacedPage = null;

    if (frames.includes(page)) {
      isHit = true;
      hits++;
    } else {
      faults++;
      if (frames.length < numFrames) {
        frames.push(page);
      } else {
        // Look ahead in future
        let farthestIdx = -1;
        let victim = frames[0];

        for (let f of frames) {
          let nextUse = -1;
          for (let k = t + 1; k < pages.length; k++) {
            if (pages[k] === f) {
              nextUse = k;
              break;
            }
          }

          if (nextUse === -1) {
            // Never used again in future! Best candidate
            victim = f;
            farthestIdx = Infinity;
            break;
          } else if (nextUse > farthestIdx) {
            farthestIdx = nextUse;
            victim = f;
          }
        }

        replacedPage = victim;
        let replaceIdx = frames.indexOf(victim);
        frames[replaceIdx] = page;
      }
    }

    history.push({
      step: t + 1,
      page,
      frames: [...frames],
      isHit,
      replacedPage
    });
  }

  return { name: "Optimal (OPT / Belady's Optimal)", pages, numFrames, history, hits, faults };
}

function renderPagingResult(sim) {
  const total = sim.pages.length;
  const hitRatio = ((sim.hits / total) * 100).toFixed(1);
  const faultRatio = ((sim.faults / total) * 100).toFixed(1);

  let html = `<div style="margin-top:16px;">
    <h3>${sim.name} Results</h3>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-label">Total References</div><div class="stat-value">${total}</div></div>
      <div class="stat-card"><div class="stat-label">Page Faults (Misses)</div><div class="stat-value" style="color:var(--danger);">${sim.faults}</div></div>
      <div class="stat-card"><div class="stat-label">Page Hits</div><div class="stat-value" style="color:var(--success);">${sim.hits}</div></div>
      <div class="stat-card"><div class="stat-label">Hit Ratio</div><div class="stat-value">${hitRatio}%</div></div>
      <div class="stat-card"><div class="stat-label">Fault Ratio</div><div class="stat-value">${faultRatio}%</div></div>
    </div>`;

  // Render Horizontal Grid
  html += `<h4>Visual Step-by-Step Frame Matrix:</h4>
  <div class="paging-grid-container">
    <table class="paging-table">
      <thead>
        <tr>
          <th style="background:#334155;color:white;min-width:90px;">Page Ref</th>`;
  sim.pages.forEach((p, idx) => {
    html += `<th class="paging-header-cell">${p}</th>`;
  });
  html += `</tr></thead><tbody>`;

  // Rows for each frame
  for (let f = 0; f < sim.numFrames; f++) {
    html += `<tr><td style="background:#f1f5f9;font-weight:bold;">Frame ${f + 1}</td>`;
    sim.history.forEach(step => {
      const pageInFrame = step.frames[f] !== undefined ? step.frames[f] : "-";
      const isNew = step.frames[f] === step.page && !step.isHit;
      const cellClass = isNew ? "frame-cell new-page" : "frame-cell";
      html += `<td class="${cellClass}">${pageInFrame}</td>`;
    });
    html += `</tr>`;
  }

  // Hit / Miss status row
  html += `<tr><td style="background:#f1f5f9;font-weight:bold;">Status</td>`;
  sim.history.forEach(step => {
    if (step.isHit) {
      html += `<td class="cell-hit" title="Page Hit (Found in Memory)">HIT</td>`;
    } else {
      const repText = step.replacedPage !== null ? ` (Replaced ${step.replacedPage})` : " (Empty Frame)";
      html += `<td class="cell-fault" title="Page Fault${repText}">MISS</td>`;
    }
  });
  html += `</tr></tbody></table></div>`;

  return html;
}

function runPageReplacement() {
  const pages = parsePageReferences();
  const numFrames = parseInt(document.getElementById("paging-frames").value);
  const algoChoice = document.getElementById("paging-algo-select").value;

  if (pages.length === 0) {
    alert("Please enter a valid page reference string (e.g., 7, 0, 1, 2, 0, 3...).");
    return;
  }
  if (isNaN(numFrames) || numFrames <= 0) {
    alert("Please enter a valid number of frames (>= 1).");
    return;
  }

  const container = document.getElementById("paging-output");
  container.innerHTML = "";

  if (algoChoice === "all") {
    // Compare all three side-by-side!
    const fifoRes = simulateFIFO(pages, numFrames);
    const lruRes = simulateLRU(pages, numFrames);
    const optRes = simulateOptimal(pages, numFrames);

    let comparisonHtml = `
      <div class="card" style="background:#f8fafc;border:2px solid var(--primary);">
        <h3 style="margin-top:0;">📊 Algorithm Comparison Summary (${pages.length} References, ${numFrames} Frames)</h3>
        <div class="table-wrapper">
          <table border="1">
            <thead>
              <tr>
                <th>Algorithm</th>
                <th>Page Faults</th>
                <th>Page Hits</th>
                <th>Hit Ratio</th>
                <th>Fault Ratio</th>
                <th>Performance Rank</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>FIFO</strong></td>
                <td style="color:var(--danger);font-weight:bold;">${fifoRes.faults}</td>
                <td style="color:var(--success);font-weight:bold;">${fifoRes.hits}</td>
                <td>${((fifoRes.hits / pages.length) * 100).toFixed(1)}%</td>
                <td>${((fifoRes.faults / pages.length) * 100).toFixed(1)}%</td>
                <td>${fifoRes.faults <= lruRes.faults ? "🥈 Good" : "🥉 Fair"}</td>
              </tr>
              <tr>
                <td><strong>LRU</strong></td>
                <td style="color:var(--danger);font-weight:bold;">${lruRes.faults}</td>
                <td style="color:var(--success);font-weight:bold;">${lruRes.hits}</td>
                <td>${((lruRes.hits / pages.length) * 100).toFixed(1)}%</td>
                <td>${((lruRes.faults / pages.length) * 100).toFixed(1)}%</td>
                <td>${lruRes.faults <= optRes.faults ? "🥇 High" : "🥈 Very Good"}</td>
              </tr>
              <tr>
                <td><strong>Optimal</strong></td>
                <td style="color:var(--danger);font-weight:bold;">${optRes.faults}</td>
                <td style="color:var(--success);font-weight:bold;">${optRes.hits}</td>
                <td>${((optRes.hits / pages.length) * 100).toFixed(1)}%</td>
                <td>${((optRes.faults / pages.length) * 100).toFixed(1)}%</td>
                <td>🏆 Benchmark (Minimum Possible Faults)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    comparisonHtml += renderPagingResult(fifoRes);
    comparisonHtml += renderPagingResult(lruRes);
    comparisonHtml += renderPagingResult(optRes);

    container.innerHTML = comparisonHtml;
  } else if (algoChoice === "fifo") {
    container.innerHTML = renderPagingResult(simulateFIFO(pages, numFrames));
  } else if (algoChoice === "lru") {
    container.innerHTML = renderPagingResult(simulateLRU(pages, numFrames));
  } else if (algoChoice === "optimal") {
    container.innerHTML = renderPagingResult(simulateOptimal(pages, numFrames));
  }
}

// --------------------------------------------------------------------------
// INITIALIZATION ON PAGE LOAD
// --------------------------------------------------------------------------
window.addEventListener("DOMContentLoaded", () => {
  // Initialize Banker inputs with default 5 processes and 3 resources
  initBankerInputs(5, 3);
  loadBankerExample();
});
