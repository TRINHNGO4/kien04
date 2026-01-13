/*************************
 * CONFIG
 *************************/
const API_URL =
  "https://script.google.com/macros/s/AKfycbwMOB-zRkTfNRcjOfiTsPKNorCKLtynIGXY49VUI6ufKF7u--IvptMhLFnxcrH3kBJo/exec";

const $ = (id) => document.getElementById(id);

/*************************
 * FORMAT DATE dd/mm/yyyy
 *************************/
function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${
    String(d.getMonth() + 1).padStart(2, "0")
  }/${d.getFullYear()}`;
}

/*************************
 * CACHE
 *************************/
let CACHE = {
  pnl: [],
  dw: []
};

/*************************
 * FETCH JSON
 *************************/
async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Fetch error");
  return res.json();
}

/*************************
 * LOAD TOTAL EQUITY
 *************************/
async function loadEquity() {
  const data = await fetchJSON(`${API_URL}?action=overview`);

  let total = 0;
  data.forEach((d) => (total += Number(d.equity || 0)));

  $("globalEquity").textContent = total.toFixed(2);
  $("sumEquity").textContent = total.toFixed(2);
}

/*************************
 * PRELOAD DATA (ONCE)
 *************************/
async function preload() {
  const [pnl, dw] = await Promise.all([
    fetchJSON(`${API_URL}?action=pnl`),
    fetchJSON(`${API_URL}?action=deposit`)
  ]);

  CACHE.pnl = pnl || [];
  CACHE.dw = dw || [];
}

/*************************
 * FILTER BY DATE
 *************************/
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

/*************************
 * SEARCH
 *************************/
function search() {
  const from = $("fromDate").value;
  const to = $("toDate").value;

  const pnlData = filterByDate(CACHE.pnl, from, to);
  const dwData = filterByDate(CACHE.dw, from, to);

  renderPNL(pnlData);
  renderDepositWithdraw(dwData);
}

/*************************
 * RENDER PNL
 *************************/
function renderPNL(data) {
  let pnlSum = 0;

  let html = `
    <tr>
      <th>Date</th>
      <th>Instrument</th>
      <th>PNL</th>
    </tr>
  `;

  data.forEach((r) => {
    const pnl = Number(r.pnl || 0);
    pnlSum += pnl;

    const cls = pnl >= 0 ? "value-green" : "value-red";

    html += `
      <tr>
        <td>${formatDate(r.time)}</td>
        <td>${r.instrument}</td>
        <td class="${cls}">${pnl.toFixed(2)}</td>
      </tr>
    `;
  });

  $("pnlTable").innerHTML = html;

  const pnlEl = $("sumPNL");
  pnlEl.textContent = pnlSum.toFixed(2);
  pnlEl.className = "value " + (pnlSum >= 0 ? "value-green" : "value-red");
}

/*************************
 * RENDER DEPOSIT / WITHDRAW
 *************************/
function renderDepositWithdraw(data) {
  let depSum = 0;
  let wdSum = 0;

  let depHtml = `
    <tr>
      <th>Date</th>
      <th>Currency</th>
      <th>Amount</th>
    </tr>
  `;

  let wdHtml = depHtml;

  data.forEach((r) => {
    const amt = Number(r.amount || 0);

    const row = `
      <tr>
        <td>${formatDate(r.time)}</td>
        <td>${r.currency}</td>
        <td class="${amt >= 0 ? "value-green" : "value-red"}">
          ${Math.abs(amt).toFixed(2)}
        </td>
      </tr>
    `;

    if (r.type === "DEPOSIT") {
      depSum += amt;
      depHtml += row;
    } else {
      wdSum += Math.abs(amt);
      wdHtml += row;
    }
  });

  $("sumDeposit").textContent = depSum.toFixed(2);
  $("sumWithdraw").textContent = wdSum.toFixed(2);

  $("depositTable").innerHTML = depHtml;
  $("withdrawTable").innerHTML = wdHtml;
}

/*************************
 * INIT
 *************************/
(async function init() {
  try {
    await loadEquity();
    await preload();
    search();

    $("btnSearch").onclick = search;
  } catch (err) {
    console.error(err);
    alert("Load data failed");
  }
})();
