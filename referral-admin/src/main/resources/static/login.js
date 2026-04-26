document.addEventListener("DOMContentLoaded", () => {
  const session = getSession();
  if (session) {
    location.href = session.landingPage || "/dashboard.html";
    return;
  }

  const form = document.getElementById("login-form");
  const result = document.getElementById("login-result");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = formPayload(form);
    const response = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    saveSession(response.data);
    result.innerText = "登录成功，正在进入后台工作台...";
    location.href = response.data.landingPage || "/dashboard.html";
  });
});
