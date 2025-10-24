document.getElementById("startBtn").addEventListener("click", async () => {
  const startDate = document.getElementById("startDate").value.trim();
  const endDate = document.getElementById("endDate").value.trim();
  const articulsText = document.getElementById("articuls").value.trim();
  // if (!/^\d{2}\.\д{2}$/.test(startDate) || !/^\d{2}\.\д{2}$/.test(endDate)) {
  //   alert("Введите даты в формате дд.мм");
  //   return;
  // }

  const articuls = articulsText.split(/\s+/);

  console.log(articuls);

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["content.js"],
  });

  await chrome.tabs.sendMessage(tab.id, {
    action: "setDateRange",
    start: startDate,
    end: endDate,
    articuls,
  });
});
