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
    result.innerText = "\u767b\u5f55\u6210\u529f\uff0c\u6b63\u5728\u8fdb\u5165\u7ba1\u7406\u53f0...";
    location.href = response.data.landingPage || "/dashboard.html";
  });
});
