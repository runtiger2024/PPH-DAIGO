document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("authToken");
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  const changePasswordForm = document.getElementById("change-password-form");
  const responseMessageDiv = document.getElementById("response-message");
  const logoutBtn = document.getElementById("logout-btn");
  const API_BASE_URL = ""; // 請確保這是您正確的後端網址

  changePasswordForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    responseMessageDiv.textContent = "";
    responseMessageDiv.style.color = "red";

    const currentPassword = document.getElementById("current-password").value;
    const newPassword = document.getElementById("new-password").value;
    const confirmPassword = document.getElementById("confirm-password").value;

    if (newPassword !== confirmPassword) {
      responseMessageDiv.textContent = "新密碼與確認密碼不相符！";
      return;
    }
    if (newPassword.length < 6) {
      responseMessageDiv.textContent = "新密碼長度至少需要 6 個字元。";
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/user/password`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "更新失敗");
      }

      responseMessageDiv.textContent = result.message;
      responseMessageDiv.style.color = "green";
      changePasswordForm.reset();
    } catch (error) {
      console.error("更新密碼錯誤:", error);
      responseMessageDiv.textContent = error.message;
    }
  });

  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("authToken");
    window.location.href = "login.html";
  });
});
