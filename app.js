const API_URL = "https://script.google.com/macros/s/AKfycbwMOB-zRkTfNRcjOfiTsPKNorCKLtynIGXY49VUI6ufKF7u--IvptMhLFnxcrH3kBJo/exec";

const $ = id => document.getElementById(id);
let CACHE = { pnl: [], dw: [] };

async function fetchJSON(url) {
  const r = await fetch(url);
  return r.json();
}

/* GLOBAL EQUITY */
async function loadEquity() {
  const data = await fetchJSON(`${API_URL}?action=overview`);
  let total = 0;
  data.forEach(d => total += d.equity);
  $("globalEquity").textContent = total.toFixed(2);
  $("sumEquity").textContent = total.toFixed(2);
}

/* PRELOAD ALL DATA */
async function preload() {
  const [pnl, dw] = await Promise.all([
    fetchJSON(`${API_URL}?action=pnl`),
    fetchJSON(`${API_URL}?action=deposit`)
  ]);
  CACHE.pnl = pnl;
  CACHE.dw = dw;
}

function filter(arr, from, to) {
  const f = from ? new Date(from) : null;
  const t = to ? new Date(to) : null;
  return arr.filter(x => {
    const d = new Date(x.time);
    if (f && d < f) return false;
    if (t && d > t) return false;
    return true;
  });
}

/* SEARCH */
function search() {
  const from = $("fromDate").value;
  const to = $("toDate").value;

  const pnl = filter(CACHE.pnl, from, to);
  const dw = filter(CACHE.dw, from, to);

  let pnlSum = 0;
  let pnlHtml = `<tr><th>Time</th><th>Inst</th><th>PNL</th></tr>`;
  pnl.forEach(r => {
    pnlSum += r.pnl;
    pnlHtml += `<tr><td>${r.time}</td><td>${r.instrument}</td><td>${r.pnl}</td></tr>`;
  });
  $("sumPNL").textContent = pnlSum.toFixed(2);
  $("pnlTable").innerHTML = pnlHtml;

  let depSum = 0, wdSum = 0;
  let depHtml = `<tr><th>Time</th><th>Cur</th><th>Amt</th></tr>`;
  let wdHtml = depHtml;

  dw.forEach(r => {
    const row = `<tr><td>${r.time}</td><td>${r.currency}</td><td>${r.amount}</td></tr>`;
    if (r.type === "DEPOSIT") {
      depSum += r.amount;
      depHtml += row;
    } else {
      wdSum += Math.abs(r.amount);
      wdHtml += row;
    }
  });

  $("sumDeposit").textContent = depSum.toFixed(2);
  $("sumWithdraw").textContent = wdSum.toFixed(2);
  $("depositTable").innerHTML = depHtml;
  $("withdrawTable").innerHTML = wdHtml;
}

/* INIT */
(async () => {
  await loadEquity();
  await preload();
  search();
  $("btnSearch").onclick = search;
})();
