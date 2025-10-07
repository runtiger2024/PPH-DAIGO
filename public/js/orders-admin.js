document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("authToken");
  if (!token) {
    window.location.href = "login.html";
    return;
  }
  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
  const API_BASE_URL = "https://daigou-platform-api.onrender.com";

  const orderListBody = document.getElementById("order-list-body");
  const selectAllCheckbox = document.getElementById("select-all-checkbox");
  const bulkDeleteBtn = document.getElementById("bulk-delete-btn");

  const statusOptions = [
    "待處理",
    "已通知廠商發貨",
    "已發貨",
    "已完成",
    "訂單取消",
  ];

  async function fetchAndRenderOrders() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/orders`, {
        headers: authHeaders,
      });
      if (!response.ok) throw new Error("無法獲取訂單列表");
      const orders = await response.json();
      orderListBody.innerHTML = "";

      if (orders.length === 0) {
        orderListBody.innerHTML = `<tr><td colspan="8" style="text-align: center;">目前沒有任何訂單。</td></tr>`;
      } else {
        orders.forEach((order) => {
          const itemsHtml =
            order.items && Array.isArray(order.items)
              ? order.items
                  .map(
                    (item) =>
                      `<li>${item.title} (x${
                        item.quantity
                      })<br><small style="color:#6c757d">備註: ${
                        item.notes || "無"
                      }</small></li>`
                  )
                  .join("")
              : "<li>商品資料錯誤</li>";
          const statusSelectHtml = `<select class="status-select" data-order-id="${
            order.orderId
          }">${statusOptions
            .map(
              (status) =>
                `<option value="${status}" ${
                  order.status === status ? "selected" : ""
                }>${status}</option>`
            )
            .join("")}</select>`;
          let lastOperationHtml = "無紀錄";
          if (
            order.activityLog &&
            Array.isArray(order.activityLog) &&
            order.activityLog.length > 0
          ) {
            const lastLog = order.activityLog[order.activityLog.length - 1];
            lastOperationHtml = `<span><strong>${
              lastLog.updatedBy
            }</strong><br><small>${new Date(
              lastLog.timestamp
            ).toLocaleString()}</small></span>`;
          }
          const customerInfoHtml = `<ul class="info-list"><li><strong>跑跑虎ID:</strong> ${
            order.paopaohuId || "未提供"
          }</li><li><strong>Email:</strong> ${
            order.email || "未提供"
          }</li><li><strong>末五碼:</strong> ${
            order.lastFiveDigits || "未提供"
          }</li><li><strong>統編:</strong> ${order.taxId || "無"}</li></ul>`;
          const orderInfoHtml = `<ul class="info-list"><li><strong>編號:</strong> ${
            order.orderId || "N/A"
          }</li><li><strong>時間:</strong> ${
            order.createdAt ? new Date(order.createdAt).toLocaleString() : "N/A"
          }</li></ul>`;

          const row = `
                        <tr>
                            <td data-label="選取"><input type="checkbox" class="order-checkbox" value="${
                              order.orderId
                            }"></td>
                            <td data-label="訂單資訊">${orderInfoHtml}</td>
                            <td data-label="客戶資訊">${customerInfoHtml}</td>
                            <td data-label="商品詳情"><ul class="compact-list">${itemsHtml}</ul></td>
                            <td data-label="總金額"><strong>$${
                              order.totalAmount || 0
                            }</strong></td>
                            <td data-label="狀態">${statusSelectHtml}</td>
                            <td data-label="最後操作">${lastOperationHtml}</td>
                            <td data-label="操作"><button class="btn-small btn-danger btn-delete" data-order-id="${
                              order.orderId
                            }">刪除</button></td>
                        </tr>`;
          orderListBody.insertAdjacentHTML("beforeend", row);
        });
      }
      if (window.checkNotifications) checkNotifications();
    } catch (error) {
      console.error("錯誤:", error);
      orderListBody.innerHTML = `<tr><td colspan="8">載入訂單失敗: ${error.message}</td></tr>`;
    }
  }

  function toggleBulkDeleteButton() {
    const selectedCheckboxes = document.querySelectorAll(
      ".order-checkbox:checked"
    );
    bulkDeleteBtn.style.display =
      selectedCheckboxes.length > 0 ? "inline-block" : "none";
    selectAllCheckbox.checked =
      selectedCheckboxes.length > 0 &&
      selectedCheckboxes.length ===
        document.querySelectorAll(".order-checkbox").length;
  }

  selectAllCheckbox.addEventListener("change", (event) => {
    document.querySelectorAll(".order-checkbox").forEach((checkbox) => {
      checkbox.checked = event.target.checked;
    });
    toggleBulkDeleteButton();
  });

  orderListBody.addEventListener("change", (event) => {
    if (event.target.classList.contains("order-checkbox")) {
      toggleBulkDeleteButton();
    }
  });

  bulkDeleteBtn.addEventListener("click", async () => {
    const selectedCheckboxes = document.querySelectorAll(
      ".order-checkbox:checked"
    );
    const orderIds = Array.from(selectedCheckboxes).map((cb) => cb.value);
    if (orderIds.length === 0) return;
    if (
      confirm(
        `您確定要刪除選取的 ${orderIds.length} 筆訂單嗎？此操作無法復原！`
      )
    ) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/orders/bulk-delete`, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({ orderIds }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "批量刪除失敗");
        alert(result.message);
        fetchAndRenderOrders();
        toggleBulkDeleteButton();
      } catch (error) {
        alert(`刪除時發生錯誤: ${error.message}`);
      }
    }
  });

  orderListBody.addEventListener("click", async (event) => {
    if (event.target.classList.contains("btn-delete")) {
      const orderId = event.target.dataset.orderId;
      if (confirm(`您確定要刪除訂單 ${orderId} 嗎？此操作無法復原！`)) {
        try {
          const response = await fetch(
            `${API_BASE_URL}/api/orders/${orderId}`,
            {
              method: "DELETE",
              headers: authHeaders,
            }
          );
          const result = await response.json();
          if (!response.ok) throw new Error(result.message || "刪除失敗");
          alert(result.message);
          fetchAndRenderOrders();
        } catch (error) {
          alert(`刪除時發生錯誤: ${error.message}`);
        }
      }
    }
  });

  orderListBody.addEventListener("change", async (event) => {
    if (event.target.classList.contains("status-select")) {
      const orderId = event.target.dataset.orderId;
      const newStatus = event.target.value;
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/orders/${orderId}/status`,
          {
            method: "PATCH",
            headers: authHeaders,
            body: JSON.stringify({ status: newStatus }),
          }
        );
        if (!response.ok) throw new Error("更新狀態失敗");

        const select = event.target;
        const originalColor = select.closest("tr").style.backgroundColor;
        select.closest("tr").style.backgroundColor = "#d4edda";
        setTimeout(() => {
          select.closest("tr").style.backgroundColor = originalColor;
          fetchAndRenderOrders();
        }, 1000);
      } catch (error) {
        console.error("錯誤:", error);
        alert("更新訂單狀態時發生錯誤。");
        fetchAndRenderOrders();
      }
    }
  });
  document.getElementById("logout-btn").addEventListener("click", () => {
    localStorage.removeItem("authToken");
    window.location.href = "login.html";
  });

  fetchAndRenderOrders();
});
