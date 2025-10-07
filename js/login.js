document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login-form");
  const errorMessageDiv = document.getElementById("error-message");

  // !!! 請再次確認這個網址是您部署好的後端網址 !!!
  const API_BASE_URL = "https://daigou-platform-api.onrender.com";

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorMessageDiv.textContent = ""; // 清空之前的錯誤訊息

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "登入失敗");
      }

      // 登入成功！
      // 將後端回傳的 token 存到瀏覽器的 localStorage
      localStorage.setItem("authToken", result.token);

      // 跳轉到後台管理主頁
      window.location.href = "dashboard.html";
    } catch (error) {
      console.error("登入錯誤:", error);
      errorMessageDiv.textContent = error.message;
    }
  });
});
