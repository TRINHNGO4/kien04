/*************************************************
 * CONFIG & DATA
 *************************************************/
const API_URL = "https://script.google.com/macros/s/AKfycbxZ0UP7viNoZs3V9zhkVr4a7-k-URhvfRDCeMZpArZr7lBEVsl2Q1DHbX7cXI33C_zy/exec";
const RATE = 26245;
const STORAGE_KEY = "dashboard_v11_cache";

/*************************************************
 * DOM
 *************************************************/
const dateFrom = document.getElementById("dateFrom");
const dateTo = document.getElementById("dateTo");
const filterBtn = document.getElementById("filterBtn");
const resetBtn = document.getElementById("resetBtn");
const calendarsContainer = document.getElementById("calendarsContainer");
const currencyToggle = document.getElementById("currencyToggle");
const currencyText = document.getElementById("currencyText");
const lastUpdate = document.getElementById("lastUpdate");

/*************************************************
 * STATE
 *************************************************/
let currentCurrency = "USDT";
let allDepositData = [];
let allPnlData = [];
let overviewData = null;

/*************************************************
 * LOCAL STORAGE
 *************************************************/
function saveToCache(data) {
  try {
    const cache = {
      timestamp: new Date().toISOString(),
      currency: currentCurrency,
      data: {
        overview: data.overview,
        deposit: data.deposit,
        pnl: data.pnl
      }
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.error("Lỗi lưu cache:", e);
  }
}

function loadFromCache() {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (!cached) return null;
    
    const cache = JSON.parse(cached);
    const cacheDate = new Date(cache.timestamp);
    const now = new Date();
    const hoursDiff = (now - cacheDate) / (1000 * 60 * 60);
    
    if (hoursDiff > 24) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    
    return cache;
  } catch (e) {
    console.error("Lỗi đọc cache:", e);
    return null;
  }
}

/*************************************************
 * UTIL
 *************************************************/
const fmtVND = (n) => Math.round(n).toLocaleString("vi-VN");

const fmtUSDT = (n) =>
  Number(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

function parseDate(d) {
  return new Date(d);
}

const qs = (obj) => new URLSearchParams(obj).toString();

async function callAPI(action, params = {}) {
  const url = `${API_URL}?${qs({ action, ...params })}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("API error");
  return res.json();
}

function formatCurrency(usdtValue, vndValue) {
  if (currentCurrency === "USDT") {
    return fmtUSDT(usdtValue) + " USDT";
  } else {
    return fmtVND(vndValue) + " ₫";
  }
}

function updateLastUpdateTime(timestamp) {
  const date = new Date(timestamp);
  const timeStr = date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
  lastUpdate.textContent = `Cập nhật: ${timeStr}`;
}

/*************************************************
 * CURRENCY TOGGLE
 *************************************************/
currencyToggle.addEventListener("click", () => {
  currentCurrency = currentCurrency === "USDT" ? "VND" : "USDT";
  currencyText.textContent = currentCurrency === "USDT" ? "💵 USDT" : "₫ VND";
  
  const cache = loadFromCache();
  if (cache) {
    cache.currency = currentCurrency;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  }
  
  loadOverview();
  applyFilter();
});

/*************************************************
 * INIT & LOAD DATA
 *************************************************/
async function init() {
  try {
    document.body.style.cursor = "wait";
    lastUpdate.textContent = "Đang tải dữ liệu...";
    
    // ALWAYS reset filter on page load
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    dateFrom.valueAsDate = firstDay;
    dateTo.valueAsDate = today;
    
    const cache = loadFromCache();
    
    if (cache) {
      console.log("Đang tải từ cache...");
      overviewData = cache.data.overview;
      allDepositData = cache.data.deposit.slice(1);
      allPnlData = cache.data.pnl.slice(1);
      
      currentCurrency = cache.currency || "USDT";
      currencyText.textContent = currentCurrency === "USDT" ? "💵 USDT" : "₫ VND";
      
      updateLastUpdateTime(cache.timestamp);
    } else {
      console.log("Đang tải từ API...");
      const [overview, deposit, pnl] = await Promise.all([
        callAPI("overview"),
        callAPI("deposit"),
        callAPI("pnl")
      ]);

      overviewData = overview;
      allDepositData = deposit.slice(1);
      allPnlData = pnl.slice(1);
      
      saveToCache({ overview, deposit, pnl });
      updateLastUpdateTime(new Date().toISOString());
    }

    // Only load Total Equity, NOT filtered data
    loadOverview();

    document.body.style.cursor = "default";
  } catch (error) {
    console.error("Lỗi tải dữ liệu:", error);
    lastUpdate.textContent = "Lỗi tải dữ liệu";
    
    const cache = loadFromCache();
    if (cache) {
      alert("⚠️ Không thể kết nối API. Đang hiển thị dữ liệu từ cache.");
      overviewData = cache.data.overview;
      allDepositData = cache.data.deposit.slice(1);
      allPnlData = cache.data.pnl.slice(1);
      
      loadOverview();
      updateLastUpdateTime(cache.timestamp);
    } else {
      alert("❌ Không thể tải dữ liệu. Vui lòng kiểm tra kết nối.");
    }
    
    document.body.style.cursor = "default";
  }
}

/*************************************************
 * OVERVIEW
 *************************************************/
function loadOverview() {
  if (!overviewData || overviewData.length < 2) return;

  const lastRow = overviewData[overviewData.length - 1];
  const equityUSDT = Number(lastRow[1]);
  const equityVND = Number(lastRow[2]);

  // Update header only
  document.getElementById("headerEquity").innerText = formatCurrency(equityUSDT, equityVND);
}

/*************************************************
 * FILTER
 *************************************************/
function applyFilter() {
  const from = dateFrom.valueAsDate;
  const to = dateTo.valueAsDate;

  if (!from || !to) {
    alert("Vui lòng chọn ngày bắt đầu và kết thúc");
    return;
  }

  if (from > to) {
    alert("Ngày bắt đầu phải nhỏ hơn ngày kết thúc");
    return;
  }

  const filteredDeposit = allDepositData.filter(r => {
    const d = parseDate(r[0]);
    return d >= from && d <= to;
  });

  const filteredPnl = allPnlData.filter(r => {
    const d = parseDate(r[0]);
    return d >= from && d <= to;
  });

  updateFilteredOverview(filteredDeposit, filteredPnl);
  renderCalendars(from, to, filteredPnl);
  renderDepositTable(filteredDeposit);
  renderPnlTable(filteredPnl);
}

function updateFilteredOverview(filteredDeposit, filteredPnl) {
  let depositUSDT = 0;
  let depositVND = 0;
  let withdrawUSDT = 0;
  let withdrawVND = 0;

  filteredDeposit.forEach(r => {
    const type = r[4];
    const amount = Math.abs(Number(r[2]));
    const vnd = Math.abs(Number(r[3]));
    
    if (type === "DEPOSIT") {
      depositUSDT += amount;
      depositVND += vnd;
    }
    if (type === "WITHDRAW") {
      withdrawUSDT += amount;
      withdrawVND += vnd;
    }
  });

  let pnlUSDT = 0;
  let pnlVND = 0;

  filteredPnl.forEach(r => {
    pnlUSDT += Number(r[2]);
    pnlVND += Number(r[3]);
  });

  // Update header - mark as active
  const headerDepositStat = document.getElementById("headerDeposit").closest('.header-stat');
  const headerWithdrawStat = document.getElementById("headerWithdraw").closest('.header-stat');
  const headerPnlStat = document.getElementById("headerPnl").closest('.header-stat');
  
  headerDepositStat.classList.add('header-stat-active');
  headerWithdrawStat.classList.add('header-stat-active');
  headerPnlStat.classList.add('header-stat-active');
  
  document.getElementById("headerDeposit").innerText = formatCurrency(depositUSDT, depositVND);
  document.getElementById("headerWithdraw").innerText = formatCurrency(withdrawUSDT, withdrawVND);
  
  const headerPnlEl = document.getElementById("headerPnl");
  headerPnlEl.innerText = formatCurrency(pnlUSDT, pnlVND);
  headerPnlEl.className = "header-stat-value " + (pnlUSDT >= 0 ? "text-positive" : "text-negative");
}

filterBtn.addEventListener("click", applyFilter);

resetBtn.addEventListener("click", () => {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  dateFrom.valueAsDate = firstDay;
  dateTo.valueAsDate = today;
  applyFilter();
});

/*************************************************
 * DEPOSIT TABLE
 *************************************************/
function renderDepositTable(data) {
  const body = document.getElementById("depositTable");
  const header = document.getElementById("depositHeader");
  body.innerHTML = "";
  header.textContent = currentCurrency;

  let depUSDT = 0;
  let depVND = 0;
  let witUSDT = 0;
  let witVND = 0;

  [...data].reverse().forEach(r => {
    const date = parseDate(r[0]).toLocaleString("vi-VN");
    const coin = r[1];
    const amount = Number(r[2]);
    const vnd = Number(r[3]);
    const type = r[4];

    const amountAbs = Math.abs(amount);
    const vndAbs = Math.abs(vnd);

    if (type === "DEPOSIT") {
      depUSDT += amountAbs;
      depVND += vndAbs;
    }
    if (type === "WITHDRAW") {
      witUSDT += amountAbs;
      witVND += vndAbs;
    }

    const displayValue = currentCurrency === "USDT" ? fmtUSDT(vndAbs / RATE) : fmtVND(vndAbs);

    body.insertAdjacentHTML(
      "beforeend",
      `
      <tr>
        <td>${date}</td>
        <td>
          <span class="badge ${type === "DEPOSIT" ? "badge-deposit" : "badge-withdraw"}">
            ${type}
          </span>
        </td>
        <td>${coin}</td>
        <td class="text-right font-mono">${amountAbs}</td>
        <td class="text-right">${displayValue}</td>
      </tr>
    `
    );
  });

  document.getElementById("filteredDeposit").innerText = formatCurrency(depUSDT, depVND);
  document.getElementById("filteredWithdraw").innerText = formatCurrency(witUSDT, witVND);
  document.getElementById("depositCount").innerText = `${data.length} giao dịch`;
}

/*************************************************
 * PNL TABLE
 *************************************************/
function renderPnlTable(data) {
  const body = document.getElementById("pnlTable");
  const header = document.getElementById("pnlHeader");
  body.innerHTML = "";
  header.textContent = currentCurrency;

  let sumUSDT = 0;
  let sumVND = 0;

  [...data].reverse().forEach(r => {
    const date = parseDate(r[0]).toLocaleDateString("vi-VN");
    const pair = r[1];
    const usdt = Number(r[2]);
    const vnd = Number(r[3]);
    
    sumUSDT += usdt;
    sumVND += vnd;

    const displayValue = currentCurrency === "USDT" ? fmtUSDT(usdt) : fmtVND(vnd);

    body.insertAdjacentHTML(
      "beforeend",
      `
      <tr>
        <td>${date}</td>
        <td>${pair}</td>
        <td class="text-right ${usdt >= 0 ? "text-positive" : "text-negative"}">
          ${fmtUSDT(usdt)}
        </td>
        <td class="text-right ${usdt >= 0 ? "text-positive" : "text-negative"}">${displayValue}</td>
      </tr>
    `
    );
  });

  document.getElementById("filteredPnl").innerText = formatCurrency(sumUSDT, sumVND);
  document.getElementById("pnlCount").innerText = `${data.length} giao dịch`;
}

/*************************************************
 * CALENDARS
 *************************************************/
function renderCalendars(from, to, pnlData) {
  calendarsContainer.innerHTML = "";

  const months = getMonthsBetween(from, to);

  months.forEach(({ year, month, monthName }) => {
    const section = document.createElement("div");
    section.className = "calendar-section";

    const title = document.createElement("h3");
    title.textContent = `📅 ${monthName}`;
    section.appendChild(title);

    const grid = document.createElement("div");
    grid.className = "calendar-grid";

    ["CN", "T2", "T3", "T4", "T5", "T6", "T7"].forEach(day => {
      const header = document.createElement("div");
      header.className = "calendar-day-header";
      header.textContent = day;
      grid.appendChild(header);
    });

    renderCalendarMonth(grid, year, month, pnlData);

    section.appendChild(grid);
    calendarsContainer.appendChild(section);
  });
}

function renderCalendarMonth(grid, year, month, pnlData) {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  const pnlByDate = {};
  pnlData.forEach(r => {
    const d = parseDate(r[0]);
    if (d.getFullYear() === year && d.getMonth() === month - 1) {
      const day = d.getDate();
      if (!pnlByDate[day]) pnlByDate[day] = { usdt: 0, vnd: 0 };
      pnlByDate[day].usdt += Number(r[2]);
      pnlByDate[day].vnd += Number(r[3]);
    }
  });

  for (let i = 0; i < firstDay; i++) {
    const cell = document.createElement("div");
    cell.className = "calendar-day calendar-day-empty";
    grid.appendChild(cell);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const pnl = pnlByDate[day] || { usdt: 0, vnd: 0 };
    const pnlValue = currentCurrency === "USDT" ? pnl.usdt : pnl.vnd;
    const cell = document.createElement("div");

    let className = "calendar-day ";
    if (pnlValue === 0) {
      className += "calendar-day-neutral";
    } else if (pnlValue > 0) {
      className += "calendar-day-profit";
    } else {
      className += "calendar-day-loss";
    }
    cell.className = className;

    const displayPnl = currentCurrency === "USDT" 
      ? (pnl.usdt !== 0 ? fmtUSDT(pnl.usdt) : "")
      : (pnl.vnd !== 0 ? fmtVND(pnl.vnd) : "");

    cell.innerHTML = `
      <div class="calendar-day-number">${day}</div>
      ${displayPnl ? `<div class="calendar-day-pnl ${pnlValue >= 0 ? "text-positive" : "text-negative"}">${displayPnl}</div>` : ""}
    `;

    grid.appendChild(cell);
  }
}

function getMonthsBetween(from, to) {
  const months = [];
  const current = new Date(from.getFullYear(), from.getMonth(), 1);
  const end = new Date(to.getFullYear(), to.getMonth(), 1);

  const monthNames = [
    "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
    "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
  ];

  while (current <= end) {
    months.push({
      year: current.getFullYear(),
      month: current.getMonth() + 1,
      monthName: `${monthNames[current.getMonth()]} ${current.getFullYear()}`
    });
    current.setMonth(current.getMonth() + 1);
  }

  return months;
}

/*************************************************
 * START
 *************************************************/
init();
