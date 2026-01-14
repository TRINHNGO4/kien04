const API_URL =
  "https://script.google.com/macros/s/AKfycbwMOB-zRkTfNRcjOfiTsPKNorCKLtynIGXY49VUI6ufKF7u--IvptMhLFnxcrH3kBJo/exec";

const $ = (id) => document.getElementById(id);

let CACHE = {
  pnl: [],
  dw: [],
};

/* ======================
   UTILS
====================== */
function formatDate(iso) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(
    d.getMonth() + 1
  ).padStart(2, "0")}/${d.getFullYear()}`;
}

function filterByDate(arr, from, to) {
  const f = from ? new Date(from) : null;
  const t = to ? new Date(to) : null;

  return arr.filter((x) => {
    const d = new Date(x.time);
    if (f && d < f) return false;
    if (t && d > t) return false;
    return true;
  });
}

/* ======================
   FETCH
====================== */
async function fetchJSON(url) {
  const r = await fetch(url);
  return r.json();
}

/* ======================
   LOAD EQUITY
====================== */
async function loadEquity() {
  const data = await fetchJSON(`${API_URL}?action=overview`);
  let total = 0;
  data.forEach((d) => (total += Number(d.equity || 0)));

  $("globalEquity").textContent = total.toFixed(2);
  $("sumEquity").textContent = total.toFixed(2);
}

/* ======================
   PRELOAD DATA
====================== */
async function preload() {
  const [pnl, dw] = await Promise.all([
    fetchJSON(`${API_URL}?action=pnl`),
    fetchJSON(`${API_URL}?action=deposit`),
  ]);

  CACHE.pnl = pnl;
  CACHE.dw = dw;
}

/* ======================
   GROUP PNL BY DAY
====================== */
function groupPNLByDay(pnlData) {
  const map = {};

  pnlData.forEach((r) => {
    const key = formatDate(r.time);
    map[key] = (map[key] || 0) + Number(r.pnl || 0);
  });

  return map;
}

/* ======================
   RENDER MONTHLY GRID
====================== */
function renderDailyGrid(pnlData, fromDate) {
  const grid = $("dailyGrid");
  if (!grid) return;

  grid.innerHTML = "";
  if (!pnlData.length) return;

  const baseDate = fromDate
    ? new Date(fromDate)
    : new Date(pnlData[0].time);

  const year = baseDate.getFullYear();
  const month = baseDate.getMonth(); // 0-based
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const dailyMap = groupPNLByDay(pnlData);

  for (let day = 1; day <= daysInMonth; day++) {
    const key = `${String(day).padStart(2, "0")}/${String(
      month + 1
    ).padStart(2, "0")}/${year}`;

    const value = Number(dailyMap[key] || 0);

    let cls = "";
    if (value > 0) cls = "positive";
    else if (value < 0) cls = "negative";

    const box = document.createElement("div");
    box.className = `day-box ${cls}`;

    box.innerHTML = `
      <div class="day">${day}/${month + 1}</div>
     <div class="amount">${value !== 0 ? value.toFixed(2) : ""}</div>
    `;

    grid.appendChild(box);
  }
}

/* ======================
   RENDER TABLES
====================== */
function renderPNL(pnlData) {
  let sum = 0;
  let html = `<tr><th>Date</th><th>Inst</th><th>PNL</th></tr>`;

  pnlData.forEach((r) => {
    sum += Number(r.pnl || 0);
    html += `
      <tr>
        <td>${formatDate(r.time)}</td>
        <td>${r.instrument}</td>
        <td class="${r.pnl >= 0 ? "positive" : "negative"}">
          ${Number(r.pnl).toFixed(2)}
        </td>
      </tr>
    `;
  });

  $("sumPNL").textContent = sum.toFixed(2);
  $("pnlTable").innerHTML = html;
}

function renderDepositWithdraw(dwData) {
  let depSum = 0;
  let wdSum = 0;

  let depHtml = `<tr><th>Date</th><th>Cur</th><th>Amt</th></tr>`;
  let wdHtml = depHtml;

  dwData.forEach((r) => {
    const row = `
      <tr>
        <td>${formatDate(r.time)}</td>
        <td>${r.currency}</td>
        <td>${Number(r.amount).toFixed(2)}</td>
      </tr>
    `;

    if (r.type === "DEPOSIT") {
      depSum += Number(r.amount || 0);
      depHtml += row;
    } else {
      wdSum += Math.abs(Number(r.amount || 0));
      wdHtml += row;
    }
  });

  $("sumDeposit").textContent = depSum.toFixed(2);
  $("sumWithdraw").textContent = wdSum.toFixed(2);

  $("depositTable").innerHTML = depHtml;
  $("withdrawTable").innerHTML = wdHtml;
}

/* ======================
   SEARCH
====================== */
function search() {
  const from = $("fromDate").value;
  const to = $("toDate").value;

  const pnlData = filterByDate(CACHE.pnl, from, to);
  const dwData = filterByDate(CACHE.dw, from, to);

  renderPNL(pnlData);
  renderDepositWithdraw(dwData);
  renderDailyGrid(pnlData, from);
}

/* ======================
   INIT
====================== */
(async () => {
  await loadEquity();
  await preload();
  search();
  $("btnSearch").onclick = search;
})();
