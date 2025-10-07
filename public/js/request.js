document.addEventListener("DOMContentLoaded", () => {
  const requestForm = document.getElementById("request-form");
  const responseMessageDiv = document.getElementById("response-message");

  // 請確認這個網址是您部署好的後端網址
  const API_BASE_URL = "https://daigou-platform-api.onrender.com";

  requestForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    responseMessageDiv.textContent = "";
    responseMessageDiv.style.color = "red";

    // 收集表單資料
    const requestData = {
      productUrl: document.getElementById("product-url").value,
      productName: document.getElementById("product-name").value,
      specs: document.getElementById("product-specs").value,
      quantity: parseInt(document.getElementById("product-quantity").value, 10),
      paopaohuId: document.getElementById("paopaohu-id").value, // <-- 新增收集的欄位
      contactInfo: document.getElementById("contact-info").value,
      notes: document.getElementById("product-notes").value,
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "提交請求失敗");
      }

      // 請求提交成功！
      responseMessageDiv.textContent =
        "您的代採購請求已成功送出！我們將盡快與您聯絡報價。";
      responseMessageDiv.style.color = "green";
      requestForm.reset(); // 清空表單
    } catch (error) {
      console.error("提交請求錯誤:", error);
      responseMessageDiv.textContent = error.message;
    }
  });
});
