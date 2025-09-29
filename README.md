# OsyProject-
# CPU Scheduling Calculator

A web-based CPU Scheduling Calculator that allows users to simulate and analyze different CPU scheduling algorithms. This tool is designed for students and enthusiasts learning Operating Systems to understand process scheduling, waiting times, turnaround times, and Gantt chart visualization.

## Features

- Add processes with:
  - **Process Name**
  - **Burst Time**
  - **Arrival Time**
  - **Priority** (optional, used for Priority Scheduling)
- Supports multiple CPU Scheduling Algorithms:
  - **FCFS (First Come First Serve)**
  - **SJF (Shortest Job First)**
  - **SRTF (Shortest Remaining Time First)**
  - **Round Robin (RR)**
  - **Priority Scheduling**
- Displays:
  - **Gantt Chart** for process execution order
  - **Result Table** with Completion Time (CT), Turnaround Time (TAT), and Waiting Time (WT)
- Algorithm Info Table shows:
  - Algorithm Type (Preemptive / Non-Preemptive)
  - Downsides / Explanation for each algorithm
- Easy to use interface with dynamic process addition and deletion

## How to Use

1. Open `index.html` in a web browser.
2. Enter process details in the **Process Input Form**:
   - Process Name
   - Burst Time
   - Arrival Time
   - Priority (optional)
3. Click **➕ Add Process** to add the process to the table.
4. Once all processes are added, click the algorithm buttons to calculate results.
5. View results in:
   - **Gantt Chart**
   - **Results Table** (CT, TAT, WT)
6. Refer to the **Algorithm Info Table** for preemptive type and downsides of each algorithm.

---

