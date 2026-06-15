document.addEventListener("DOMContentLoaded", () => {
  const session = getSession();
  if (session) {
    location.href = session.landingPage || "/dashboard.html";
    return;
  }
  consumeFlashToast();

  const form = document.getElementById("login-form");
  const result = document.getElementById("login-result");
  const usernameInput = form.querySelector('input[name="username"]');
  const passwordInput = form.querySelector('input[name="password"]');
  const submitButton = form.querySelector('button[type="submit"]');

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    result.innerText = "";
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "登录中...";
    }

    try {
      const payload = formPayload(form);
      if (!payload.username || !payload.password) {
        result.innerText = "请输入用户名和密码。";
        return;
      }

      const response = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      saveSession(response.data);
      result.innerText = "登录成功，正在进入工作台...";
      location.href = response.data.landingPage || "/dashboard.html";
    } catch (error) {
      result.innerText = error?.message || "登录失败，请稍后重试。";
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "立即登录";
      }
    }
  });
});
