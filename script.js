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

// ---------------- CALCULATIONS -----------------
function calculate(algo) {
  let result = "";
  
  if (algo === "fcfs") {
    result = fcfs(processes);
  } else if (algo === "sjf") {
    result = sjf(processes);
  } else if (algo === "srtf") {
    result = srtf(processes);
  } else if (algo === "rr") {
    let quantum = parseInt(prompt("Enter Time Quantum:", "2"));
    result = rr(processes, quantum);
  } else if (algo === "priority") {
    result = priority(processes);
  }
  
  document.getElementById("output").innerHTML = result;
}

// ----------- ALGORITHM FUNCTIONS ---------------
function fcfs(procs) {
  let time = 0, output = "<h3>FCFS Scheduling</h3>";
  let sorted = [...procs].sort((a,b) => a.at - b.at);
  let totalTAT=0, totalWT=0;
  
  output += "<table><tr><th>Process</th><th>CT</th><th>TAT</th><th>WT</th></tr>";
  sorted.forEach(p => {
    if(time < p.at) time = p.at;
    time += p.bt;
    let ct = time;
    let tat = ct - p.at;
    let wt = tat - p.bt;
    totalTAT+=tat; totalWT+=wt;
    output += `<tr><td>${p.pname}</td><td>${ct}</td><td>${tat}</td><td>${wt}</td></tr>`;
  });
  output += `</table><p>Avg TAT: ${(totalTAT/sorted.length).toFixed(2)}, Avg WT: ${(totalWT/sorted.length).toFixed(2)}</p>`;
  return output;
}

function sjf(procs) {
  let time = 0, completed = [], output="<h3>SJF Scheduling</h3>";
  let totalTAT=0, totalWT=0;
  let resultTable = "<table><tr><th>Process</th><th>CT</th><th>TAT</th><th>WT</th></tr>";

  while(completed.length < procs.length){
    let available = procs.filter(p=>!completed.includes(p) && p.at<=time);
    if(available.length===0){time++; continue;}
    let shortest = available.reduce((a,b)=>a.bt<b.bt?a:b);
    time+=shortest.bt;
    let ct = time, tat = ct-shortest.at, wt=tat-shortest.bt;
    totalTAT+=tat; totalWT+=wt;
    resultTable += `<tr><td>${shortest.pname}</td><td>${ct}</td><td>${tat}</td><td>${wt}</td></tr>`;
    completed.push(shortest);
  }

  resultTable += "</table>";
  output += resultTable;
  output += `<p>Avg TAT: ${(totalTAT/procs.length).toFixed(2)}, Avg WT: ${(totalWT/procs.length).toFixed(2)}</p>`;
  return output;
}

// (SRTF, RR, Priority remain same as before)

function srtf(procs) {
  let time=0, completed=[], rem=procs.map(p=>p.bt), n=procs.length;
  let ct=Array(n).fill(0), output="<h3>SRTF Scheduling</h3>";
  
  while(completed.length<n){
    let idx=-1, min=1e9;
    for(let i=0;i<n;i++){
      if(procs[i].at<=time && rem[i]>0 && rem[i]<min){
        min=rem[i]; idx=i;
      }
    }
    if(idx===-1){time++;continue;}
    rem[idx]--; time++;
    if(rem[idx]===0){
      ct[idx]=time;
      completed.push(procs[idx]);
    }
  }
  let totalTAT=0,totalWT=0;
  output+="<table><tr><th>Process</th><th>CT</th><th>TAT</th><th>WT</th></tr>";
  procs.forEach((p,i)=>{
    let tat=ct[i]-p.at, wt=tat-p.bt;
    totalTAT+=tat; totalWT+=wt;
    output+=`<tr><td>${p.pname}</td><td>${ct[i]}</td><td>${tat}</td><td>${wt}</td></tr>`;
  });
  output+=`</table><p>Avg TAT: ${(totalTAT/n).toFixed(2)}, Avg WT: ${(totalWT/n).toFixed(2)}</p>`;
  return output;
}

function rr(procs, q) {
  let queue=[], time=0, rem=procs.map(p=>p.bt), n=procs.length;
  let ct=Array(n).fill(0), done=0, output="<h3>Round Robin</h3>";
  
  while(done<n){
    let progressed=false;
    for(let i=0;i<n;i++){
      if(procs[i].at<=time && rem[i]>0){
        let run=Math.min(q, rem[i]);
        time+=run; rem[i]-=run;
        if(rem[i]===0){ct[i]=time; done++;}
        progressed=true;
      }
    }
    if(!progressed) time++;
  }
  let totalTAT=0,totalWT=0;
  output+="<table><tr><th>Process</th><th>CT</th><th>TAT</th><th>WT</th></tr>";
  procs.forEach((p,i)=>{
    let tat=ct[i]-p.at, wt=tat-p.bt;
    totalTAT+=tat; totalWT+=wt;
    output+=`<tr><td>${p.pname}</td><td>${ct[i]}</td><td>${tat}</td><td>${wt}</td></tr>`;
  });
  output+=`</table><p>Avg TAT: ${(totalTAT/n).toFixed(2)}, Avg WT: ${(totalWT/n).toFixed(2)}</p>`;
  return output;
}

function priority(procs) {
  let time=0, completed=[], output="<h3>Priority Scheduling</h3>";
  let totalTAT=0,totalWT=0;
  
  while(completed.length<procs.length){
    let available=procs.filter(p=>!completed.includes(p)&&p.at<=time);
    if(available.length===0){time++;continue;}
    let chosen=available.reduce((a,b)=>a.pr<b.pr?a:b);
    time+=chosen.bt;
    let ct=time,tat=ct-chosen.at,wt=tat-chosen.bt;
    totalTAT+=tat; totalWT+=wt;
    completed.push(chosen);
  }
  output+=`<p>Avg TAT: ${(totalTAT/procs.length).toFixed(2)}, Avg WT: ${(totalWT/procs.length).toFixed(2)}</p>`;
  return output;
}
