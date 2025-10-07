// 更好的作法是將所有與應用程式相關的邏輯包裝在一個物件或模組中，避免污染全域範圍。
const App = {
  // ---- 設定與狀態管理 (Configuration & State) ----
  config: {
    apiBaseUrl: "https://daigou-platform-api.onrender.com",
  },

  // ---- DOM 元素集中管理 (DOM Element Cache) ----
  elements: {
    copyBtn: null,
    confirmationInput: null,
    submitBtn: null,
    paopaohuIdInput: null,
    lastFiveInput: null,
    emailInput: null,
    taxIdInput: null,
    cartItemsBody: null,
    cartSummaryEl: null,
    bankAccountEl: null,
  },

  /**
   * 初始化應用程式
   * - 尋找並快取所有需要的 DOM 元素
   * - 綁定所有事件監聽器
   * - 首次渲染購物車
   */
  init() {
    // 使用 document.getElementById 比對 ID 更精準
    this.elements = {
      copyBtn: document.getElementById("copy-btn"),
      confirmationInput: document.getElementById("confirmation-input"),
      submitBtn: document.getElementById("submit-btn"),
      paopaohuIdInput: document.getElementById("paopaohu-id"),
      lastFiveInput: document.getElementById("last-five"),
      emailInput: document.getElementById("customer-email"),
      taxIdInput: document.getElementById("tax-id"),
      cartItemsBody: document.getElementById("cart-items-body"),
      cartSummaryEl: document.getElementById("cart-summary"),
      bankAccountEl: document.getElementById("bank-account"),
    };

    this.bindEvents();
    this.renderCart();
  },

  /**
   * 集中綁定所有事件監聽器
   */
  bindEvents() {
    this.elements.cartItemsBody.addEventListener(
      "click",
      this.handleCartActions.bind(this)
    );
    this.elements.cartItemsBody.addEventListener(
      "change",
      this.handleNoteChange.bind(this)
    );
    this.elements.copyBtn.addEventListener("click", this.handleCopy.bind(this));
    this.elements.confirmationInput.addEventListener(
      "input",
      this.handleConfirmation.bind(this)
    );
    this.elements.submitBtn.addEventListener(
      "click",
      this.handleSubmit.bind(this)
    );
  },

  // ---- 渲染函式 (Rendering Functions) ----

  /**
   * 主渲染函式，協調購物車項目和總結的渲染
   */
  renderCart() {
    const cart = getCart(); // 假設 getCart() 是您定義在其他地方的全域函式
    const totals = this.calculateTotals(cart);

    this.renderCartItems(cart);
    this.renderCartSummary(totals);
  },

  /**
   * 渲染購物車項目列表 (效能優化)
   */
  renderCartItems(cart) {
    if (cart.length === 0) {
      this.elements.cartItemsBody.innerHTML =
        '<tr><td colspan="6" style="text-align: center;">您的購物車是空的</td></tr>';
      return;
    }

    // 使用 .map() 和 .join() 一次性生成所有 HTML，效能優於在迴圈中操作 innerHTML
    const cartHtml = cart
      .map((item) => {
        const serviceFee = item.serviceFee || 0;
        const itemTotal = (item.price + serviceFee) * item.quantity;
        return `
                <tr>
                    <td data-label="商品名稱">
                        <div class="cart-item-title">${item.title}</div>
                        <input type="text" class="item-notes" data-id="${
                          item.id
                        }" placeholder="新增顏色、規格等備註..." value="${
          item.notes || ""
        }">
                    </td>
                    <td data-label="單價">$${item.price}</td>
                    <td data-label="服務費">$${serviceFee}</td>
                    <td data-label="數量">
                        <div class="quantity-input">
                            <button class="quantity-btn" data-id="${
                              item.id
                            }" data-change="-1">-</button>
                            <input type="text" value="${
                              item.quantity
                            }" readonly>
                            <button class="quantity-btn" data-id="${
                              item.id
                            }" data-change="1">+</button>
                        </div>
                    </td>
                    <td data-label="小計">$${itemTotal}</td>
                    <td data-label="操作">
                        <button class="cart-item-remove" data-id="${
                          item.id
                        }">&times;</button>
                    </td>
                </tr>
            `;
      })
      .join("");

    this.elements.cartItemsBody.innerHTML = cartHtml;
  },

  /**
   * 渲染購物車總結資訊
   */
  renderCartSummary(totals) {
    this.elements.cartSummaryEl.innerHTML = `
            <div style="font-size: 1em; color: #6c757d;">商品總額: $${totals.subtotal} TWD</div>
            <div style="font-size: 1em; color: #6c757d;">服務費總額: $${totals.totalServiceFee} TWD</div>
            <div style="font-size: 1.2em; font-weight: bold; margin-top: 10px;">訂單總金額: $${totals.finalTotal} TWD</div>
        `;
  },

  // ---- 事件處理函式 (Event Handlers) ----

  /**
   * 處理購物車內的操作 (增加/減少數量、刪除)
   */
  handleCartActions(event) {
    const target = event.target;
    const productId = target.dataset.id;

    if (!productId) return; // 如果點擊的元素沒有 data-id，直接返回

    if (target.classList.contains("quantity-btn")) {
      const change = parseInt(target.dataset.change, 10);
      updateCartQuantity(productId, change); // 傳遞 change 而不是新數量，讓邏輯在 cart.js 中處理
      this.renderCart();
    }

    if (target.classList.contains("cart-item-remove")) {
      if (confirm("您確定要從購物車移除此商品嗎？")) {
        removeFromCart(productId); // 假設 removeFromCart 是您定義的全域函式
        this.renderCart();
      }
    }
  },

  /**
   * 處理商品備註的變更
   */
  handleNoteChange(event) {
    const target = event.target;
    if (target.classList.contains("item-notes")) {
      const productId = target.dataset.id;
      const notes = target.value;
      updateCartNotes(productId, notes); // 假設 updateCartNotes 是您定義的全域函式
      // 備註變更通常不需要重新渲染整個購物車，可以提升體驗，但若有相關計算則需重繪
    }
  },

  /**
   * 處理複製銀行帳號
   */
  handleCopy() {
    navigator.clipboard
      .writeText(this.elements.bankAccountEl.innerText)
      .then(() => {
        this.elements.copyBtn.innerText = "已複製!";
        setTimeout(() => {
          this.elements.copyBtn.innerText = "一鍵複製";
        }, 2000);
      });
  },

  /**
   * 處理確認文字輸入
   */
  handleConfirmation() {
    const isConfirmed =
      this.elements.confirmationInput.value.trim() === "我了解";
    this.elements.submitBtn.disabled = !isConfirmed;
    this.elements.submitBtn.classList.toggle("disabled", !isConfirmed);
  },

  /**
   * 處理訂單提交
   */
  async handleSubmit(event) {
    event.preventDefault();

    this.elements.submitBtn.disabled = true; // 防止重複點擊
    this.elements.submitBtn.innerText = "訂單提交中...";

    const formData = this.getFormData();
    const validationError = this.validateForm(formData);

    if (validationError) {
      alert(validationError);
      this.resetSubmitButton();
      return;
    }

    try {
      const response = await fetch(`${this.config.apiBaseUrl}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (!response.ok) {
        // 優先使用後端返回的錯誤訊息
        throw new Error(result.message || `伺服器錯誤: ${response.status}`);
      }

      alert(`訂單建立成功！\n您的訂單編號是: ${result.order.orderId}`);
      localStorage.removeItem("shoppingCart");
      window.location.reload();
    } catch (error) {
      console.error("訂單提交錯誤:", error);
      alert(`訂單提交時發生錯誤: ${error.message}`);
      this.resetSubmitButton();
    }
  },

  // ---- 輔助/邏輯函式 (Helper/Logic Functions) ----

  /**
   * 將總金額計算邏輯抽離成獨立函式，方便複用
   */
  calculateTotals(cart) {
    const totals = cart.reduce(
      (acc, item) => {
        const serviceFee = item.serviceFee || 0;
        acc.subtotal += item.price * item.quantity;
        acc.totalServiceFee += serviceFee * item.quantity;
        return acc;
      },
      { subtotal: 0, totalServiceFee: 0 }
    );

    totals.finalTotal = totals.subtotal + totals.totalServiceFee;
    return totals;
  },

  /**
   * 獲取表單資料
   */
  getFormData() {
    const cart = getCart();
    const totals = this.calculateTotals(cart);
    return {
      paopaohuId: this.elements.paopaohuIdInput.value.trim(),
      email: this.elements.emailInput.value.trim(),
      taxId: this.elements.taxIdInput.value.trim(),
      lastFiveDigits: this.elements.lastFiveInput.value.trim(),
      totalAmount: totals.finalTotal,
      items: cart,
    };
  },

  /**
   * 統一的表單驗證邏輯
   * @returns {string|null} 返回錯誤訊息字串或 null (表示驗證通過)
   */
  validateForm(data) {
    if (!data.paopaohuId || !data.lastFiveDigits || !data.email) {
      return "請務必填寫所有必填欄位 (跑跑虎編號、E-mail、匯款末五碼)！";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      return "請輸入有效的 E-mail 格式！";
    }
    if (data.taxId && !/^\d{8}$/.test(data.taxId)) {
      return "統一編號格式不正確，必須是 8 位數字。";
    }
    if (data.items.length === 0) {
      return "您的購物車是空的，無法建立訂單！";
    }
    return null; // 驗證通過
  },

  /**
   * 重設提交按鈕的狀態
   */
  resetSubmitButton() {
    this.elements.submitBtn.disabled = false;
    this.elements.submitBtn.innerText = "確認送出訂單";
  },
};

// --- 當 DOM 載入完成後，啟動應用程式 ---
document.addEventListener("DOMContentLoaded", () => {
  // 為了讓這段程式碼能運作，需要您在其他地方定義好以下幾個和 localStorage 互動的全域函式：
  // - getCart()
  // - updateCartQuantity(productId, change)
  // - removeFromCart(productId)
  // - updateCartNotes(productId, notes)
  App.init();
});
