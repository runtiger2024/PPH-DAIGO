// --- js/checkout.js (全新，取代舊的 script.js) ---

document.addEventListener("DOMContentLoaded", () => {
  // 使用 const 確保 App 物件不被意外覆寫
  const CheckoutApp = {
    // ---- 設定 ----
    config: {
      apiBaseUrl: "https://daigou-platform-api.onrender.com",
    },

    // ---- DOM 元素快取 ----
    elements: {
      form: document.getElementById("checkout-form"),
      cartItemsBody: document.getElementById("cart-items-body"),
      cartSummaryEl: document.getElementById("cart-summary"),
      copyBtn: document.getElementById("copy-btn"),
      bankAccountEl: document.getElementById("bank-account"),
      confirmationInput: document.getElementById("confirmation-input"),
      submitBtn: document.getElementById("submit-btn"),
      paopaohuIdInput: document.getElementById("paopaohu-id"),
      lastFiveInput: document.getElementById("last-five"),
      emailInput: document.getElementById("customer-email"),
      taxIdInput: document.getElementById("tax-id"),
    },

    // ---- 初始化函式 ----
    init() {
      // 確認所有必要的元素都存在才繼續執行，避免頁面錯誤
      if (!this.elements.cartItemsBody) return;

      this.bindEvents();
      this.renderCart();
      Cart.updateCountUI(); // 頁面載入時，更新右上角購物車數量
    },

    // ---- 事件綁定 ----
    bindEvents() {
      this.elements.cartItemsBody.addEventListener(
        "click",
        this.handleCartActions.bind(this)
      );
      this.elements.cartItemsBody.addEventListener(
        "change",
        this.handleNoteChange.bind(this)
      );
      this.elements.copyBtn.addEventListener(
        "click",
        this.handleCopy.bind(this)
      );
      this.elements.confirmationInput.addEventListener(
        "input",
        this.handleConfirmation.bind(this)
      );
      this.elements.form.addEventListener(
        "submit",
        this.handleSubmit.bind(this)
      );
    },

    // ---- 渲染函式 ----
    renderCart() {
      const cart = Cart.get(); // 使用 Cart.get() 新方法
      this.renderCartItems(cart);
      this.renderCartSummary(cart);
    },

    renderCartItems(cart) {
      this.elements.cartItemsBody.innerHTML = "";
      if (cart.length === 0) {
        this.elements.cartItemsBody.innerHTML =
          '<tr><td colspan="6" style="text-align: center;">您的購物車是空的，快去<a href="index.html">批發貨源</a>逛逛吧！</td></tr>';
        return;
      }

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
                                <button type="button" class="quantity-btn" data-id="${
                                  item.id
                                }" data-change="-1">-</button>
                                <input type="text" value="${
                                  item.quantity
                                }" readonly>
                                <button type="button" class="quantity-btn" data-id="${
                                  item.id
                                }" data-change="1">+</button>
                            </div>
                        </td>
                        <td data-label="小計">$${itemTotal}</td>
                        <td data-label="操作">
                            <button type="button" class="cart-item-remove" data-id="${
                              item.id
                            }">&times;</button>
                        </td>
                    </tr>
                `;
        })
        .join("");
      this.elements.cartItemsBody.innerHTML = cartHtml;
    },

    renderCartSummary(cart) {
      const totals = this.calculateTotals(cart);
      this.elements.cartSummaryEl.innerHTML = `
                <div>商品總額: $${totals.subtotal} TWD</div>
                <div>服務費總額: $${totals.totalServiceFee} TWD</div>
                <div style="font-size: 1.2em; font-weight: bold; margin-top: 10px;">訂單總金額: $${totals.finalTotal} TWD</div>
            `;
    },

    // ---- 事件處理函式 ----
    handleCartActions(event) {
      const target = event.target;
      const productId = target.dataset.id;
      if (!productId) return;

      if (target.classList.contains("quantity-btn")) {
        const change = parseInt(target.dataset.change, 10);
        const item = Cart.get().find((i) => i.id === productId);
        if (item) {
          Cart.updateQuantity(productId, item.quantity + change); // 使用 Cart.updateQuantity
          this.renderCart();
          Cart.updateCountUI();
        }
      } else if (target.classList.contains("cart-item-remove")) {
        if (
          confirm(
            `您確定要從購物車移除「${
              target.closest("tr").querySelector(".cart-item-title").textContent
            }」嗎？`
          )
        ) {
          Cart.remove(productId); // 使用 Cart.remove
          this.renderCart();
          Cart.updateCountUI();
        }
      }
    },

    handleNoteChange(event) {
      const target = event.target;
      if (target.classList.contains("item-notes")) {
        Cart.updateNotes(target.dataset.id, target.value); // 使用 Cart.updateNotes
      }
    },

    handleCopy(event) {
      event.preventDefault();
      navigator.clipboard
        .writeText(this.elements.bankAccountEl.innerText)
        .then(() => {
          const originalText = this.elements.copyBtn.innerText;
          this.elements.copyBtn.innerText = "已複製!";
          setTimeout(() => {
            this.elements.copyBtn.innerText = originalText;
          }, 2000);
        });
    },

    handleConfirmation() {
      const isConfirmed =
        this.elements.confirmationInput.value.trim() === "我了解";
      this.elements.submitBtn.disabled = !isConfirmed;
      this.elements.submitBtn.classList.toggle("disabled", !isConfirmed);
    },

    async handleSubmit(event) {
      event.preventDefault();
      const formData = this.getFormData();
      const validationError = this.validateForm(formData);

      if (validationError) {
        alert(validationError);
        return;
      }

      this.elements.submitBtn.disabled = true;
      this.elements.submitBtn.innerText = "訂單提交中...";

      try {
        const response = await fetch(`${this.config.apiBaseUrl}/api/orders`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData.orderData),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "建立訂單失敗");

        alert(`訂單建立成功！\n您的訂單編號是: ${result.order.orderId}`);
        localStorage.removeItem("shoppingCart");
        window.location.href = "index.html"; // 成功後跳轉回首頁
      } catch (error) {
        console.error("訂單提交錯誤:", error);
        alert(`訂單提交時發生錯誤: ${error.message}`);
        this.elements.submitBtn.disabled = false;
        this.elements.submitBtn.innerText = "確認下單，送出訂單";
      }
    },

    // ---- 輔助函式 ----
    calculateTotals(cart) {
      return cart.reduce(
        (acc, item) => {
          const serviceFee = item.serviceFee || 0;
          acc.subtotal += item.price * item.quantity;
          acc.totalServiceFee += serviceFee * item.quantity;
          acc.finalTotal = acc.subtotal + acc.totalServiceFee;
          return acc;
        },
        { subtotal: 0, totalServiceFee: 0, finalTotal: 0 }
      );
    },

    getFormData() {
      const cart = Cart.get();
      const totals = this.calculateTotals(cart);
      return {
        orderData: {
          paopaohuId: this.elements.paopaohuIdInput.value.trim(),
          email: this.elements.emailInput.value.trim(),
          taxId: this.elements.taxIdInput.value.trim(),
          lastFiveDigits: this.elements.lastFiveInput.value.trim(),
          totalAmount: totals.finalTotal,
          items: cart,
        },
      };
    },

    validateForm(data) {
      const { paopaohuId, email, lastFiveDigits, items } = data.orderData;
      if (!paopaohuId || !lastFiveDigits || !email) {
        return "請務必填寫所有星號 * 必填欄位！";
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return "請輸入有效的 E-mail 格式！";
      }
      if (items.length === 0) {
        return "您的購物車是空的，無法建立訂單！";
      }
      return null;
    },
  };

  // ---- 啟動結帳頁面應用程式 ----
  CheckoutApp.init();
});
