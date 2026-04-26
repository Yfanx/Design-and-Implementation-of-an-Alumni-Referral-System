async function loadProfileContext(session) {
  if (session.role === "ALUMNI") {
    const result = await apiRequest(`/referral/alumni-info/get?id=${session.profileId}`);
    return result.data;
  }
  return null;
}

document.addEventListener("DOMContentLoaded", async () => {
  const session = ensureLogin();
  const profile = await loadProfileContext(session);

  if (session.role === "ADMIN") {
    renderAppLayout("profile", "我的资料", "查看当前管理员账号信息和当前版本说明。", `
      <section class="panel">
        <div class="compact-item">
          <strong>${session.displayName}</strong>
          <div class="job-card-company">平台管理员 / ${session.username}</div>
          <p>当前账号负责校友核验、岗位审核、学生档案查看和平台数据统计。正式版还可以继续扩展菜单权限、日志审计和系统配置。</p>
        </div>
      </section>
    `);
    return;
  }

  renderAppLayout("profile", "我的资料", "完善校友档案、内推权限和岗位背景信息。", `
    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>校友档案</h2>
          <p>这里的数据会用于岗位发布和校友展示。</p>
        </div>
      </div>
      <form class="demo-form" id="alumni-profile-form">
        <input type="hidden" name="id" value="${profile.id}">
        <input type="hidden" name="userId" value="${profile.userId}">
        <input name="realName" value="${profile.realName || ""}" placeholder="姓名">
        <input name="graduationYear" value="${profile.graduationYear || ""}" placeholder="毕业年份">
        <input name="college" value="${profile.college || ""}" placeholder="学院">
        <input name="major" value="${profile.major || ""}" placeholder="专业">
        <input name="companyId" value="${profile.companyId || ""}" placeholder="企业 ID">
        <input name="companyName" value="${profile.companyName || ""}" placeholder="企业名称">
        <input name="industry" value="${profile.industry || ""}" placeholder="行业">
        <input name="positionName" value="${profile.positionName || ""}" placeholder="岗位">
        <input name="city" value="${profile.city || ""}" placeholder="城市">
        <input name="referralPermission" value="${profile.referralPermission || 1}" placeholder="内推权限">
        <textarea name="intro" placeholder="介绍自己的行业背景、可提供的帮助以及岗位方向。">${profile.intro || ""}</textarea>
        <button type="submit">保存资料</button>
      </form>
      <div id="profile-result" class="action-result">修改后可用于演示校友档案维护。</div>
    </section>
  `);

  document.getElementById("alumni-profile-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = formPayload(event.target);
    payload.gender = profile.gender;
    payload.verifyStatus = profile.verifyStatus;
    await apiRequest("/referral/alumni-info/update", {
      method: "PUT",
      body: JSON.stringify(payload)
    });
    document.getElementById("profile-result").innerText = "校友资料已更新。";
  });
});
