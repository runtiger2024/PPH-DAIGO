// --- js/admin.js (全新優化版) ---

document.addEventListener("DOMContentLoaded", () => {
  const AdminApp = {
    // ---- 設定 ----
    config: {
      apiBaseUrl: "",
      token: localStorage.getItem("authToken"),
      authHeaders: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("authToken")}`,
      },
    },

    // ---- 狀態 ----
    state: {
      sortableInstance: null,
      availableCategories: [],
    },

    // ---- DOM 元素快取 ----
    elements: {
      productListBody: document.getElementById("product-list-body"),
      saveSortBtn: document.getElementById("save-sort-btn"),
      // 新增表單
      addProductForm: document.getElementById("add-product-form"),
      addCategorySelect: document.getElementById("add-category"),
      // 編輯 Modal
      editModal: document.getElementById("edit-modal"),
      editForm: document.getElementById("edit-product-form"),
      closeModalBtn: document.querySelector(".modal-close-btn"),
      editProductId: document.getElementById("edit-product-id"),
      editCategorySelect: document.getElementById("edit-category"),
    },

    // ---- 初始化 ----
    init() {
      if (!this.config.token) {
        window.location.href = "login.html";
        return;
      }
      this.bindEvents();
      this.initializePage();
    },

    // ---- 事件綁定 ----
    bindEvents() {
      this.elements.saveSortBtn.addEventListener(
        "click",
        this.handleSaveSort.bind(this)
      );
      this.elements.addProductForm.addEventListener(
        "submit",
        this.handleAddProduct.bind(this)
      );
      this.elements.productListBody.addEventListener(
        "click",
        this.handleProductActions.bind(this)
      );
      this.elements.editForm.addEventListener(
        "submit",
        this.handleEditProduct.bind(this)
      );
      this.elements.closeModalBtn.addEventListener(
        "click",
        this.closeEditModal.bind(this)
      );
      window.addEventListener("click", (event) => {
        if (event.target == this.elements.editModal) this.closeEditModal();
      });
    },

    // ---- 核心功能 ----
    async initializePage() {
      await this.fetchAndPopulateCategories();
      await this.fetchAndRenderProducts();
    },

    async fetchAndPopulateCategories() {
      try {
        const response = await fetch(
          `${this.config.apiBaseUrl}/api/categories`
        );
        if (!response.ok) throw new Error("無法獲取分類");
        this.state.availableCategories = await response.json();

        this.populateCategorySelect(this.elements.addCategorySelect);
        this.populateCategorySelect(this.elements.editCategorySelect);
      } catch (error) {
        console.error(error);
        this.elements.addCategorySelect.innerHTML =
          '<option value="">無法載入分類</option>';
      }
    },

    populateCategorySelect(selectElement) {
      selectElement.innerHTML =
        '<option value="" disabled selected>請選擇分類</option>';
      this.state.availableCategories.forEach((cat) => {
        selectElement.innerHTML += `<option value="${cat.name}">${cat.name}</option>`;
      });
    },

    async fetchAndRenderProducts() {
      try {
        const response = await fetch(`${this.config.apiBaseUrl}/api/products`);
        if (!response.ok) throw new Error("無法獲取商品列表");
        const products = await response.json();

        // 新增判斷 imageUrl 是否為影片的函式
        const isVideo = (url) => {
          return (
            url &&
            (url.includes("tiktok.com") ||
              url.includes("youtube.com") ||
              url.includes(".mp4") ||
              url.includes(".mov"))
          );
        };

        this.elements.productListBody.innerHTML = products
          .map(
            (product) => `
                        <tr data-id="${product.id}">
                            <td data-label="預覽">${
                              isVideo(product.imageUrl)
                                ? `<video src="${product.imageUrl}" controls muted style="width: 100px; height: 100px;"></video>`
                                : `<img src="${product.imageUrl}" alt="${product.title}" style="width: 100px; height: 100px; object-fit: cover;">`
                            }</td>
                            <td data-label="分類">${product.category}</td>
                            <td data-label="名稱">${product.title}</td>
                            <td data-label="最終售價">$${product.price}</td>
                            <td data-label="庫存">${product.stock ?? "N/A"}</td>
                            <td data-label="狀態"><span class="status-${
                              product.status
                            }">${
              product.status === "published" ? "上架中" : "草稿"
            }</span></td>
                            <td data-label="操作">
                                <button class="btn-small btn-secondary btn-edit" data-id="${
                                  product.id
                                }">編輯</button>
                                <button class="btn-small btn-danger btn-delete" data-id="${
                                  product.id
                                }">刪除</button>
                            </td>
                        </tr>
                    `
          )
          .join("");

        this.initializeSortable();
      } catch (error) {
        console.error("錯誤:", error);
        this.elements.productListBody.innerHTML = `<tr><td colspan="6">載入失敗...</td></tr>`;
      }
    },

    initializeSortable() {
      if (this.state.sortableInstance) {
        this.state.sortableInstance.destroy();
      }
      this.state.sortableInstance = new Sortable(
        this.elements.productListBody,
        {
          animation: 150,
          ghostClass: "sortable-ghost",
          onEnd: () => {
            this.elements.saveSortBtn.style.display = "inline-block";
          },
        }
      );
    },

    async handleAddProduct(event) {
      event.preventDefault();
      const form = event.target;
      const submitButton = form.querySelector('button[type="submit"]');

      const newProduct = {
        category: document.getElementById("add-category").value,
        title: document.getElementById("add-title").value,
        price: parseInt(document.getElementById("add-price").value, 10),
        serviceFee: parseInt(
          document.getElementById("add-serviceFee").value,
          10
        ),
        imageUrl: document.getElementById("add-imageUrl").value,
        // 新增欄位
        longDescription: document.getElementById("add-longDescription").value,
        stock: parseInt(document.getElementById("add-stock").value, 10),
        status: document.getElementById("add-status").value,
        tags: document
          .getElementById("add-tags")
          .value.split(/[,，\s]+/)
          .filter(Boolean), // 用逗號或空白分隔並過濾空字串
      };

      submitButton.disabled = true;
      submitButton.innerText = "新增中...";

      try {
        const response = await fetch(`${this.config.apiBaseUrl}/api/products`, {
          method: "POST",
          headers: this.config.authHeaders,
          body: JSON.stringify(newProduct),
        });
        if (!response.ok) throw new Error("新增商品失敗");
        alert("商品新增成功！");
        form.reset();
        this.fetchAndRenderProducts();
      } catch (error) {
        console.error("錯誤:", error);
        alert("新增商品時發生錯誤。");
      } finally {
        submitButton.disabled = false;
        submitButton.innerText = "確認新增";
      }
    },

    handleProductActions(event) {
      const target = event.target;
      const productId = target.dataset.id;
      if (target.classList.contains("btn-delete"))
        this.deleteProduct(productId);
      if (target.classList.contains("btn-edit")) this.openEditModal(productId);
    },

    async deleteProduct(productId) {
      if (!confirm(`您確定要刪除 ID 為 ${productId} 的商品嗎？`)) return;
      try {
        const response = await fetch(
          `${this.config.apiBaseUrl}/api/products/${productId}`,
          {
            method: "DELETE",
            headers: this.config.authHeaders,
          }
        );
        if (!response.ok) throw new Error("刪除商品失敗");
        alert("商品刪除成功");
        this.fetchAndRenderProducts();
      } catch (error) {
        console.error("錯誤:", error);
        alert("刪除商品時發生錯誤。");
      }
    },

    async openEditModal(productId) {
      try {
        const response = await fetch(
          `${this.config.apiBaseUrl}/api/products/${productId}`
        );
        if (!response.ok) throw new Error("無法獲取商品資料");
        const product = await response.json();

        // 填充表單
        this.elements.editProductId.value = product.id;
        document.getElementById("edit-category").value = product.category;
        document.getElementById("edit-title").value = product.title;
        document.getElementById("edit-price").value = product.price;
        document.getElementById("edit-serviceFee").value =
          product.serviceFee || 0;
        document.getElementById("edit-imageUrl").value = product.imageUrl;
        // 填充新增欄位
        document.getElementById("edit-longDescription").value =
          product.longDescription || "";
        document.getElementById("edit-stock").value = product.stock || 0;
        document.getElementById("edit-status").value =
          product.status || "published";
        document.getElementById("edit-tags").value = (product.tags || []).join(
          ", "
        );

        this.elements.editModal.style.display = "block";
      } catch (error) {
        console.error("錯誤:", error);
        alert("無法載入商品資料進行編輯。");
      }
    },

    closeEditModal() {
      this.elements.editModal.style.display = "none";
    },

    async handleEditProduct(event) {
      event.preventDefault();
      const form = event.target;
      const submitButton = form.querySelector('button[type="submit"]');
      const productId = this.elements.editProductId.value;

      const updatedProduct = {
        category: document.getElementById("edit-category").value,
        title: document.getElementById("edit-title").value,
        price: parseInt(document.getElementById("edit-price").value, 10),
        serviceFee: parseInt(
          document.getElementById("edit-serviceFee").value,
          10
        ),
        imageUrl: document.getElementById("edit-imageUrl").value,
        // 新增欄位
        longDescription: document.getElementById("edit-longDescription").value,
        stock: parseInt(document.getElementById("edit-stock").value, 10),
        status: document.getElementById("edit-status").value,
        tags: document
          .getElementById("edit-tags")
          .value.split(/[,，\s]+/)
          .filter(Boolean),
      };

      submitButton.disabled = true;
      submitButton.innerText = "儲存中...";

      try {
        const response = await fetch(
          `${this.config.apiBaseUrl}/api/products/${productId}`,
          {
            method: "PUT",
            headers: this.config.authHeaders,
            body: JSON.stringify(updatedProduct),
          }
        );
        if (!response.ok) throw new Error("更新商品失敗");
        alert("商品更新成功！");
        this.closeEditModal();
        this.fetchAndRenderProducts();
      } catch (error) {
        console.error("錯誤:", error);
        alert("更新商品時發生錯誤。");
      } finally {
        submitButton.disabled = false;
        submitButton.innerText = "儲存變更";
      }
    },

    async handleSaveSort() {
      const orderedIds = this.state.sortableInstance.toArray();
      this.elements.saveSortBtn.disabled = true;
      this.elements.saveSortBtn.innerText = "儲存中...";
      try {
        const response = await fetch(
          `${this.config.apiBaseUrl}/api/products/order`,
          {
            method: "PATCH",
            headers: this.config.authHeaders,
            body: JSON.stringify({ orderedIds }),
          }
        );
        if (!response.ok) throw new Error("儲存排序失敗");
        alert("商品排序已成功儲存！");
        this.elements.saveSortBtn.style.display = "none";
      } catch (error) {
        console.error("錯誤:", error);
        alert("儲存排序時發生錯誤。");
      } finally {
        this.elements.saveSortBtn.disabled = false;
        this.elements.saveSortBtn.innerText = "儲存排序";
      }
    },
  };

  AdminApp.init();
});
