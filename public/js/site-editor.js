document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("settings-form");
  const feedbackMessage = document.getElementById("feedback-message");
  const token = localStorage.getItem("authToken");

  if (!token) {
    window.location.href = "/login.html";
    return;
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  // 載入當前設定並填入表單
  async function loadSettings() {
    try {
      const response = await fetch("/api/admin/site-settings", { headers });
      if (!response.ok) throw new Error("無法載入網站設定");

      const settings = await response.json();

      // 使用 data-path 屬性來動態填值
      document.querySelectorAll("[data-path]").forEach((input) => {
        const path = input.dataset.path.split("."); // e.g., ['theme', 'primaryColor']
        let value = settings;
        path.forEach((key) => {
          value = value ? value[key] : undefined;
        });

        if (value !== undefined) {
          if (input.type === "checkbox") {
            input.checked = value;
          } else {
            input.value = value;
          }
        }
      });
      feedbackMessage.textContent = "設定已成功載入。";
      feedbackMessage.style.color = "var(--success-color)";
    } catch (error) {
      feedbackMessage.textContent = `錯誤：${error.message}`;
      feedbackMessage.style.color = "var(--danger-color)";
    }
  }

  // 提交表單以儲存設定
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    feedbackMessage.textContent = "正在儲存...";

    // 從表單動態建立設定物件
    const settingsToSave = {
      theme: {},
      content: {},
      layout: {},
    };

    document.querySelectorAll("[data-path]").forEach((input) => {
      const path = input.dataset.path.split("."); // e.g., ['theme', 'primaryColor']
      const group = path[0];
      const key = path[1];

      if (input.type === "checkbox") {
        settingsToSave[group][key] = input.checked;
      } else {
        settingsToSave[group][key] = input.value;
      }
    });

    try {
      const response = await fetch("/api/admin/site-settings", {
        method: "PUT",
        headers,
        body: JSON.stringify(settingsToSave),
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.message || "儲存失敗");

      feedbackMessage.textContent = result.message;
      feedbackMessage.style.color = "var(--success-color)";
    } catch (error) {
      feedbackMessage.textContent = `錯誤：${error.message}`;
      feedbackMessage.style.color = "var(--danger-color)";
    }
  });

  loadSettings();
});
