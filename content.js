let startDate = null;
let endDate = null;
let dateRangeArray = [];
let articuls = [];
let stats = {};

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "setDateRange") {
    startDate = message.start;
    endDate = message.end;
    articuls = message.articuls;
    console.log("📦 Полученные артикулы:", articuls);

    dateRangeArray = [];
    const [sd, sm] = startDate.split(".").map(Number);
    const [ed, em] = endDate.split(".").map(Number);
    const start = new Date(2025, sm - 1, sd);
    const end = new Date(2025, em - 1, ed);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      dateRangeArray.push(`${day}.${month}`);
    }

    console.log("📅 Массив дат для обработки:", dateRangeArray);
  }
});

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

function containsDateFromArray(str) {
  if (!str) return null;
  for (const d of dateRangeArray) {
    if (str.includes(d)) return d;
  }
  return null;
}

(async function () {
  const modal = document.createElement("div");
  modal.innerHTML = `
    <div id="fb-modal" style="
      position: fixed;
      top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(0,0,0,0.6);
      display: flex; align-items: center; justify-content: center;
      z-index: 999999;">
      <div style="
        background: white;
        padding: 20px;
        border-radius: 10px;
        text-align: center;
        max-width: 300px;">
        <h3>Feedback Checker</h3>
        <p>Обработка отзывов за выбранный период</p>
        <button id="runCheck" style="
          padding: 8px 14px;
          border: none;
          border-radius: 6px;
          background: #4caf50;
          color: white;
          cursor: pointer;">Запустить</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById("runCheck").addEventListener("click", async () => {
    modal.remove();
    await processAllArticuls();
    showStats();
  });
})();

async function processAllArticuls() {
  const inputItem = document.querySelector(".Simple-input__field__zjmb3BTXOH");
  if (!inputItem) {
    alert(" Поле поиска не найдено!");
    return;
  }

  for (const art of articuls) {
    console.log("🔍 Обрабатываем артикул:", art);
    stats[art] = { total: 0, approved: 0 };

    inputItem.value = art;
    inputItem.dispatchEvent(new Event("input", { bubbles: true }));
    inputItem.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));

    await delay(2000);
    await steppingByElements(art);
  }
}

async function steppingByElements(art) {
  const parentSelector = ".Base-table-body__F-y98zdE6m";
  let parent = document.querySelector(parentSelector);
  if (!parent) {
    console.warn("Элемент таблицы не найден для артикула:", art);
    return;
  }

  while (true) {
    parent = document.querySelector(parentSelector);
    if (!parent) break;
    const children = Array.from(parent.children);

    for (let child of children) {
      const textEl = child.children[2]?.querySelector(".Text__nYviMz7WeF");
      if (!textEl) continue;
      const text = textEl.innerText || "";

      const dateInText = containsDateFromArray(text);
      if (!dateInText) continue;

      stats[art].total++;

      const approved = child
        .querySelector(".Chips__text__Agf4iPgm-r")
        ?.innerText.includes("Одобрена");
      if (!approved) continue;

      stats[art].approved++;

      child.scrollIntoView({ behavior: "smooth", block: "center" });
      await delay(500);
      child.click();

      try {
        await waitFor(".Sidebar-panel__ZRoOVwKELR", 4000);
      } catch {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
        await delay(500);
        continue;
      }

      let number = null;
      let lastElement = null;
      try {
        const infoBlock = document
          .querySelector(".Sidebar-panel__ZRoOVwKELR")
          ?.querySelector(".Product-info__additional-info__i6wYBjrEBV");
        if (infoBlock) {
          const span = infoBlock.children[2]?.querySelector("span");
          if (span) {
            const m = span.innerText.match(/\d+/);
            if (m) number = m[0];
          }
        }

        const data = document
          .querySelector(".Sidebar-panel__ZRoOVwKELR")
          ?.querySelectorAll(".Text__nYviMz7WeF");
        if (data && data.length > 0)
          lastElement = data[data.length - 1].innerText;
      } catch (e) {
        console.warn("Ошибка при чтении сайдбара:", e);
      }

      await delay(800);
      try {
        chrome.runtime.sendMessage({
          action: "screenshot",
          number,
          lastElement,
        });
      } catch (e) {
        console.warn("Ошибка отправки сообщения", e);
      }

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      await delay(600);
    }

    const pagination = document.querySelector(
      ".Pagination-buttons__pKalkfGkza"
    );
    const nextBtn = pagination?.lastElementChild?.querySelector(
      ".Pagination-icon-button__yXSU-Nq5A9"
    );
    if (nextBtn) {
      nextBtn.click();
      await delay(1500);
    } else break;
  }
}

function showStats() {
  const modal = document.createElement("div");

  let rows = Object.entries(stats)
    .map(
      ([art, s]) => `
        <tr class="stat-row">
          <td>${art}</td>
          <td>${s.total}</td>
          <td>${s.approved}</td>
        </tr>`
    )
    .join("");

  modal.innerHTML = `
    <div id="stats-modal-overlay" style="
      position:fixed;top:0;left:0;width:100vw;height:100vh;
      background:rgba(0,0,0,0.6);
      display:flex;align-items:center;justify-content:center;
      z-index:999999;font-family:'Segoe UI',sans-serif;">
      
      <div id="stats-modal" style="
        background:rgba(255,255,255,0.95);
        backdrop-filter:blur(8px);
        border-radius:16px;
        box-shadow:0 10px 25px rgba(0,0,0,0.2);
        padding:25px 30px;
        width:420px;
        animation:fadeIn 0.3s ease;">
        
        <h2 style="text-align:center;margin-bottom:16px;color:#333;">
          📊 Результаты проверки
        </h2>
        <div style="
          max-height:300px;
          overflow-y:auto;
          border:1px solid #ddd;
          border-radius:8px;
          margin-bottom:14px;
          box-shadow:inset 0 1px 4px rgba(0,0,0,0.05);
        ">
          <table style="border-collapse:collapse;width:100%;text-align:center;font-size:14px;">
            <thead style="background:#2196f3;color:white;">
              <tr><th>Артикул</th><th>Жалоб</th><th>Одобрено</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>

        <div style="display:flex;justify-content:center;gap:10px;">
          <button id="copyStatsBtn" style="
            padding:8px 14px;
            background:#2196f3;
            color:white;
            border:none;
            border-radius:8px;
            cursor:pointer;
            transition:all 0.2s;
          ">📋 Скопировать</button>

          <button id="closeStatsBtn" style="
            padding:8px 14px;
            background:#f44336;
            color:white;
            border:none;
            border-radius:8px;
            cursor:pointer;
            transition:all 0.2s;
          ">✖ Закрыть</button>
        </div>
      </div>
    </div>

    <style>
      #stats-modal-overlay button:hover {
        transform: translateY(-1px);
        opacity: 0.9;
      }
      #stats-modal-overlay table tr:nth-child(even) {
        background: #f9f9f9;
      }
      #stats-modal-overlay table th, #stats-modal-overlay table td {
        padding: 6px 8px;
        border-bottom: 1px solid #eee;
      }
      @keyframes fadeIn {
        from { opacity: 0; transform: scale(0.95); }
        to { opacity: 1; transform: scale(1); }
      }
    </style>
  `;

  document.body.appendChild(modal);

  const overlay = modal.querySelector("#stats-modal-overlay");
  overlay
    .querySelector("#closeStatsBtn")
    .addEventListener("click", () => modal.remove());
  overlay
    .querySelector("#copyStatsBtn")
    .addEventListener("click", copyStatsToClipboard);
}

function copyStatsToClipboard() {
  let text = "";
  for (const [art, s] of Object.entries(stats)) {
    text += `${art}\t${s.total}\t${s.approved}\n`;
  }

  navigator.clipboard.writeText(text.trim()).then(() => {
    const btn = document.getElementById("copyStatsBtn");
    const oldText = btn.textContent;
    btn.textContent = "✅ Скопировано!";
    btn.style.background = "#4caf50";
    setTimeout(() => {
      btn.textContent = oldText;
      btn.style.background = "#2196f3";
    }, 2000);
  });
}
