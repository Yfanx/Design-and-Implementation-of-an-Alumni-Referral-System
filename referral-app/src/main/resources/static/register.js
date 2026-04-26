document.addEventListener("DOMContentLoaded", async () => {
  const session = getSession();
  if (session) {
    location.href = session.landingPage || "/dashboard.html";
    return;
  }

  const form = document.getElementById("register-form");
  const resultEl = document.getElementById("register-result");
  const noteEl = document.getElementById("register-note");
  const roleInput = document.getElementById("register-role");
  const submitButton = form.querySelector('button[type="submit"]');
  const roleButtons = Array.from(document.querySelectorAll(".role-switch-item"));
  const studentOnlyFields = Array.from(document.querySelectorAll(".student-only"));
  const alumniOnlyFields = Array.from(document.querySelectorAll(".alumni-only"));
  const panels = Array.from(document.querySelectorAll(".register-panel"));

  const roleMeta = {
    STUDENT: {
      title: "学生注册",
      note: "学生注册后会自动进入求职工作台，建议先完善“我的资料”。"
    },
    ALUMNI: {
      title: "校友注册",
      note: "校友注册后会自动进入校友工作台，可继续完善企业、岗位与个人档案。"
    }
  };

  function setRequired(selector, required) {
    form.querySelectorAll(selector).forEach((field) => {
      field.required = required;
    });
  }

  function applyRole(role) {
    roleInput.value = role;
    roleButtons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.role === role);
    });

    studentOnlyFields.forEach((field) => field.classList.toggle("is-hidden", role !== "STUDENT"));
    alumniOnlyFields.forEach((field) => field.classList.toggle("is-hidden", role !== "ALUMNI"));
    panels.forEach((panel) => panel.classList.toggle("is-hidden", panel.dataset.panel !== role));

    setRequired('input[name="studentNo"]', role === "STUDENT");
    setRequired('input[name="grade"]', role === "STUDENT");
    setRequired('input[name="education"]', role === "STUDENT");
    setRequired('input[name="graduationYear"]', role === "ALUMNI");
    setRequired('input[name="companyName"]', role === "ALUMNI");
    setRequired('input[name="positionName"]', role === "ALUMNI");
    setRequired('input[name="industry"]', role === "ALUMNI");
    setRequired('input[name="city"]', role === "ALUMNI");

    const topTitle = form.querySelector(".login-card-top h2");
    if (topTitle) {
      topTitle.textContent = roleMeta[role].title;
    }
    if (noteEl) {
      noteEl.textContent = roleMeta[role].note;
    }
  }

  roleButtons.forEach((button) => {
    button.addEventListener("click", () => applyRole(button.dataset.role));
  });
  applyRole(roleInput.value || "STUDENT");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    resultEl.innerText = "";
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "注册中...";
    }

    try {
      const payload = formPayload(form);
      payload.role = roleInput.value || "STUDENT";

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
      if (payload.role === "ALUMNI" && payload.graduationYear && !/^\d{4}$/.test(String(payload.graduationYear))) {
        resultEl.innerText = "毕业年份请填写 4 位年份，例如 2021。";
        return;
      }

      if (payload.role === "STUDENT") {
        delete payload.graduationYear;
        delete payload.companyName;
        delete payload.positionName;
        delete payload.industry;
        delete payload.city;
        delete payload.intro;
      } else {
        delete payload.studentNo;
        delete payload.grade;
        delete payload.education;
      }

      delete payload.confirmPassword;
      resultEl.innerText = "正在提交注册信息...";

      const response = await apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      saveSession(response.data);
      resultEl.innerText = `${payload.role === "ALUMNI" ? "校友" : "学生"}注册成功，正在进入工作台...`;
      location.href = response.data.landingPage || "/dashboard.html";
    } catch (error) {
      resultEl.innerText = error?.message || "注册失败，请稍后重试。";
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "完成注册";
      }
    }
  });
});
