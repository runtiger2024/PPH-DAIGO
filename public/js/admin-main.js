// --- js/admin-main.js (優化後完整版) ---
// 這個檔案將被所有頁面共用，提供漢堡選單、登出、後台通知等共用功能。

document.addEventListener("DOMContentLoaded", () => {
  const SharedApp = {
    // ---- 設定 ----
    config: {
      apiBaseUrl: "",
      token: localStorage.getItem("authToken"),
    },

    // ---- DOM 元素 ----
    elements: {
      hamburgerBtn: document.getElementById("hamburger-btn"),
      mobileMenu: document.getElementById("mobile-menu"),
      logoutBtnDesktop: document.getElementById("logout-btn"),
      logoutBtnMobile: document.getElementById("logout-btn-mobile"),
      ordersBadge: document.getElementById("orders-badge"),
      requestsBadge: document.getElementById("requests-badge"),
    },

    // ---- 初始化函式 ----
    init() {
      // 1. 執行適用於全站的邏輯
      this.handleHamburgerMenu();

      // 2. 檢查是否登入，如果登入了才執行後台相關邏輯
      if (this.config.token) {
        this.handleLogout();
        this.initializeNotifications();
      }
    },

    // ---- 功能函式 ----

    /**
     * 處理漢堡選單的開關
     */
    handleHamburgerMenu() {
      if (this.elements.hamburgerBtn && this.elements.mobileMenu) {
        this.elements.hamburgerBtn.addEventListener("click", () => {
          this.elements.hamburgerBtn.classList.toggle("is-active");
          this.elements.mobileMenu.classList.toggle("is-active");
        });
      }
    },

    /**
     * 處理登出按鈕 (桌面版與手機版)
     */
    handleLogout() {
      const performLogout = (event) => {
        event.preventDefault();
        localStorage.removeItem("authToken");
        alert("您已成功登出。");
        window.location.href = "login.html";
      };

      if (this.elements.logoutBtnDesktop) {
        this.elements.logoutBtnDesktop.addEventListener("click", performLogout);
      }
      if (this.elements.logoutBtnMobile) {
        this.elements.logoutBtnMobile.addEventListener("click", performLogout);
      }
    },

    /**
     * 初始化通知功能 (載入一次，並設定定時檢查)
     */
    initializeNotifications() {
      // 確認角標元素存在才執行 (代表在後台頁面)
      if (this.elements.ordersBadge || this.elements.requestsBadge) {
        this.fetchNotifications(); // 頁面載入時先檢查一次
        setInterval(this.fetchNotifications.bind(this), 30000); // 每 30 秒自動檢查一次
      }
    },

    /**
     * 從 API 獲取通知摘要
     */
    async fetchNotifications() {
      try {
        const response = await fetch(
          `${this.config.apiBaseUrl}/api/notifications/summary`,
          {
            headers: { Authorization: `Bearer ${this.config.token}` },
          }
        );
        if (!response.ok) return; // 如果請求失敗或Token過期，則靜默失敗

        const data = await response.json();

        this.updateBadge(this.elements.ordersBadge, data.newOrdersCount);
        this.updateBadge(this.elements.requestsBadge, data.newRequestsCount);
      } catch (error) {
        console.error("檢查通知時發生錯誤:", error);
      }
    },

    /**
     * 更新單一通知角標的顯示狀態和內容
     * @param {HTMLElement} badgeElement - 角標的 DOM 元素
     * @param {number} count - 通知的數量
     */
    updateBadge(badgeElement, count) {
      if (!badgeElement) return; // 如果頁面上沒有這個元素，就直接返回

      if (count > 0) {
        badgeElement.textContent = count;
        badgeElement.style.display = "inline-block";
      } else {
        badgeElement.textContent = "";
        badgeElement.style.display = "none";
      }
    },
  };

  // --- 啟動共用應用程式 ---
  SharedApp.init();
});
