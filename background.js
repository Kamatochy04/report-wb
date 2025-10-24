chrome.runtime.onInstalled.addListener(() => {
  console.log("Feedback Checker установлен");
});

chrome.runtime.onMessage.addListener(async (msg, sender) => {
  if (msg.action === "screenshot" && sender.tab?.id) {
    try {
      const { number, lastElement } = msg;

      if (!lastElement || typeof lastElement !== "string") {
        console.warn("lastElement пустой или не строка:", lastElement);
      }

      const raw = (lastElement || "")
        .replace(/\u00A0/g, " ")
        .trim()
        .toLowerCase();

      const months = {
        янв: "01",
        января: "01",
        январь: "01",
        фев: "02",
        февраля: "02",
        февраль: "02",
        мар: "03",
        марта: "03",
        март: "03",
        апр: "04",
        апреля: "04",
        апрель: "04",
        май: "05",
        мая: "05",
        июн: "06",
        июня: "06",
        июнь: "06",
        июл: "07",
        июля: "07",
        июль: "07",
        авг: "08",
        августа: "08",
        август: "08",
        сен: "09",
        сентября: "09",
        сент: "09",
        сентябрь: "09",
        окт: "10",
        октября: "10",
        октябрь: "10",
        ноя: "11",
        ноября: "11",
        ноябрь: "11",
        дек: "12",
        декабря: "12",
        декабрь: "12",
      };

      const re =
        /(\d{1,2})\s+([а-яё]+)\.?\s+(\d{4})\s*(?:г\.?)?\s*(?:в\s*)?(\d{1,2}):(\d{2})/i;
      const match = raw.match(re);

      let formattedDate = "unknown_date";

      if (match) {
        let [, day, monthName, year, hour, minute] = match;
        day = day.padStart(2, "0");
        hour = hour.padStart(2, "0");
        minute = minute.padStart(2, "0");

        let month = months[monthName];
        if (!month) {
          for (const key in months) {
            if (monthName.startsWith(key)) {
              month = months[key];
              break;
            }
          }
        }

        if (!month) {
          console.warn("Не удалось распознать месяц:", monthName);
        } else {
          const shortYear = String(year).slice(-2);
          formattedDate = `${day}.${month}.${shortYear}_${hour}-${minute}`;
        }
      } else {
        console.warn("Регекс не совпал с lastElement:", raw);
      }

      console.log("formattedDate =", formattedDate);

      const fileBase = number ? String(number) : "no_number";
      const fileName = `${fileBase}_${formattedDate}.png`;

      const dateNow = new Date();
      const dateStr = dateNow.toISOString().split("T")[0]; // YYYY-MM-DD
      const folderName = `photos_${dateStr}`;

      const imageUri = await chrome.tabs.captureVisibleTab(
        sender.tab.windowId,
        {
          format: "png",
        }
      );

      await chrome.downloads.download({
        url: imageUri,
        filename: `${folderName}/${fileName}`,
        saveAs: false,
      });

      console.log(`криншот сохранён как: ${fileName}`);
    } catch (err) {
      console.error("Ошибка при сохранении скриншота:", err);
    }
  }
});
