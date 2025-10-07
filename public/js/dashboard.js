document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("authToken");
  if (!token) {
    window.location.href = "login.html";
    return;
  }
  // 準備好要重複使用的 headers
  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
  const API_BASE_URL = "";

  const todaySalesEl = document.getElementById("today-sales");
  const todayOrdersEl = document.getElementById("today-orders");
  const weekSalesEl = document.getElementById("week-sales");
  const monthSalesEl = document.getElementById("month-sales");
  const salesChartCanvas = document.getElementById("sales-chart");

  async function fetchDashboardData() {
    try {
      // --- 唯一的修改點在這裡 ---
      // 在 fetch 請求中加入 headers: authHeaders
      const response = await fetch(`${API_BASE_URL}/api/dashboard-summary`, {
        headers: authHeaders,
      });

      if (!response.ok) throw new Error("無法獲取儀表板資料");

      const data = await response.json();

      // 渲染摘要卡片
      todaySalesEl.textContent = `$${data.today.sales.toLocaleString()}`;
      todayOrdersEl.textContent = data.today.count;
      weekSalesEl.textContent = `$${data.thisWeek.sales.toLocaleString()}`;
      monthSalesEl.textContent = `$${data.thisMonth.sales.toLocaleString()}`;

      // 準備圖表資料 (這裡我們用年度資料來畫)
      const chartData = {
        labels: ["本年度"], // 簡化為顯示單一年度總額
        datasets: [
          {
            label: "年度總銷售額",
            data: [data.thisYear.sales],
            backgroundColor: "rgba(215, 95, 40, 0.6)",
            borderColor: "rgba(215, 95, 40, 1)",
            borderWidth: 1,
          },
        ],
      };

      renderSalesChart(chartData);
    } catch (error) {
      console.error("錯誤:", error);
      document.querySelector(
        ".dashboard-summary-grid"
      ).innerHTML = `<p style="color: red;">無法載入摘要資訊: ${error.message}</p>`;
    }
  }

  let salesChart = null; // 用來存放 Chart.js 實體
  function renderSalesChart(data) {
    if (salesChart) {
      salesChart.destroy(); // 如果圖表已存在，先銷毀
    }
    if (!salesChartCanvas) return;
    const ctx = salesChartCanvas.getContext("2d");
    salesChart = new Chart(ctx, {
      type: "bar",
      data: data,
      options: {
        scales: {
          y: {
            beginAtZero: true,
          },
        },
        responsive: true,
        maintainAspectRatio: false,
      },
    });
  }

  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("authToken");
      window.location.href = "login.html";
    });
  }

  fetchDashboardData();
});
