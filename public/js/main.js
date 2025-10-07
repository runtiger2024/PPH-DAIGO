/* === js/main.js - 網站主要 UI 互動腳本 === */

// 使用 DOMContentLoaded 事件確保在操作 DOM 之前，HTML 已完全載入並解析。
// 這是一個非常重要的好習慣，可以避免找不到元素的錯誤。
document.addEventListener("DOMContentLoaded", () => {
  // --- 漢堡選單互動邏輯 ---
  const hamburgerBtn = document.getElementById("hamburger-btn");
  const body = document.body;

  // 確認元素存在才執行，增加程式碼的穩健性
  if (hamburgerBtn) {
    hamburgerBtn.addEventListener("click", () => {
      // 1. 切換按鈕自身的 active 狀態 (觸發 CSS 中的 X 動畫)
      hamburgerBtn.classList.toggle("is-active");

      // 2. 切換 body 的 menu-open 狀態 (觸發 CSS 中的選單滑入/滑出和背景鎖定)
      body.classList.toggle("menu-is-open");

      // 3. 更新 ARIA 屬性以符合無障礙規範
      // 讀取當前的狀態，'true' or 'false'
      const isExpanded = hamburgerBtn.getAttribute("aria-expanded") === "true";

      // 設定為與當前狀態相反的值
      hamburgerBtn.setAttribute("aria-expanded", !isExpanded);
    });
  }

  // --- 未來可以將其他全域 UI 互動邏輯放在這裡 ---
  // 例如：回到頂端按鈕、彈出視窗的通用控制等。
});
