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

  const userListBody = document.getElementById("user-list-body");
  const addUserForm = document.getElementById("add-user-form");
  const responseMessageDiv = document.getElementById("response-message");

  async function fetchAndRenderUsers() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users`, {
        headers: authHeaders,
      });
      if (response.status === 403) {
        alert("您的權限不足，無法管理使用者！");
        window.location.href = "admin.html";
        return;
      }
      if (!response.ok) throw new Error("無法獲取使用者列表");
      const users = await response.json();
      userListBody.innerHTML = "";
      users.forEach((user) => {
        const row = `
                    <tr>
                        <td data-label="使用者帳號">${user.username}</td>
                        <td data-label="角色">${user.role}</td>
                        <td data-label="操作">
                            ${
                              user.username !== "randy"
                                ? `<button class="btn-small btn-danger btn-delete" data-username="${user.username}">刪除</button>`
                                : "最高管理員"
                            }
                        </td>
                    </tr>
                `;
        userListBody.insertAdjacentHTML("beforeend", row);
      });
    } catch (error) {
      console.error("錯誤:", error);
      userListBody.innerHTML = `<tr><td colspan="3">${error.message}</td></tr>`;
    }
  }

  addUserForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    responseMessageDiv.textContent = "";
    const newUser = {
      username: document.getElementById("username").value,
      password: document.getElementById("password").value,
      role: document.getElementById("role").value,
    };
    try {
      const response = await fetch(`${API_BASE_URL}/api/users`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(newUser),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "新增失敗");
      alert(`使用者 ${result.username} 新增成功！`);
      addUserForm.reset();
      fetchAndRenderUsers();
    } catch (error) {
      responseMessageDiv.style.color = "red";
      responseMessageDiv.textContent = error.message;
    }
  });

  userListBody.addEventListener("click", async (event) => {
    if (event.target.classList.contains("btn-delete")) {
      const username = event.target.dataset.username;
      if (confirm(`您確定要刪除使用者 ${username} 嗎？此操作無法復原！`)) {
        try {
          const response = await fetch(
            `${API_BASE_URL}/api/users/${username}`,
            {
              method: "DELETE",
              headers: authHeaders,
            }
          );
          const result = await response.json();
          if (!response.ok) throw new Error(result.message || "刪除失敗");
          alert(result.message);
          fetchAndRenderUsers();
        } catch (error) {
          alert(error.message);
        }
      }
    }
  });

  document.getElementById("logout-btn").addEventListener("click", () => {
    localStorage.removeItem("authToken");
    window.location.href = "login.html";
  });

  fetchAndRenderUsers();
});
