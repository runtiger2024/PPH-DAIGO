document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("authToken");
  if (!token) {
    window.location.href = "login.html";
    return;
  }
  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
  const API_BASE_URL = "https://daigou-platform-api.onrender.com";

  const categoryListBody = document.getElementById("category-list-body");
  const addCategoryForm = document.getElementById("add-category-form");
  const responseMessageDiv = document.getElementById("response-message");

  async function fetchAndRenderCategories() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/categories`);
      if (!response.ok) throw new Error("無法獲取分類列表");
      const categories = await response.json();

      categoryListBody.innerHTML = "";
      if (categories.length === 0) {
        categoryListBody.innerHTML = `<tr><td colspan="2" style="text-align: center;">尚未建立任何分類。</td></tr>`;
      } else {
        categories.forEach((cat) => {
          const row = `
                        <tr>
                            <td data-label="分類名稱">${cat.name}</td>
                            <td data-label="操作">
                                <button class="btn-small btn-danger btn-delete" data-id="${cat.id}" data-name="${cat.name}">刪除</button>
                            </td>
                        </tr>
                    `;
          categoryListBody.insertAdjacentHTML("beforeend", row);
        });
      }
    } catch (error) {
      console.error("錯誤:", error);
      categoryListBody.innerHTML = `<tr><td colspan="2">載入分類失敗: ${error.message}</td></tr>`;
    }
  }

  addCategoryForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    responseMessageDiv.textContent = "";
    const name = document.getElementById("category-name").value.trim();
    if (!name) {
      alert("分類名稱不能為空！");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/categories`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ name }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "新增失敗");

      alert(`分類 "${result.name}" 新增成功！`);
      addCategoryForm.reset();
      fetchAndRenderCategories();
    } catch (error) {
      responseMessageDiv.style.color = "red";
      responseMessageDiv.textContent = error.message;
    }
  });

  categoryListBody.addEventListener("click", async (event) => {
    if (event.target.classList.contains("btn-delete")) {
      const catId = event.target.dataset.id;
      const catName = event.target.dataset.name;
      if (
        confirm(
          `您確定要刪除分類 "${catName}" 嗎？\n\n注意：這不會刪除該分類下的商品，但商品的分類會變為空值。`
        )
      ) {
        try {
          const response = await fetch(
            `${API_BASE_URL}/api/categories/${catId}`,
            {
              method: "DELETE",
              headers: authHeaders,
            }
          );
          const result = await response.json();
          if (!response.ok) throw new Error(result.message || "刪除失敗");
          alert(result.message);
          fetchAndRenderCategories();
        } catch (error) {
          alert(error.message);
        }
      }
    }
  });

  // 如果有登出按鈕，加上事件監聽
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("authToken");
      window.location.href = "login.html";
    });
  }

  fetchAndRenderCategories();
});
