let processes = [];

// Add Process
function addProcess() {
  let pname = document.getElementById("pname").value;
  let bt = parseInt(document.getElementById("bt").value);
  let at = parseInt(document.getElementById("at").value);
  let pr = parseInt(document.getElementById("priority").value) || null;

  processes.push({ pname, bt, at, pr });
  updateTable();
  document.getElementById("processForm").reset();
}

// Delete Process
function deleteProcess(index) {
  processes.splice(index, 1);
  updateTable();
}

// Update Table with Delete Button
function updateTable() {
  let tbody = document.querySelector("#processTable tbody");
  tbody.innerHTML = "";
  processes.forEach((p, i) => {
    let row = `<tr>
      <td>${p.pname}</td>
      <td>${p.bt}</td>
      <td>${p.at}</td>
      <td>${p.pr ?? "-"}</td>
      <td><button onclick="deleteProcess(${i})" style="background:red;">❌</button></td>
    </tr>`;
    tbody.innerHTML += row;
  });
}

function createGanttChart(gantt) {
  let html = `<div class="gantt">`;
  gantt.forEach(g => {
    html += `<div class="gantt-block">${g.pid}<br>${g.start}-${g.finish}</div>`;
  });
  html += `</div>`;
  return html;
}

// ---------------- CALCULATIONS -----------------
function calculate(algo) {
  let output;

  if (algo === "fcfs") {
    output = fcfs(processes);
  } else if (algo === "sjf") {
    output = sjf(processes);
  } else if (algo === "srtf") {
    output = srtf(processes);
  } else if (algo === "rr") {
    let quantum = parseInt(prompt("Enter Time Quantum:", "2"));
    output = rr(processes, quantum);
  } else if (algo === "priority") {
    output = priority(processes);
  }

  displayResults(output.results, output.gantt);
}

// ----------- ALGORITHM FUNCTIONS ---------------
function fcfs(procs) {
  let time = 0;
  let results = [];
  let gantt = [];
  let totalTAT = 0, totalWT = 0;

  // Sort by arrival time
  let sorted = [...procs].sort((a, b) => a.at - b.at);

  sorted.forEach(p => {
    if (time < p.at) time = p.at;
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
      tat,
      wt,
      rt
    });

    gantt.push({ pid: p.pname, start, end: ct });
    totalTAT += tat;
    totalWT += wt;
  });

  return { results, gantt };
}

// sjf 
function sjf(procs) {
  let time = 0, completed = [];
  let results = [], gantt = [];
  let totalTAT = 0, totalWT = 0;

  while (completed.length < procs.length) {
    let available = procs.filter(p => !completed.includes(p) && p.at <= time);
    if (available.length === 0) { time++; continue; }
    
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

// srtf
function srtf(procs) {
  let time = 0, completed = [], rem = procs.map(p => p.bt), n = procs.length;
  let ct = Array(n).fill(0), started = Array(n).fill(false);
  let results = [], gantt = [];
  let lastPid = null;

  while (completed.length < n) {
    let idx = -1, min = 1e9;
    for (let i = 0; i < n; i++) {
      if (procs[i].at <= time && rem[i] > 0 && rem[i] < min) {
        min = rem[i]; idx = i;
      }
    }
    if (idx === -1) { time++; continue; }

    if (lastPid !== procs[idx].pname) {
      if (lastPid !== null) gantt[gantt.length - 1].end = time;
      gantt.push({ pid: procs[idx].pname, start: time, end: null });
      lastPid = procs[idx].pname;
    }

    if (!started[idx]) { started[idx] = time; }
    rem[idx]--; time++;

    if (rem[idx] === 0) {
      ct[idx] = time;
      completed.push(procs[idx]);
    }
  }
  gantt[gantt.length - 1].end = time;

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

// rr
function rr(procs, q) {
  let time = 0, rem = procs.map(p => p.bt), n = procs.length;
  let ct = Array(n).fill(0), started = Array(n).fill(false);
  let results = [], gantt = [];
  let queue = [], lastPid = null, done = 0;

  while (done < n) {
    let progressed = false;
    for (let i = 0; i < n; i++) {
      if (procs[i].at <= time && rem[i] > 0) {
        let run = Math.min(q, rem[i]);
        if (lastPid !== procs[i].pname) {
          if (lastPid !== null) gantt[gantt.length - 1].end = time;
          gantt.push({ pid: procs[i].pname, start: time, end: null });
          lastPid = procs[i].pname;
        }
        if (!started[i]) { started[i] = time; }
        time += run;
        rem[i] -= run;
        if (rem[i] === 0) { ct[i] = time; done++; }
        progressed = true;
      }
    }
    if (!progressed) time++;
  }
  gantt[gantt.length - 1].end = time;

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
// priority
function priority(procs) {
  let time = 0, completed = [];
  let results = [], gantt = [];

  while (completed.length < procs.length) {
    let available = procs.filter(p => !completed.includes(p) && p.at <= time);
    if (available.length === 0) { time++; continue; }

    let chosen = available.reduce((a, b) => a.pr < b.pr ? a : b);
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

function calculateScheduling(processes, algorithm, quantum = 2) {
  let n = processes.length;
  let time = 0, completed = 0;
  let gantt = [];
  let results = [];

  processes.sort((a, b) => a.arrival - b.arrival);

  let readyQueue = [];
  let visited = new Array(n).fill(false);

  while (completed < n) {
    for (let i = 0; i < n; i++) {
      if (!visited[i] && processes[i].arrival <= time) {
        readyQueue.push({ ...processes[i], index: i });
        visited[i] = true;
      }
    }

    if (readyQueue.length === 0) {
      time++;
      continue;
    }

    let current;
    if (algorithm === "SJF") {
      readyQueue.sort((a, b) => a.burst - b.burst);
      current = readyQueue.shift();
    } else {
      current = readyQueue.shift(); // FCFS
    }

    if (processes[current.index].start === undefined) {
      processes[current.index].start = time;
    }

    gantt.push({ pid: current.pid, start: time, end: time + current.burst });
    time += current.burst;

    let completion = time;
    let tat = completion - current.arrival;
    let wt = tat - current.burst;
    let rt = processes[current.index].start - current.arrival;

    results.push({
      pid: current.pid,
      arrival: current.arrival,
      burst: current.burst,
      completion,
      tat,
      wt,
      rt
    });

    completed++;
  }

  displayResults(results, gantt);
}
function displayResults(results, gantt) {
  // Results Table
  let table = `<h3>Results</h3><table border="1">
    <tr><th>PID</th><th>AT</th><th>BT</th><th>CT</th>
    <th>TAT</th><th>WT</th><th>RT</th></tr>`;
  let totalTAT = 0, totalWT = 0, totalRT = 0;

  results.forEach(r => {
    table += `<tr>
      <td>${r.pid}</td><td>${r.arrival}</td><td>${r.burst}</td>
      <td>${r.completion}</td><td>${r.tat}</td><td>${r.wt}</td><td>${r.rt}</td>
    </tr>`;
    totalTAT += r.tat;
    totalWT += r.wt;
    totalRT += r.rt;
  });

  table += `</table>`;
  table += `<p>Avg TAT: ${(totalTAT/results.length).toFixed(2)}, 
            Avg WT: ${(totalWT/results.length).toFixed(2)}, 
            Avg RT: ${(totalRT/results.length).toFixed(2)}</p>`;
  document.getElementById("results-table").innerHTML = table;

  // Gantt Chart
  let chart = `<h3>Gantt Chart</h3><div style="display:flex;align-items:center;margin-top:10px;">`;
  gantt.forEach(g => {
    chart += `<div style="border:1px solid black;padding:10px 15px;margin:2px;background:#4caf50;color:white;">
      ${g.pid}<br><small>${g.start}-${g.end}</small>
    </div>`;
  });
  chart += `</div>`;
  document.getElementById("gantt-chart").innerHTML = chart;
}
