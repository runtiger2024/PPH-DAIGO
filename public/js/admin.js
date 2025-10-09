// --- js/admin.js (完整修正版) ---

document.addEventListener("DOMContentLoaded", () => {
  const AdminApp = {
    // ---- 設定 ----
    config: {
      apiBaseUrl: window.location.origin, // 修正：設定正確的基礎路徑
      token: localStorage.getItem("authToken"),
      get authHeaders() {
        // 修正：使用 getter 確保 token 最新
        return {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        };
      },
    },

    // ---- 狀態 ----
    state: {
      sortableInstance: null,
      availableCategories: [],
    },

    // ---- DOM 元素快取 ----
    elements: {}, // 修正：初始為空物件

    // ---- 初始化 ----
    init() {
      console.log("AdminApp 初始化開始...");

      // 檢查必要的庫
      if (!this.checkDependencies()) {
        return;
      }

      // 檢查認證
      if (!this.config.token) {
        console.warn("未找到認證 token，重定向到登入頁面");
        window.location.href = "login.html";
        return;
      }

      // 安全地初始化 DOM 元素
      if (!this.initializeElements()) {
        console.error("無法初始化必要的 DOM 元素");
        this.showError("頁面載入失敗，請重新整理頁面");
        return;
      }

      // 綁定事件
      this.bindEvents();

      // 初始化頁面
      this.initializePage().catch((error) => {
        console.error("頁面初始化失敗:", error);
        this.showError("系統初始化失敗: " + error.message);
      });
    },

    // ---- 新增：檢查依賴 ----
    checkDependencies() {
      const dependencies = [
        { name: "Sortable", error: "Sortable.js 庫未載入" },
      ];

      for (const dep of dependencies) {
        if (typeof window[dep.name] === "undefined") {
          console.error(dep.error);
          alert(`系統缺少必要的組件 (${dep.name})，請聯繫管理員`);
          return false;
        }
      }
      return true;
    },

    // ---- 新增：安全初始化 DOM 元素 ----
    initializeElements() {
      try {
        this.elements = {
          productListBody: document.getElementById("product-list-body"),
          saveSortBtn: document.getElementById("save-sort-btn"),
          addProductForm: document.getElementById("add-product-form"),
          addCategorySelect: document.getElementById("add-category"),
          editModal: document.getElementById("edit-modal"),
          editForm: document.getElementById("edit-product-form"),
          closeModalBtn: document.querySelector(".modal-close-btn"),
          editProductId: document.getElementById("edit-product-id"),
          editCategorySelect: document.getElementById("edit-category"),
        };

        // 檢查關鍵元素是否存在
        const criticalElements = ["productListBody"];
        for (const elementName of criticalElements) {
          if (!this.elements[elementName]) {
            console.error(`關鍵元素不存在: ${elementName}`);
            return false;
          }
        }

        return true;
      } catch (error) {
        console.error("初始化 DOM 元素時發生錯誤:", error);
        return false;
      }
    },

    // ---- 事件綁定（加入安全檢查） ----
    bindEvents() {
      // 安全綁定每個事件
      if (this.elements.saveSortBtn) {
        this.elements.saveSortBtn.addEventListener(
          "click",
          this.handleSaveSort.bind(this)
        );
      }

      if (this.elements.addProductForm) {
        this.elements.addProductForm.addEventListener(
          "submit",
          this.handleAddProduct.bind(this)
        );
      }

      if (this.elements.productListBody) {
        this.elements.productListBody.addEventListener(
          "click",
          this.handleProductActions.bind(this)
        );
      }

      if (this.elements.editForm) {
        this.elements.editForm.addEventListener(
          "submit",
          this.handleEditProduct.bind(this)
        );
      }

      if (this.elements.closeModalBtn) {
        this.elements.closeModalBtn.addEventListener(
          "click",
          this.closeEditModal.bind(this)
        );
      }

      // 全域事件
      window.addEventListener("click", (event) => {
        if (
          this.elements.editModal &&
          event.target == this.elements.editModal
        ) {
          this.closeEditModal();
        }
      });

      // 新增：全域錯誤處理
      window.addEventListener("error", (event) => {
        console.error("全域錯誤:", event.error);
      });
    },

    // ---- 核心功能 ----
    async initializePage() {
      try {
        await this.fetchAndPopulateCategories();
        await this.fetchAndRenderProducts();
      } catch (error) {
        console.error("初始化頁面時發生錯誤:", error);
        throw error;
      }
    },

    async fetchAndPopulateCategories() {
      try {
        const url = `${this.config.apiBaseUrl}/api/categories.php`; // 修正：加上 .php
        console.log("正在獲取分類:", url);

        const response = await fetch(url, {
          headers: this.config.authHeaders,
        });

        if (!response.ok) {
          throw new Error(`無法獲取分類 (${response.status})`);
        }

        const data = await response.json();
        this.state.availableCategories = data;

        // 安全地填充選擇框
        if (this.elements.addCategorySelect) {
          this.populateCategorySelect(this.elements.addCategorySelect);
        }
        if (this.elements.editCategorySelect) {
          this.populateCategorySelect(this.elements.editCategorySelect);
        }
      } catch (error) {
        console.error("獲取分類失敗:", error);
        // 不中斷流程，使用預設分類
        this.state.availableCategories = [
          { name: "枕頭", id: 1 },
          { name: "床墊", id: 2 },
        ];
        console.warn("使用預設分類");

        if (this.elements.addCategorySelect) {
          this.populateCategorySelect(this.elements.addCategorySelect);
        }
        if (this.elements.editCategorySelect) {
          this.populateCategorySelect(this.elements.editCategorySelect);
        }
      }
    },

    populateCategorySelect(selectElement) {
      if (!selectElement) return;

      selectElement.innerHTML =
        '<option value="" disabled selected>請選擇分類</option>';
      this.state.availableCategories.forEach((cat) => {
        const option = document.createElement("option");
        option.value = cat.name;
        option.textContent = cat.name;
        selectElement.appendChild(option);
      });
    },

    async fetchAndRenderProducts() {
      try {
        const url = `${this.config.apiBaseUrl}/api/admin/products.php`; // 修正：加上 .php
        console.log("正在獲取產品列表:", url);

        const response = await fetch(url, {
          headers: this.config.authHeaders,
        });

        if (response.status === 401) {
          throw new Error("授權失敗，請重新登入。");
        }

        if (response.status === 404) {
          throw new Error(`找不到 API 端點: ${url}`);
        }

        if (!response.ok) {
          throw new Error(`無法獲取商品列表 (${response.status})`);
        }

        const products = await response.json();
        console.log(`成功獲取 ${products.length} 個產品`);

        if (!this.elements.productListBody) {
          throw new Error("產品列表容器不存在");
        }

        if (products.length === 0) {
          this.elements.productListBody.innerHTML =
            '<tr><td colspan="6" style="text-align: center;">尚無商品資料</td></tr>';
        } else {
          this.elements.productListBody.innerHTML = products
            .map((product) => this.renderProductRow(product))
            .join("");

          this.initializeSortable();
        }
      } catch (error) {
        console.error("獲取產品列表錯誤:", error);
        this.showProductError(error.message);
      }
    },

    // 新增：渲染產品行
    renderProductRow(product) {
      // 安全處理可能為 null 的值
      const category = this.escapeHtml(product.category || "未分類");
      const title = this.escapeHtml(product.title || "無標題");
      const price = product.price || 0;
      const stock = product.stock ?? "N/A";
      const status = product.status || "draft";
      const statusText = status === "published" ? "上架中" : "草稿";

      return `
        <tr data-id="${product.id}">
          <td data-label="分類">${category}</td>
          <td data-label="名稱">${title}</td>
          <td data-label="最終售價">$${price}</td>
          <td data-label="庫存">${stock}</td>
          <td data-label="狀態">
            <span class="status-${status}">${statusText}</span>
          </td>
          <td data-label="操作">
            <button class="btn-small btn-secondary btn-edit" data-id="${product.id}">編輯</button>
            <button class="btn-small btn-danger btn-delete" data-id="${product.id}">刪除</button>
          </td>
        </tr>
      `;
    },

    // 新增：HTML 轉義函數
    escapeHtml(text) {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    },

    // 新增：顯示產品錯誤
    showProductError(message) {
      if (this.elements.productListBody) {
        this.elements.productListBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: red;">${this.escapeHtml(
          message
        )}</td></tr>`;
      }
    },

    // 新增：顯示錯誤訊息
    showError(message) {
      console.error(message);
      alert(message);
    },

    initializeSortable() {
      if (!window.Sortable) {
        console.warn("Sortable.js 未載入，拖拽排序功能將不可用");
        return;
      }

      if (this.state.sortableInstance) {
        this.state.sortableInstance.destroy();
      }

      if (!this.elements.productListBody) {
        console.warn("產品列表容器不存在，無法初始化排序功能");
        return;
      }

      try {
        this.state.sortableInstance = new Sortable(
          this.elements.productListBody,
          {
            animation: 150,
            ghostClass: "sortable-ghost",
            onEnd: () => {
              if (this.elements.saveSortBtn) {
                this.elements.saveSortBtn.style.display = "inline-block";
              }
            },
          }
        );
        console.log("排序功能初始化成功");
      } catch (error) {
        console.error("初始化排序功能失敗:", error);
      }
    },

    async handleAddProduct(event) {
      event.preventDefault();
      const form = event.target;
      const submitButton = form.querySelector('button[type="submit"]');

      try {
        // 安全地獲取表單值
        const imageUrls = [];
        for (let i = 1; i <= 5; i++) {
          const input = document.getElementById(`add-imageUrl${i}`);
          if (input && input.value) {
            imageUrls.push(input.value);
          }
        }

        const newProduct = {
          category: this.getElementValue("add-category", ""),
          title: this.getElementValue("add-title", ""),
          price: parseInt(this.getElementValue("add-price", "0"), 10) || 0,
          serviceFee:
            parseInt(this.getElementValue("add-serviceFee", "0"), 10) || 0,
          imageUrls: imageUrls,
          longDescription: this.getElementValue("add-longDescription", ""),
          stock: parseInt(this.getElementValue("add-stock", "0"), 10) || 0,
          status: this.getElementValue("add-status", "draft"),
          tags: this.getElementValue("add-tags", "")
            .split(/[,，\s]+/)
            .filter(Boolean),
        };

        if (!newProduct.category || !newProduct.title) {
          throw new Error("請填寫必要欄位（分類和標題）");
        }

        if (submitButton) {
          submitButton.disabled = true;
          submitButton.textContent = "新增中...";
        }

        const url = `${this.config.apiBaseUrl}/api/products.php`; // 修正：加上 .php
        const response = await fetch(url, {
          method: "POST",
          headers: this.config.authHeaders,
          body: JSON.stringify(newProduct),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message || `伺服器錯誤 (${response.status})`
          );
        }

        alert("商品新增成功！");
        form.reset();
        await this.fetchAndRenderProducts();
      } catch (error) {
        console.error("新增商品錯誤:", error);
        alert(`新增商品時發生錯誤：${error.message}`);
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = "確認新增";
        }
      }
    },

    // 新增：安全獲取元素值
    getElementValue(elementId, defaultValue = "") {
      const element = document.getElementById(elementId);
      return element ? element.value : defaultValue;
    },

    handleProductActions(event) {
      const target = event.target;
      if (!target.dataset.id) return;

      const productId = target.dataset.id;

      if (target.classList.contains("btn-delete")) {
        this.deleteProduct(productId);
      } else if (target.classList.contains("btn-edit")) {
        this.openEditModal(productId);
      }
    },

    async deleteProduct(productId) {
      if (!productId) {
        console.error("產品 ID 無效");
        return;
      }

      if (!confirm(`您確定要刪除 ID 為 ${productId} 的商品嗎？`)) {
        return;
      }

      try {
        const url = `${this.config.apiBaseUrl}/api/products.php?id=${productId}`; // 修正：使用查詢參數
        const response = await fetch(url, {
          method: "DELETE",
          headers: this.config.authHeaders,
        });

        if (!response.ok) {
          throw new Error(`刪除商品失敗 (${response.status})`);
        }

        alert("商品刪除成功");
        await this.fetchAndRenderProducts();
      } catch (error) {
        console.error("刪除商品錯誤:", error);
        alert(`刪除商品時發生錯誤: ${error.message}`);
      }
    },

    async openEditModal(productId) {
      if (!productId) {
        console.error("產品 ID 無效");
        return;
      }

      try {
        const url = `${this.config.apiBaseUrl}/api/products.php?id=${productId}`; // 修正：使用查詢參數
        const response = await fetch(url, {
          headers: this.config.authHeaders,
        });

        if (!response.ok) {
          throw new Error(`無法獲取商品資料 (${response.status})`);
        }

        const product = await response.json();

        // 安全地設定表單值
        this.setElementValue("edit-product-id", product.id);
        this.setElementValue("edit-category", product.category);
        this.setElementValue("edit-title", product.title);
        this.setElementValue("edit-price", product.price);
        this.setElementValue("edit-serviceFee", product.serviceFee || 0);

        // 設定圖片 URL
        for (let i = 1; i <= 5; i++) {
          this.setElementValue(
            `edit-imageUrl${i}`,
            product.imageUrls?.[i - 1] || ""
          );
        }

        this.setElementValue(
          "edit-longDescription",
          product.longDescription || ""
        );
        this.setElementValue("edit-stock", product.stock || 0);
        this.setElementValue("edit-status", product.status || "published");
        this.setElementValue("edit-tags", (product.tags || []).join(", "));

        // 顯示模態框
        if (this.elements.editModal) {
          this.elements.editModal.style.display = "block";
        }
      } catch (error) {
        console.error("開啟編輯模態框錯誤:", error);
        alert(`無法載入商品資料進行編輯: ${error.message}`);
      }
    },

    // 新增：安全設定元素值
    setElementValue(elementId, value) {
      const element = document.getElementById(elementId);
      if (element) {
        element.value = value;
      }
    },

    closeEditModal() {
      if (this.elements.editModal) {
        this.elements.editModal.style.display = "none";
      }
    },

    async handleEditProduct(event) {
      event.preventDefault();
      const form = event.target;
      const submitButton = form.querySelector('button[type="submit"]');

      const productId = this.getElementValue("edit-product-id");
      if (!productId) {
        alert("無效的產品 ID");
        return;
      }

      try {
        // 安全地獲取表單值
        const imageUrls = [];
        for (let i = 1; i <= 5; i++) {
          const value = this.getElementValue(`edit-imageUrl${i}`, "");
          if (value) imageUrls.push(value);
        }

        const updatedProduct = {
          id: productId,
          category: this.getElementValue("edit-category", ""),
          title: this.getElementValue("edit-title", ""),
          price: parseInt(this.getElementValue("edit-price", "0"), 10) || 0,
          serviceFee:
            parseInt(this.getElementValue("edit-serviceFee", "0"), 10) || 0,
          imageUrls: imageUrls,
          longDescription: this.getElementValue("edit-longDescription", ""),
          stock: parseInt(this.getElementValue("edit-stock", "0"), 10) || 0,
          status: this.getElementValue("edit-status", "published"),
          tags: this.getElementValue("edit-tags", "")
            .split(/[,，\s]+/)
            .filter(Boolean),
        };

        if (!updatedProduct.category || !updatedProduct.title) {
          throw new Error("請填寫必要欄位（分類和標題）");
        }

        if (submitButton) {
          submitButton.disabled = true;
          submitButton.textContent = "儲存中...";
        }

        const url = `${this.config.apiBaseUrl}/api/products.php`; // 修正：統一使用 products.php
        const response = await fetch(url, {
          method: "PUT",
          headers: this.config.authHeaders,
          body: JSON.stringify(updatedProduct),
        });

        if (!response.ok) {
          throw new Error(`更新商品失敗 (${response.status})`);
        }

        alert("商品更新成功！");
        this.closeEditModal();
        await this.fetchAndRenderProducts();
      } catch (error) {
        console.error("更新商品錯誤:", error);
        alert(`更新商品時發生錯誤: ${error.message}`);
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = "儲存變更";
        }
      }
    },

    async handleSaveSort() {
      if (!this.state.sortableInstance) {
        console.error("排序實例不存在");
        return;
      }

      const orderedIds = this.state.sortableInstance.toArray();
      if (orderedIds.length === 0) {
        console.warn("沒有要排序的項目");
        return;
      }

      if (this.elements.saveSortBtn) {
        this.elements.saveSortBtn.disabled = true;
        this.elements.saveSortBtn.textContent = "儲存中...";
      }

      try {
        const url = `${this.config.apiBaseUrl}/api/products/order.php`; // 修正：加上 .php
        const response = await fetch(url, {
          method: "PATCH",
          headers: this.config.authHeaders,
          body: JSON.stringify({ orderedIds }),
        });

        if (!response.ok) {
          throw new Error(`儲存排序失敗 (${response.status})`);
        }

        alert("商品排序已成功儲存！");
        if (this.elements.saveSortBtn) {
          this.elements.saveSortBtn.style.display = "none";
        }
      } catch (error) {
        console.error("儲存排序錯誤:", error);
        alert(`儲存排序時發生錯誤: ${error.message}`);
      } finally {
        if (this.elements.saveSortBtn) {
          this.elements.saveSortBtn.disabled = false;
          this.elements.saveSortBtn.textContent = "儲存排序";
        }
      }
    },
  };

  // 啟動應用
  try {
    AdminApp.init();
  } catch (error) {
    console.error("AdminApp 初始化失敗:", error);
    alert("系統初始化失敗，請重新整理頁面或聯繫管理員");
  }
});
