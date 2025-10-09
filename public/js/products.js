// --- js/products.js (最終修正完整版) ---

document.addEventListener("DOMContentLoaded", () => {
  const App = {
    // ================================================================
    // --- 應用程式設定與狀態管理 ---
    // ================================================================
    config: {
      apiBaseUrl: "", // 您的 API 基礎路徑
    },
    state: {
      allProducts: [],
      currentFilter: "all",
    },

    // ================================================================
    // --- DOM 元素集中管理 ---
    // ================================================================
    elements: {
      mainContentView: document.getElementById("main-content-view"),
      productGrid: document.querySelector(".product-grid"),
      categoryFilters: document.getElementById("category-filters"),
      productDetailContainer: document.getElementById(
        "product-detail-container"
      ),
    },

    // ================================================================
    // --- 核心方法 (初始化、事件、資料處理) ---
    // ================================================================
    async init() {
      this.showLoading();
      this.bindEvents();

      try {
        await this.fetchProducts();
        this.renderCategoryFilters();
        this.handleRouting();
      } catch (error) {
        console.error("初始化失敗:", error);
        this.showError(error.message);
      }
    },

    bindEvents() {
      // 使用事件代理，將監聽器綁定在 body 上，提高效能
      document.body.addEventListener(
        "click",
        this.handleGlobalClick.bind(this)
      );
      // 監聽瀏覽器的前進/後退事件
      window.addEventListener("popstate", this.handleRouting.bind(this));
    },

    async fetchProducts() {
      const apiUrl = `${this.config.apiBaseUrl || ""}/api/products`;
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error("無法從伺服器獲取商品列表，請稍後再試。");
      }
      this.state.allProducts = await response.json();
    },

    isTikTokVideo(imageUrls) {
      if (!Array.isArray(imageUrls) || imageUrls.length === 0) return false;
      const url = imageUrls[0];
      return url && url.includes("tiktok.com");
    },

    getTikTokEmbedUrl(imageUrls) {
      if (!Array.isArray(imageUrls) || imageUrls.length === 0) return "";
      try {
        const urlObj = new URL(imageUrls[0]);
        const videoId = urlObj.pathname.split("/").pop();
        if (!videoId) return "";
        return `https://www.tiktok.com/embed/v2/${videoId}`;
      } catch (e) {
        console.error("無效的 TikTok 影片網址:", imageUrls[0]);
        return "";
      }
    },

    // ================================================================
    // --- 渲染與畫面控制方法 ---
    // ================================================================
    renderProductList(productsToRender) {
      this.elements.productGrid.innerHTML = "";

      if (!productsToRender || productsToRender.length === 0) {
        this.elements.productGrid.innerHTML = "<p>這個分類下沒有商品。</p>";
        return;
      }

      const productHtml = productsToRender
        .map((product) => {
          const serviceFee = product.serviceFee || 0;
          const isVideo = this.isTikTokVideo(product.imageUrls);
          const firstImageUrl =
            (product.imageUrls && product.imageUrls[0]) || "";

          return `
            <a href="?product_id=${product.id}" class="product-card" data-id="${
            product.id
          }">
              <div class="product-media-container">
                ${
                  isVideo
                    ? `<iframe src="${this.getTikTokEmbedUrl(
                        product.imageUrls
                      )}" frameborder="0" allowfullscreen scrolling="no" allow="encrypted-media;"></iframe>`
                    : `<img src="${firstImageUrl}" alt="${product.title}" class="product-image">`
                }
              </div>
              <div class="product-info">
                  <h3 class="product-title">${product.title}</h3>
                  <p class="product-price">$${product.price} TWD</p>
              </div>
            </a>`;
        })
        .join("");

      this.elements.productGrid.innerHTML = productHtml;
    },

    renderCategoryFilters() {
      const categories = [
        "all",
        ...new Set(this.state.allProducts.map((p) => p.category)),
      ];
      this.elements.categoryFilters.innerHTML = categories
        .map(
          (category) =>
            `<button class="filter-btn ${
              category === "all" ? "active" : ""
            }" data-category="${category}">
              ${category === "all" ? "全部" : category}
            </button>`
        )
        .join("");
    },

    renderSingleProduct(product) {
      if (!product) {
        this.elements.productDetailContainer.innerHTML = `
          <div class="product-detail-view">
            <a href="#" class="back-to-list-btn">← 返回商品總覽</a>
            <h2 style="text-align: center; padding: 4rem 0;">抱歉，找不到您要的商品</h2>
          </div>`;
        return;
      }

      const serviceFee = product.serviceFee || 0;
      const allImages = Array.isArray(product.imageUrls)
        ? product.imageUrls
        : [];
      const mainMediaUrl = allImages[0] || "";
      const isVideo = this.isTikTokVideo(allImages);

      const thumbnailsHtml = allImages
        .map(
          (url, index) =>
            `<img src="${url}" alt="商品縮圖 ${
              index + 1
            }" class="product-thumbnail ${
              index === 0 ? "active" : ""
            }" data-src="${url}">`
        )
        .join("");

      this.elements.productDetailContainer.innerHTML = `
        <div class="product-detail-view">
          <div class="product-media-gallery">
            <div class="product-media-container-lg">
              ${
                isVideo
                  ? `<iframe src="${this.getTikTokEmbedUrl(
                      allImages
                    )}" frameborder="0" allowfullscreen class="tiktok-embed-lg"></iframe>`
                  : `<img src="${mainMediaUrl}" alt="${product.title}" class="main-product-image">`
              }
            </div>
            ${
              !isVideo && allImages.length > 1
                ? `<div class="product-thumbnails">${thumbnailsHtml}</div>`
                : ""
            }
          </div>
          <div class="product-detail-info">
            <a href="#" class="back-to-list-btn">← 返回商品總覽</a>
            <h1>${product.title}</h1>
            <p class="description">${
              product.longDescription || "此商品沒有詳細描述。"
            }</p>
            <p class="service-fee-detail">代購服務費: $${serviceFee}</p>
            <div class="price-detail">NT$ ${product.price}</div>
            <div class="product-detail-actions">
              <button class="btn-primary btn-add-to-cart" data-id="${
                product.id
              }">採購同款商品到集運倉</button>
            </div>
          </div>
        </div>
      `;
    },

    // [核心修正] 使用 style.display 直接控制顯示/隱藏
    showView(viewName, productId = null) {
      if (viewName === "detail") {
        this.elements.mainContentView.style.display = "none";
        this.elements.productDetailContainer.style.display = "block";

        const product = this.state.allProducts.find((p) => p.id === productId);
        this.renderSingleProduct(product);
      } else {
        // "list" view
        this.elements.mainContentView.style.display = "block";
        this.elements.productDetailContainer.style.display = "none";

        const productsToShow =
          this.state.currentFilter === "all"
            ? this.state.allProducts
            : this.state.allProducts.filter(
                (p) => p.category === this.state.currentFilter
              );
        this.renderProductList(productsToShow);
      }
    },

    showLoading() {
      this.elements.productGrid.innerHTML =
        '<p class="loading-text">商品載入中，請稍候...</p>';
    },

    showError(message) {
      this.elements.productGrid.innerHTML = `<p class="error-text">${message}</p>`;
    },

    // ================================================================
    // --- 事件處理方法 (路由與點擊) ---
    // ================================================================
    handleRouting() {
      const urlParams = new URLSearchParams(window.location.search);
      const productIdFromUrl = urlParams.get("product_id");

      if (productIdFromUrl) {
        this.showView("detail", productIdFromUrl);
      } else {
        this.showView("list");
      }
      if (typeof Cart !== "undefined") {
        Cart.updateCountUI();
      }
    },

    handleGlobalClick(event) {
      const target = event.target;

      const filterButton = target.closest(".filter-btn");
      if (filterButton) {
        document
          .querySelectorAll(".filter-btn")
          .forEach((btn) => btn.classList.remove("active"));
        filterButton.classList.add("active");
        this.state.currentFilter = filterButton.dataset.category;
        this.showView("list");
        return;
      }

      const backButton = target.closest(".back-to-list-btn");
      if (backButton) {
        event.preventDefault();
        history.pushState({}, "", window.location.pathname.split("?")[0]);
        this.showView("list");
        window.scrollTo(0, 0);
        return;
      }

      const addToCartButton = target.closest(".btn-add-to-cart");
      if (addToCartButton) {
        event.preventDefault();
        event.stopPropagation();
        const productId = addToCartButton.dataset.id;
        const productToAdd = this.state.allProducts.find(
          (p) => p.id === productId
        );
        if (productToAdd && typeof Cart !== "undefined") {
          Cart.add(productToAdd);
          Cart.updateCountUI();
          alert(`「${productToAdd.title}」已加入購物車！`);
        }
        return;
      }

      const thumbnailImage = target.closest(".product-thumbnail");
      if (thumbnailImage) {
        const mainImage = document.querySelector(".main-product-image");
        if (mainImage) {
          mainImage.src = thumbnailImage.dataset.src;
          document
            .querySelectorAll(".product-thumbnail")
            .forEach((thumb) => thumb.classList.remove("active"));
          thumbnailImage.classList.add("active");
        }
        return;
      }

      const productCard = target.closest(".product-card");
      if (productCard && !target.closest("iframe")) {
        event.preventDefault();
        const productId = productCard.dataset.id;
        history.pushState({ productId }, "", `?product_id=${productId}`);
        this.showView("detail", productId);
        window.scrollTo(0, 0);
      }
    },
  };

  App.init();
});
