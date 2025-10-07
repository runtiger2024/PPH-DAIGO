document.addEventListener("DOMContentLoaded", () => {
  const lookupForm = document.getElementById("lookup-form");
  const paopaohuIdInput = document.getElementById("paopaohu-id-input");
  const resultsContainer = document.getElementById("lookup-results");

  // 請確認這個網址是您部署好的後端網址
  const API_BASE_URL = "https://daigou-platform-api.onrender.com";

  lookupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const paopaohuId = paopaohuIdInput.value.trim();

    if (!paopaohuId) {
      resultsContainer.innerHTML =
        '<p class="error-message">請輸入您的跑跑虎會員編號。</p>';
      return;
    }

    resultsContainer.innerHTML = "<p>正在查詢中，請稍候...</p>";

    try {
      // 使用 Query String 來傳遞查詢參數
      const response = await fetch(
        `${API_BASE_URL}/api/orders/lookup?paopaohuId=${paopaohuId}`
      );

      if (!response.ok) {
        throw new Error("查詢失敗，請稍後再試。");
      }

      const orders = await response.json();
      renderResults(orders);
    } catch (error) {
      console.error("查詢訂單時發生錯誤:", error);
      resultsContainer.innerHTML = `<p class="error-message">${error.message}</p>`;
    }
  });

  function renderResults(orders) {
    resultsContainer.innerHTML = ""; // 清空結果

    if (orders.length === 0) {
      resultsContainer.innerHTML = "<p>查無此會員編號的訂單紀錄。</p>";
      return;
    }

    orders.forEach((order) => {
      const itemsHtml = order.items
        .map(
          (item) =>
            `<li>${item.title} (x${item.quantity}) - $${
              item.price * item.quantity
            }</li>`
        )
        .join("");

      const orderCard = `
                <div class="order-card page-section">
                    <div class="order-card-header">
                        <h3>訂單編號: ${order.orderId}</h3>
                        <span class="order-status">${order.status}</span>
                    </div>
                    <div class="order-card-body">
                        <p><strong>下單時間:</strong> ${new Date(
                          order.createdAt
                        ).toLocaleString()}</p>
                        <p><strong>訂單總額:</strong> $${
                          order.totalAmount
                        } TWD</p>
                        <p><strong>商品列表:</strong></p>
                        <ul>${itemsHtml}</ul>
                    </div>
                </div>
            `;
      resultsContainer.insertAdjacentHTML("beforeend", orderCard);
    });
  }
});
