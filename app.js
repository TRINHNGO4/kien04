const API = "https://script.google.com/macros/s/AKfycbwMOB-zRkTfNRcjOfiTsPKNorCKLtynIGXY49VUI6ufKF7u--IvptMhLFnxcrH3kBJo/exec";
const $ = id => document.getElementById(id);

async function fetchJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error("API error");
  return r.json();
}

/* GLOBAL EQUITY (INDEPENDENT) */
async function loadGlobalEquity() {
  const data = await fetchJSON(`${API}?action=overview`);
  let total = 0;
  data.forEach(d => total += Number(d.equity) || 0);

  $("globalEquity").textContent = total.toFixed(2);
  $("sumEquity").textContent = total.toFixed(2);
}

/* DATE-DEPENDENT DATA */
async function loadByDate() {
  const from = $("fromDate").value || "";
  const to = $("toDate").value || "";

  /* --- PNL --- */
  const pnl = await fetchJSON(`${API}?action=pnl&from=${from}&to=${to}`);
  let pnlSum = 0;

  let pnlHtml = `
    <tr><th>Time</th><th>Instrument</th><th>PNL</th></tr>`;
  pnl.forEach(r => {
    pnlSum += r.pnl;
    pnlHtml += `
      <tr>
        <td>${new Date(r.time).toLocaleString()}</td>
        <td>${r.instrument}</td>
        <td style="color:${r.pnl>=0?'var(--green)':'var(--red)'}">
          ${r.pnl}
        </td>
      </tr>`;
  });

  $("sumPNL").textContent = pnlSum.toFixed(2);
  $("pnlTable").innerHTML = pnlHtml;

  /* --- DEPOSIT / WITHDRAW --- */
  const dw = await fetchJSON(`${API}?action=deposit`);
  let depSum = 0, wdSum = 0;

  let depHtml = `<tr><th>Time</th><th>Currency</th><th>Amount</th></tr>`;
  let wdHtml  = depHtml;

  dw.forEach(r => {
    const t = new Date(r.time);
    if (from && t < new Date(from)) return;
    if (to && t > new Date(to)) return;

    const row = `
      <tr>
        <td>${t.toLocaleString()}</td>
        <td>${r.currency}</td>
        <td>${r.amount}</td>
      </tr>`;

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
  await loadGlobalEquity();
  await loadByDate();
  $("btnSearch").onclick = loadByDate;
})();
