// --- js/products.js (最終修正完整版) ---

document.addEventListener("DOMContentLoaded", () => {
  const App = {
<<<<<<< HEAD
=======
    // ---- 設定與狀態管理 ----
    config: {
      apiBaseUrl: "",
    },
    state: {
      allProducts: [],
      currentFilter: "all",
    },

    // ---- DOM 元素集中管理 ----
    elements: {
      mainContentView: document.getElementById("main-content-view"),
      productGrid: document.querySelector(".product-grid"),
      categoryFilters: document.getElementById("category-filters"),
      productDetailContainer: document.getElementById(
        "product-detail-container"
      ),
    },

    // ---- 初始化函式 ----
    async init() {
      this.showLoading();
      this.bindEvents();

      try {
        await this.fetchProducts();
        this.renderCategoryFilters();
        this.handleRouting();
      } catch (error) {
        this.showError(error.message);
      }
    },

    // ---- 事件綁定 ----
    bindEvents() {
      document.body.addEventListener(
        "click",
        this.handleGlobalClick.bind(this)
      );
      window.addEventListener("popstate", this.handleRouting.bind(this));
    },

    // ---- 資料處理 ----
    async fetchProducts() {
      const response = await fetch(`${this.config.apiBaseUrl}/api/products`);
      if (!response.ok) {
        throw new Error("無法從伺服器獲取商品列表，請稍後再試。");
      }
      this.state.allProducts = await response.json();
    },

    isTikTokVideo(url) {
      return url && url.includes("tiktok.com");
    },

    getTikTokEmbedUrl(url) {
      try {
        const urlObj = new URL(url);
        const videoId = urlObj.pathname.split("/").pop();
        return `https://www.tiktok.com/embed/v2/${videoId}`;
      } catch (e) {
        console.error("無效的 TikTok 影片網址:", url);
        return "";
      }
    },

    // ---- 渲染與畫面控制 ----
    renderProductList(productsToRender) {
      this.elements.productGrid.innerHTML = "";

      const productHtml = productsToRender
        .map((product) => {
          const serviceFee = product.serviceFee || 0;
          const isVideo = this.isTikTokVideo(product.imageUrl);

          // 這裡的 HTML 結構是關鍵
          return `
            <div class="product-card" data-id="${product.id}">
              <div class="product-media-container">
                ${
                  isVideo
                    ? `
                    <iframe
                      src="${this.getTikTokEmbedUrl(product.imageUrl)}"
                      frameborder="0"
                      allowfullscreen
                      scrolling="no"
                      allow="encrypted-media;">
                    </iframe>
                  `
                    : `<img src="${product.imageUrl}" alt="${product.title}" class="product-image">`
                }
              </div>
              <div class="product-info">
                <div>
                  <span class="product-category">${product.category}</span>
                  <h3 class="product-title">${product.title}</h3>
                </div>
                <div>
                  <p class="product-price">$${product.price} TWD</p>
                  <p class="service-fee">代購服務費: $${serviceFee}</p>
                </div>
              </div>
              <div class="product-actions">
                <button class="btn-primary btn-add-to-cart" data-id="${
                  product.id
                }">採購同款商品到集運倉</button>
              </div>
            </div>`;
        })
        .join("");

      this.elements.productGrid.innerHTML =
        productHtml || "<p>這個分類下沒有商品。</p>";
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
              <h2>抱歉，找不到您要的商品</h2>
              <a href="#" class="back-to-list-btn">← 返回商品總覽</a>
            </div>`;
        return;
      }

      const serviceFee = product.serviceFee || 0;
      const isVideo = this.isTikTokVideo(product.imageUrl);

      this.elements.productDetailContainer.innerHTML = `
        <div class="product-detail-view">
          <a href="#" class="back-to-list-btn">← 返回商品總覽</a>
          <div class="product-media-container-lg">
            ${
              isVideo
                ? `
                <iframe
                  src="${this.getTikTokEmbedUrl(product.imageUrl)}"
                  frameborder="0"
                  allowfullscreen
                  class="tiktok-embed-lg"
                ></iframe>
              `
                : `<img src="${product.imageUrl}" alt="${product.title}">`
            }
          </div>
          <div class="product-detail-info">
            <h1>${product.title}</h1>
            <p class="description">
              ${product.longDescription || "此商品沒有詳細描述。"}
            </p>
            <p class="service-fee-detail">代購服務費: $${serviceFee}</p>
            <div class="price-detail">NT$ ${product.price}</div>
            <div class="product-detail-actions">
              <button class="btn-primary btn-add-to-cart" data-id="${
                product.id
              }">採購同款商品到集運倉</button>
              <button class="btn-secondary btn-share" data-id="${
                product.id
              }">分享商品</button>
            </div>
          </div>
        </div>
      `;
    },

    showView(viewName, productId = null) {
      if (viewName === "detail") {
        this.elements.mainContentView.style.display = "none";
        this.elements.productDetailContainer.style.display = "block";
        const product = this.state.allProducts.find((p) => p.id === productId);
        this.renderSingleProduct(product);
      } else {
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

    async handleGlobalClick(event) {
      const target = event.target;
      const productCard = target.closest(".product-card");
      const filterButton = target.closest(".filter-btn");
      const backButton = target.closest(".back-to-list-btn");

      // 處理「加入購物車」按鈕點擊
      if (target.classList.contains("btn-add-to-cart")) {
        event.preventDefault();
        event.stopPropagation();
        const productId = target.dataset.id;
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

      // 處理「分享商品」按鈕點擊
      if (target.classList.contains("btn-share")) {
        event.preventDefault();
        const productId = target.dataset.id;
        const productToShare = this.state.allProducts.find(
          (p) => p.id === productId
        );

        if (productToShare) {
          const shareUrl = `${window.location.origin}${window.location.pathname}?product_id=${productId}`;
          const shareData = {
            title: `分享商品：${productToShare.title}`,
            text: `我在「代採購大平台」發現一個好東西，分享給你：${productToShare.title}`,
            url: shareUrl,
          };

          if (navigator.share) {
            try {
              await navigator.share(shareData);
            } catch (err) {
              console.log("使用者取消了分享。");
            }
          } else {
            navigator.clipboard
              .writeText(shareData.url)
              .then(() => {
                target.innerText = "連結已複製!";
                setTimeout(() => {
                  target.innerText = "分享商品";
                }, 2000);
              })
              .catch((err) => {
                console.error("複製失敗: ", err);
                alert("抱歉，複製連結失敗。");
              });
          }
        }
        return;
      }

      // 處理商品卡片點擊 (進入詳細頁)
      if (
        productCard &&
        !target.closest(".product-actions") &&
        !target.closest("iframe")
      ) {
        event.preventDefault();
        const productId = productCard.dataset.id;
        history.pushState({ productId }, "", `?product_id=${productId}`);
        this.showView("detail", productId);
        window.scrollTo(0, 0);
        return;
      }

      // 處理「返回」按鈕點擊
      if (backButton) {
        event.preventDefault();
        history.pushState({}, "", window.location.pathname.split("?")[0]);
        this.showView("list");
        window.scrollTo(0, 0);
        return;
      }

      // 處理分類篩選按鈕點擊
      if (filterButton) {
        document
          .querySelectorAll(".filter-btn")
          .forEach((btn) => btn.classList.remove("active"));
        filterButton.classList.add("active");

        const category = filterButton.dataset.category;
        this.state.currentFilter = category;

        const productsToShow =
          category === "all"
            ? this.state.allProducts
            : this.state.allProducts.filter((p) => p.category === category);

        this.renderProductList(productsToShow);
      }
    },
  };

  // ---- 啟動應用程式 ----
  App.init();
});

// --- js/products.js (Class-based View 優化版) ---

document.addEventListener("DOMContentLoaded", () => {
  const App = {
>>>>>>> b25132fcc8609441de6fa481a24c31129f32d663
    // ================================================================
    // --- 應用程式設定與狀態管理 ---
    // ================================================================
    config: {
      apiBaseUrl: "", // 您的 API 基礎路徑
    },
    state: {
      allProducts: [],
      currentFilter: "all",
<<<<<<< HEAD
      currentProduct: null, // 新增：用於儲存當前查看的商品
=======
>>>>>>> b25132fcc8609441de6fa481a24c31129f32d663
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
      document.body.addEventListener(
        "click",
        this.handleGlobalClick.bind(this)
      );
      window.addEventListener("popstate", this.handleRouting.bind(this));
    },

    async fetchProducts() {
      // 確保即使 apiBaseUrl 為空也能正常運作 (適用於本地開發)
      const apiUrl = `${this.config.apiBaseUrl || ""}/api/products`;
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error("無法從伺服器獲取商品列表，請稍後再試。");
      }
      this.state.allProducts = await response.json();
    },

<<<<<<< HEAD
    // 變更: 檢查陣列的第一個元素是否為影片網址
    isTikTokVideo(imageUrls) {
      if (!Array.isArray(imageUrls) || imageUrls.length === 0) return false;
      const url = imageUrls[0];
      return url && url.includes("tiktok.com");
    },

    // 變更: 獲取第一個圖片的嵌入網址
    getTikTokEmbedUrl(imageUrls) {
      if (!Array.isArray(imageUrls) || imageUrls.length === 0) return "";
      try {
        const urlObj = new URL(imageUrls[0]);
=======
    isTikTokVideo(url) {
      return url && url.includes("tiktok.com");
    },

    getTikTokEmbedUrl(url) {
      try {
        const urlObj = new URL(url);
>>>>>>> b25132fcc8609441de6fa481a24c31129f32d663
        const videoId = urlObj.pathname.split("/").pop();
        if (!videoId) return ""; // 如果路徑解析失敗，返回空字串
        return `https://www.tiktok.com/embed/v2/${videoId}`;
      } catch (e) {
<<<<<<< HEAD
        console.error("無效的 TikTok 影片網址:", imageUrls[0]);
=======
        console.error("無效的 TikTok 影片網址:", url);
>>>>>>> b25132fcc8609441de6fa481a24c31129f32d663
        return "";
      }
    },

    // ================================================================
    // --- 渲染與畫面控制方法 ---
    // ================================================================
    renderProductList(productsToRender) {
      this.elements.productGrid.innerHTML = ""; // 清空現有內容

      if (!productsToRender || productsToRender.length === 0) {
        this.elements.productGrid.innerHTML = "<p>這個分類下沒有商品。</p>";
        return;
      }

      const productHtml = productsToRender
        .map((product) => {
          const serviceFee = product.serviceFee || 0;
<<<<<<< HEAD
          const isVideo = this.isTikTokVideo(product.imageUrls);
          const firstImageUrl =
            (product.imageUrls && product.imageUrls[0]) || "";

          // 這裡的 HTML 結構是關鍵
=======
          const isVideo = this.isTikTokVideo(product.imageUrl);

>>>>>>> b25132fcc8609441de6fa481a24c31129f32d663
          return `
            <div class="product-card" data-id="${product.id}">
              <div class="product-media-container">
                ${
                  isVideo
<<<<<<< HEAD
                    ? `
                    <iframe
                      src="${this.getTikTokEmbedUrl(product.imageUrls)}"
                      frameborder="0"
                      allowfullscreen
                      scrolling="no"
                      allow="encrypted-media;">
                    </iframe>
                  `
                    : `<img src="${firstImageUrl}" alt="${product.title}" class="product-image">`
=======
                    ? `<iframe src="${this.getTikTokEmbedUrl(
                        product.imageUrl
                      )}" frameborder="0" allowfullscreen scrolling="no" allow="encrypted-media;"></iframe>`
                    : `<img src="${product.imageUrl}" alt="${product.title}" class="product-image">`
>>>>>>> b25132fcc8609441de6fa481a24c31129f32d663
                }
              </div>
              <div class="product-info">
                <div>
                  <span class="product-category">${product.category}</span>
                  <h3 class="product-title">${product.title}</h3>
                </div>
                <div>
                  <p class="product-price">$${product.price} TWD</p>
                  <p class="service-fee">代購服務費: $${serviceFee}</p>
                </div>
              </div>
              <div class="product-actions">
                <button class="btn-primary btn-add-to-cart" data-id="${
                  product.id
                }">採購同款商品到集運倉</button>
              </div>
            </div>`;
        })
        .join("");

<<<<<<< HEAD
      this.elements.productGrid.innerHTML =
        productHtml || "<p>這個分類下沒有商品。</p>";
=======
      this.elements.productGrid.innerHTML = productHtml;
>>>>>>> b25132fcc8609441de6fa481a24c31129f32d663
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
<<<<<<< HEAD
              category === "all" ? "active" : ""
            }" data-category="${category}">
                      ${category === "all" ? "全部" : category}
                  </button>`
=======
              category === this.state.currentFilter ? "active" : ""
            }" data-category="${category}">
              ${category === "all" ? "全部" : category}
            </button>`
>>>>>>> b25132fcc8609441de6fa481a24c31129f32d663
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
<<<<<<< HEAD
      const isVideo = this.isTikTokVideo(product.imageUrls);
      const mainImage = (product.imageUrls && product.imageUrls[0]) || "";
      const secondaryImages = product.imageUrls
        ? product.imageUrls.slice(1)
        : [];

      // 生成縮圖導覽 HTML
      const thumbnailsHtml = secondaryImages
        .map(
          (url, index) =>
            `<img src="${url}" alt="商品縮圖 ${
              index + 2
            }" class="product-thumbnail" data-src="${url}">`
        )
        .join("");
=======
      const isVideo = this.isTikTokVideo(product.imageUrl);
>>>>>>> b25132fcc8609441de6fa481a24c31129f32d663

      this.elements.productDetailContainer.innerHTML = `
        <div class="product-detail-view">
          <a href="#" class="back-to-list-btn">← 返回商品總覽</a>
<<<<<<< HEAD
          <div class="product-media-gallery">
            <div class="product-media-container-lg">
              ${
                isVideo
                  ? `<iframe src="${this.getTikTokEmbedUrl(
                      product.imageUrls
                    )}" frameborder="0" allowfullscreen class="tiktok-embed-lg"></iframe>`
                  : `<img src="${mainImage}" alt="${product.title}" class="main-product-image">`
              }
            </div>
            ${
              !isVideo
                ? `<div class="product-thumbnails">
                    <img src="${mainImage}" alt="主圖縮圖" class="product-thumbnail active" data-src="${mainImage}">
                    ${thumbnailsHtml}
                  </div>`
                : ""
=======
          <div class="product-media-container-lg">
            ${
              isVideo
                ? `<iframe src="${this.getTikTokEmbedUrl(
                    product.imageUrl
                  )}" frameborder="0" allowfullscreen class="tiktok-embed-lg"></iframe>`
                : `<img src="${product.imageUrl}" alt="${product.title}">`
>>>>>>> b25132fcc8609441de6fa481a24c31129f32d663
            }
          </div>
          <div class="product-detail-info">
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
              <button class="btn-secondary btn-share" data-id="${
                product.id
              }">分享商品</button>
            </div>
          </div>
        </div>
      `;
    },

    showView(viewName, productId = null) {
<<<<<<< HEAD
=======
      // ================================================================
      // --- 核心優化點 ---
      // 舊寫法: 直接操作 style.display
      // 新寫法: 透過新增/移除 '.is-hidden' class 來控制顯示狀態
      // ================================================================
>>>>>>> b25132fcc8609441de6fa481a24c31129f32d663
      if (viewName === "detail") {
        this.elements.mainContentView.classList.add("is-hidden");
        this.elements.productDetailContainer.classList.remove("is-hidden");

        const product = this.state.allProducts.find((p) => p.id === productId);
        this.renderSingleProduct(product);
      } else {
        // "list" view
        this.elements.mainContentView.classList.remove("is-hidden");
        this.elements.productDetailContainer.classList.add("is-hidden");

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
      // 確保在路由變化時也更新購物車UI (如果 Cart 物件存在)
      if (typeof Cart !== "undefined") {
        Cart.updateCountUI();
      }
    },

    async handleGlobalClick(event) {
      const target = event.target;
      const productCard = target.closest(".product-card");
      const filterButton = target.closest(".filter-btn");
      const backButton = target.closest(".back-to-list-btn");
      const addToCartButton = target.closest(".btn-add-to-cart");
      const shareButton = target.closest(".btn-share");
<<<<<<< HEAD
      const thumbnailImage = target.classList.contains("product-thumbnail")
        ? target
        : null;
=======
>>>>>>> b25132fcc8609441de6fa481a24c31129f32d663

      // 處理「加入購物車」按鈕點擊
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

      // 處理「分享商品」按鈕點擊
      if (shareButton) {
        event.preventDefault();
        const productId = shareButton.dataset.id;
        const productToShare = this.state.allProducts.find(
          (p) => p.id === productId
        );

        if (productToShare && navigator.share) {
          const shareUrl = `${window.location.origin}${window.location.pathname}?product_id=${productId}`;
          try {
            await navigator.share({
              title: `分享商品：${productToShare.title}`,
              text: `我在「代採購大平台」發現一個好東西：${productToShare.title}`,
              url: shareUrl,
            });
          } catch (err) {
            console.log("使用者取消了分享。");
          }
        } else if (productToShare) {
          // 備用方案：複製連結到剪貼簿
          const shareUrl = `${window.location.origin}${window.location.pathname}?product_id=${productId}`;
          navigator.clipboard
            .writeText(shareUrl)
            .then(() => {
              const originalText = shareButton.innerText;
              shareButton.innerText = "連結已複製!";
              setTimeout(() => {
                shareButton.innerText = originalText;
              }, 2000);
            })
            .catch((err) => console.error("複製失敗: ", err));
        }
        return;
      }

<<<<<<< HEAD
      // 處理縮圖點擊
      if (thumbnailImage) {
        const mainImage = document.querySelector(".main-product-image");
        if (mainImage) {
          mainImage.src = thumbnailImage.dataset.src;
          document.querySelectorAll(".product-thumbnail").forEach((thumb) => {
            thumb.classList.remove("active");
          });
          thumbnailImage.classList.add("active");
        }
        return;
      }

=======
>>>>>>> b25132fcc8609441de6fa481a24c31129f32d663
      // 處理商品卡片點擊 (進入詳細頁)
      if (productCard && !addToCartButton && !target.closest("iframe")) {
        event.preventDefault();
        const productId = productCard.dataset.id;
        history.pushState({ productId }, "", `?product_id=${productId}`);
        this.showView("detail", productId);
        window.scrollTo(0, 0);
        return;
      }

      // 處理「返回」按鈕點擊
      if (backButton) {
        event.preventDefault();
        history.pushState({}, "", window.location.pathname.split("?")[0]);
        this.showView("list");
        window.scrollTo(0, 0);
        return;
      }

      // 處理分類篩選按鈕點擊
      if (filterButton) {
        document
          .querySelectorAll(".filter-btn")
          .forEach((btn) => btn.classList.remove("active"));
        filterButton.classList.add("active");
        this.state.currentFilter = filterButton.dataset.category;
        this.showView("list"); // 直接呼叫 showView，由它內部邏輯來決定渲染哪些商品
      }
    },
  };

  // ---- 啟動應用程式 ----
  App.init();
});
