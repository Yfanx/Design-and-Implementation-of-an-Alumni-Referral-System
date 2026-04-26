document.addEventListener("DOMContentLoaded", async () => {
  const session = getSession();
  if (session) {
    location.href = session.landingPage || "/dashboard.html";
    return;
  }

  const form = document.getElementById("register-form");
  const resultEl = document.getElementById("register-result");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = formPayload(form);

    if (!payload.username || !payload.password) {
      resultEl.innerText = "用户名和密码不能为空。";
      return;
    }
    if (payload.password !== payload.confirmPassword) {
      resultEl.innerText = "两次输入的密码不一致，请重新检查。";
      return;
    }
    if (payload.password.length < 6) {
      resultEl.innerText = "密码长度不能少于 6 位。";
      return;
    }

    delete payload.confirmPassword;
    payload.role = "STUDENT";

    resultEl.innerText = "正在提交注册信息...";
    try {
      const response = await apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      saveSession(response.data);
      resultEl.innerText = "注册成功，正在进入学生工作台...";
      location.href = response.data.landingPage || "/dashboard.html";
    } catch (error) {
      resultEl.innerText = error.message || "注册失败，请稍后重试。";
    }
  });
});
