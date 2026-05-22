#!/usr/bin/env node
const express = require('express');
const os = require('os');
const {exec} = require('child_process');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8000;

app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

function sampleCpuUsage(ms = 100) {
  return new Promise((resolve) => {
    const start = os.cpus();
    setTimeout(() => {
      const end = os.cpus();
      const deltas = end.map((cpu, i) => {
        const s = start[i].times;
        const e = cpu.times;
        const idle = e.idle - s.idle;
        const total = Object.keys(e).reduce((acc, k) => acc + (e[k] - s[k]), 0);
        const usage = total > 0 ? Math.round((1 - idle / total) * 100) : 0;
        return usage;
      });
      const avg = Math.round(deltas.reduce((a,b)=>a+b,0)/deltas.length);
      resolve({ perCore: deltas, avg });
    }, ms);
  });
}

function getTopProcesses(limit = 6) {
  return new Promise((resolve) => {
    // Try ps (Unix). On Windows this will fail and resolve empty.
    exec(`ps -eo pid,comm,%cpu,%mem --sort=-%cpu | head -n ${limit+1}`, (err, stdout) => {
      if (err || !stdout) return resolve([]);
      const lines = stdout.trim().split('\n').slice(1);
      const procs = lines.map(line => {
        const parts = line.trim().split(/\s+/);
        const pid = parts[0];
        const comm = parts[1];
        const cpu = parseFloat(parts[2]) || 0;
        const mem = parseFloat(parts[3]) || 0;
        return { pid, name: comm, cpu, mem };
      });
      resolve(procs);
    });
  });
}

function getDiskUsage() {
  return new Promise((resolve) => {
    exec("df -k . | tail -1", (err, stdout) => {
      if (err || !stdout) return resolve(null);
      const parts = stdout.trim().split(/\s+/);
      // Filesystem Size Used Avail Use% Mounted
      const totalKb = parseInt(parts[1], 10);
      const usedKb = parseInt(parts[2], 10);
      const usedPct = parseInt(parts[4].replace('%',''), 10);
      resolve({ total: totalKb, used: usedKb, usage: usedPct });
    });
  });
}

function getNetworkStats() {
  return new Promise((resolve) => {
    exec("cat /proc/net/dev | tail -n +3", (err, stdout) => {
      if (err || !stdout) return resolve(null);
      const lines = stdout.trim().split('\n');
      let rx=0, tx=0;
      for (const l of lines) {
        const cols = l.replace(/:/, ' ').trim().split(/\s+/);
        rx += parseInt(cols[1] || 0, 10);
        tx += parseInt(cols[9] || 0, 10);
      }
      resolve({ rx, tx, usage: 0 });
    });
  });
}

function getGpuInfo() {
  return new Promise((resolve) => {
    exec('nvidia-smi --query-gpu=utilization.gpu,memory.used,memory.total --format=csv,noheader,nounits', (err, stdout) => {
      if (err || !stdout) return resolve(null);
      const lines = stdout.trim().split('\n');
      const gpus = lines.map(l => {
        const parts = l.split(',').map(p=>p.trim());
        return { usage: parseInt(parts[0]||0,10), memoryUsed: parseInt(parts[1]||0,10), memoryTotal: parseInt(parts[2]||0,10) };
      });
      const avgUsage = Math.round(gpus.reduce((a,b)=>a+b.usage,0)/gpus.length);
      resolve({ gpus, avgUsage });
    });
  });
}

app.get('/api/system', async (req, res) => {
  try {
    const cpu = await sampleCpuUsage(120);
    const memTotal = os.totalmem();
    const memFree = os.freemem();
    const memUsed = memTotal - memFree;
    const uptime = Math.floor(os.uptime());
    const processes = await getTopProcesses(6);
    const disk = await getDiskUsage();
    const network = await getNetworkStats();
    const gpu = await getGpuInfo();

    // lightweight application metrics (placeholder)
    const requestRate = Math.round(Math.random()*5);
    const queueLength = Math.floor(Math.random()*4);
    const latency = Math.round(Math.random()*300);
    const activeSessions = Math.floor(Math.random()*10);
    const errorRate = Math.round(Math.random()*5);
    const throughput = requestRate; // alias

    res.json({
      cpu: { usage: cpu.avg, perCore: cpu.perCore },
      memory: { total: memTotal, used: memUsed },
      uptime,
      processes,
      disk,
      network,
      gpu: gpu ? { usage: gpu.avgUsage } : null,
      requestRate,
      queueLength,
      latency,
      activeSessions,
      errorRate,
      throughput
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// serve static files from project root
app.use(express.static(path.join(__dirname, '..')));

app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
