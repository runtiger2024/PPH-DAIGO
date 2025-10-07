// --- js/cart.js (Class-based UI 優化版) ---

const Cart = {
  // 從 localStorage 獲取購物車資料
  get() {
    const cartJson = localStorage.getItem("shoppingCart");
    // 增加一個錯誤處理，如果 localStorage 的資料格式不對，就回傳空陣列
    try {
      return cartJson ? JSON.parse(cartJson) : [];
    } catch (e) {
      console.error("解析購物車資料失敗:", e);
      return [];
    }
  },

  // 將購物車資料儲存到 localStorage
  save(cart) {
    localStorage.setItem("shoppingCart", JSON.stringify(cart));
  },

  /**
   * 加入商品到購物車
   * @param {object} itemToAdd - 要加入的商品物件，必須包含 id, title, price, serviceFee
   */
  add(itemToAdd) {
    const cart = this.get();
    const existingItem = cart.find((item) => item.id === itemToAdd.id);

    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.push({
        id: itemToAdd.id,
        title: itemToAdd.title,
        price: itemToAdd.price,
        serviceFee: itemToAdd.serviceFee || 0,
        quantity: 1,
        notes: "", // 預設空的備註欄位
      });
    }
    this.save(cart);
  },

  /**
   * 更新購物車中商品的數量
   * @param {string} productId - 商品 ID
   * @param {number} newQuantity - 新的商品數量
   */
  updateQuantity(productId, newQuantity) {
    let cart = this.get();
    const item = cart.find((item) => item.id === productId);

    if (item) {
      if (newQuantity > 0) {
        item.quantity = newQuantity;
        this.save(cart);
      } else {
        // 如果數量小於等於0，則移除該商品
        this.remove(productId);
      }
    }
  },

  /**
   * 更新購物車中商品的備註
   * @param {string} productId - 商品 ID
   * @param {string} notes - 新的備註內容
   */
  updateNotes(productId, notes) {
    const cart = this.get();
    const item = cart.find((item) => item.id === productId);
    if (item) {
      item.notes = notes;
      this.save(cart);
    }
  },

  /**
   * 從購物車移除商品
   * @param {string} productId - 商品 ID
   */
  remove(productId) {
    let cart = this.get();
    cart = cart.filter((item) => item.id !== productId);
    this.save(cart);
  },

  /**
   * 更新頁面上顯示購物車數量的 UI 元素
   */
  updateCountUI() {
    const cartCountEl = document.getElementById("cart-count");
    if (cartCountEl) {
      const cart = this.get();
      const totalQuantity = cart.reduce(
        (total, item) => total + item.quantity,
        0
      );
      cartCountEl.textContent = totalQuantity;

      // ================================================================
      // --- 核心優化點 ---
      // 舊寫法: cartCountEl.style.display = totalQuantity > 0 ? 'block' : 'none';
      // 新寫法: 使用 classList.toggle 來控制 '.is-hidden' class。
      // 當 totalQuantity <= 0 為 true 時，新增 .is-hidden class，反之則移除。
      // 這讓 JS 只負責邏輯，外觀完全交給 CSS。
      // ================================================================
      cartCountEl.classList.toggle("is-hidden", totalQuantity <= 0);
    }
  },
};
