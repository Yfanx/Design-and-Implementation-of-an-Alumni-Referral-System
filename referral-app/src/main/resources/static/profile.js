async function loadProfile(session) {
  if (session.role === "ALUMNI") {
    const result = await apiRequest(`/referral/alumni-info/get?id=${session.profileId}`);
    return result.data || {};
  }
  const result = await apiRequest(`/referral/student-info/get?id=${session.profileId}`);
  return result.data || {};
}

function splitTags(value = "") {
  return String(value || "")
    .split(/[,，/|]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function renderTagCloud(tags = []) {
  if (!tags.length) {
    return `<span class="tag-chip muted">建议补充技能标签</span>`;
  }
  return tags.map((item) => `<span class="tag-chip">${item}</span>`).join("");
}

function renderChecklist(items = []) {
  return items.map((item) => `
    <div class="check-item ${item.done ? "done" : ""}">
      <span class="check-dot">${item.done ? "已" : "待"}</span>
      <span>${item.label}</span>
    </div>
  `).join("");
}

function renderInfoRows(rows = []) {
  return rows.map((row) => `
    <div class="info-row-card">
      <span>${row.label}</span>
      <strong>${row.value || "-"}</strong>
    </div>
  `).join("");
}

function studentChecklist(profile) {
  return [
    { label: "基础资料已填写", done: !!profile.realName && !!profile.college && !!profile.major },
    { label: "求职意向已完善", done: !!profile.expectedJob && !!profile.expectedCity },
    { label: "技能标签不少于两项", done: splitTags(profile.skillTags).length >= 2 },
    { label: "简历附件已上传", done: !!sanitizeAttachmentUrl(profile.resumeUrl) }
  ];
}

function alumniChecklist(profile) {
  return [
    { label: "校友身份信息完整", done: !!profile.realName && !!profile.graduationYear },
    { label: "所属企业已绑定", done: !!profile.companyName && !!profile.companyId },
    { label: "岗位与城市已填写", done: !!profile.positionName && !!profile.city },
    { label: "内推权限已确认", done: profile.referralPermission !== null && profile.referralPermission !== undefined }
  ];
}

function openStudentProfileEditor(profile, session, onSaved) {
  openPageModal({
    title: "编辑我的资料",
    subtitle: "统一维护求职方向、技能标签和简历附件。",
    size: "wide",
    body: `
      <form class="demo-form" id="student-profile-form">
        <input type="hidden" name="id" value="${profile.id || session.profileId}">
        <input type="hidden" id="student-resume-url-input" name="resumeUrl" value="${profile.resumeUrl || ""}">
        <div class="form-grid">
          <label class="form-field"><span>姓名</span><input name="realName" value="${profile.realName || ""}" placeholder="例如：李同学"></label>
          <label class="form-field"><span>性别</span><select name="gender"><option value="1" ${Number(profile.gender || 1) === 1 ? "selected" : ""}>男</option><option value="2" ${Number(profile.gender || 1) === 2 ? "selected" : ""}>女</option></select></label>
          <label class="form-field"><span>学号</span><input name="studentNo" value="${profile.studentNo || ""}" placeholder="例如：2022001001"></label>
          <label class="form-field"><span>年级</span><input name="grade" value="${profile.grade || ""}" placeholder="例如：2022 级"></label>
          <label class="form-field"><span>学院</span><input name="college" value="${profile.college || ""}" placeholder="例如：计算机学院"></label>
          <label class="form-field"><span>专业</span><input name="major" value="${profile.major || ""}" placeholder="例如：软件工程"></label>
          <label class="form-field"><span>学历</span><select name="education"><option value="">请选择</option><option value="本科" ${profile.education === "本科" ? "selected" : ""}>本科</option><option value="硕士" ${profile.education === "硕士" ? "selected" : ""}>硕士</option><option value="博士" ${profile.education === "博士" ? "selected" : ""}>博士</option></select></label>
          <label class="form-field"><span>期望行业</span><input name="expectedIndustry" value="${profile.expectedIndustry || ""}" placeholder="例如：互联网 / 人工智能"></label>
          <label class="form-field"><span>期望岗位</span><input name="expectedJob" value="${profile.expectedJob || ""}" placeholder="例如：Java 后端开发"></label>
          <label class="form-field"><span>期望城市</span><input name="expectedCity" value="${profile.expectedCity || ""}" placeholder="例如：上海 / 杭州"></label>
          <label class="form-field field-span-2"><span>技能标签</span><input name="skillTags" value="${profile.skillTags || ""}" placeholder="例如：Java, Spring Boot, MySQL, Vue"></label>
          <div class="form-field field-span-2">
            <span>上传附件</span>
            <div class="upload-bar">
              <input id="student-resume-file-input" class="upload-input-hidden" type="file" accept=".pdf,.png,.jpg,.jpeg,.gif,.svg">
              <button type="button" class="btn ghost-btn" id="upload-student-resume-btn">上传附件</button>
            </div>
          </div>
          <div class="field-span-2" id="student-resume-preview-area">${renderAttachmentPreview(profile.resumeUrl)}</div>
          <label class="form-field field-span-2"><span>个人介绍</span><textarea name="intro" placeholder="建议描述项目经历、技能方向和目标岗位。">${profile.intro || ""}</textarea></label>
        </div>
        <div class="page-action-bar top-gap">
          <div class="action-group">
            <button type="button" class="btn ghost-btn" id="cancel-student-profile">取消</button>
            <button type="submit" class="btn">保存资料</button>
          </div>
        </div>
      </form>
      <div id="student-profile-result" class="action-result">保存后会刷新当前资料页。</div>
    `,
    onReady(body) {
      const resumeUrlInput = body.querySelector("#student-resume-url-input");
      const resumePreviewArea = body.querySelector("#student-resume-preview-area");
      const resultNode = body.querySelector("#student-profile-result");
      const fileInput = body.querySelector("#student-resume-file-input");

      const syncAttachmentPreview = (url) => {
        const safeUrl = sanitizeAttachmentUrl(url);
        resumePreviewArea.innerHTML = renderAttachmentPreview(safeUrl);
      };

      body.querySelector("#cancel-student-profile").addEventListener("click", closePageModal);

      const uploadCurrentFile = async () => {
        const file = fileInput.files?.[0];
        if (!file) {
          return;
        }
        resultNode.innerText = "正在上传附件...";
        try {
          const uploaded = await uploadReferralFile(file, "student/profile");
          resumeUrlInput.value = uploaded.url;
          syncAttachmentPreview(uploaded.url);
          resultNode.innerText = `附件上传成功：${uploaded.originalFileName}`;
        } catch (error) {
          resultNode.innerText = error.message || "上传失败，请稍后重试。";
        } finally {
          fileInput.value = "";
        }
      };

      body.querySelector("#upload-student-resume-btn").addEventListener("click", () => fileInput.click());
      fileInput.addEventListener("change", uploadCurrentFile);

      body.querySelector("#student-profile-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const payload = formPayload(event.target);
        await apiRequest("/referral/student-info/update", {
          method: "PUT",
          body: JSON.stringify(payload)
        });
        resultNode.innerText = "资料更新成功。";
        await onSaved();
        setTimeout(() => closePageModal(), 400);
      });
    }
  });
}

function openAlumniProfileEditor(profile, onSaved) {
  openPageModal({
    title: "编辑校友资料",
    subtitle: "统一维护企业归属、岗位信息和内推权限。",
    size: "wide",
    body: `
      <form class="demo-form" id="alumni-profile-form">
        <input type="hidden" name="id" value="${profile.id || ""}">
        <div class="form-grid">
          <label class="form-field"><span>姓名</span><input name="realName" value="${profile.realName || ""}" placeholder="例如：张学长"></label>
          <label class="form-field"><span>毕业年份</span><input name="graduationYear" value="${profile.graduationYear || ""}" placeholder="例如：2021"></label>
          <label class="form-field"><span>学院</span><input name="college" value="${profile.college || ""}" placeholder="例如：计算机学院"></label>
          <label class="form-field"><span>专业</span><input name="major" value="${profile.major || ""}" placeholder="例如：软件工程"></label>
          <label class="form-field"><span>企业 ID</span><input name="companyId" value="${profile.companyId || ""}" placeholder="例如：1001"></label>
          <label class="form-field"><span>企业名称</span><input name="companyName" value="${profile.companyName || ""}" placeholder="例如：腾讯"></label>
          <label class="form-field"><span>行业方向</span><input name="industry" value="${profile.industry || ""}" placeholder="例如：互联网"></label>
          <label class="form-field"><span>岗位名称</span><input name="positionName" value="${profile.positionName || ""}" placeholder="例如：后端开发工程师"></label>
          <label class="form-field"><span>所在城市</span><input name="city" value="${profile.city || ""}" placeholder="例如：上海"></label>
          <label class="form-field"><span>内推权限</span><select name="referralPermission"><option value="1" ${Number(profile.referralPermission || 1) === 1 ? "selected" : ""}>启用</option><option value="0" ${Number(profile.referralPermission || 1) === 0 ? "selected" : ""}>停用</option></select></label>
          <label class="form-field field-span-2"><span>个人介绍</span><textarea name="intro" placeholder="说明行业背景、对接经验和可提供的帮助。">${profile.intro || ""}</textarea></label>
        </div>
        <div class="page-action-bar top-gap">
          <div class="action-group">
            <button type="button" class="btn ghost-btn" id="cancel-alumni-profile">取消</button>
            <button type="submit" class="btn">保存资料</button>
          </div>
        </div>
      </form>
      <div id="alumni-profile-result" class="action-result">保存后会刷新当前资料页。</div>
    `,
    onReady(body) {
      const resultNode = body.querySelector("#alumni-profile-result");
      body.querySelector("#cancel-alumni-profile").addEventListener("click", closePageModal);
      body.querySelector("#alumni-profile-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const payload = formPayload(event.target);
        payload.gender = profile.gender;
        payload.verifyStatus = profile.verifyStatus;
        await apiRequest("/referral/alumni-info/update", {
          method: "PUT",
          body: JSON.stringify(payload)
        });
        resultNode.innerText = "校友资料更新成功。";
        await onSaved();
        setTimeout(() => closePageModal(), 400);
      });
    }
  });
}

function renderStudentProfile(profile, session) {
  const skills = splitTags(profile.skillTags);
  const profileRows = [
    { label: "姓名", value: profile.realName || session.displayName },
    { label: "学院", value: profile.college || "-" },
    { label: "专业", value: profile.major || "-" },
    { label: "学历", value: profile.education || "-" },
    { label: "学号", value: profile.studentNo || "-" },
    { label: "年级", value: profile.grade || "-" }
  ];

  renderAppLayout("profile", "我的资料", "以更完整的职业档案形式展示个人信息、求职方向和附件。", `
    <section class="profile-studio-shell">
      <section class="profile-hero-card reveal">
        <div class="profile-hero-main">
          <span class="section-eyebrow">Profile Studio</span>
          <h2>${profile.realName || session.displayName}</h2>
          <p>${profile.college || "学院待补"} / ${profile.major || "专业待补"} / ${profile.education || "学历待补"}</p>
          <div class="profile-hero-tags">
            <span class="profile-chip">${profile.expectedJob || "目标岗位待补"}</span>
            <span class="profile-chip">${profile.expectedCity || "目标城市待补"}</span>
            <span class="profile-chip">${profile.expectedIndustry || "方向待补"}</span>
          </div>
        </div>
        <div class="profile-hero-side">
          <div class="profile-avatar-block">
            <div class="profile-avatar-disc">${(profile.realName || session.displayName || "我").slice(0, 1)}</div>
            <div>
              <strong>个人档案</strong>
              <div class="job-card-company">${sanitizeAttachmentUrl(profile.resumeUrl) ? "附件已上传" : "附件待补充"}</div>
            </div>
          </div>
          <button class="btn" id="edit-student-profile-btn">编辑资料</button>
        </div>
      </section>

      <section class="profile-stats-row reveal reveal-delay-1">
        <article class="metric-card">
          <span class="metric-label">目标岗位</span>
          <strong>${profile.expectedJob || "待补充"}</strong>
          <p>${profile.expectedCity || "未设置城市"}</p>
        </article>
        <article class="metric-card">
          <span class="metric-label">技能标签</span>
          <strong>${skills.length}</strong>
          <p>建议保持 4-8 个核心标签</p>
        </article>
        <article class="metric-card">
          <span class="metric-label">简历状态</span>
          <strong>${sanitizeAttachmentUrl(profile.resumeUrl) ? "已上传" : "未上传"}</strong>
          <p>支持站内预览与新窗口查看</p>
        </article>
      </section>

      <section class="profile-studio-grid reveal reveal-delay-2">
        <div class="profile-studio-main">
          <section class="panel">
            <div class="panel-header">
              <div>
                <h2>基础信息</h2>
              </div>
            </div>
            <div class="info-rows-grid">
              ${renderInfoRows(profileRows)}
            </div>
          </section>

          <section class="panel">
            <div class="panel-header">
              <div>
                <h2>求职画像</h2>
              </div>
            </div>
            <div class="profile-focus-grid">
              <div class="summary-block">
                <span class="summary-label">目标方向</span>
                <strong>${profile.expectedJob || "待补充目标岗位"}</strong>
                <p>${profile.expectedCity || "待补充城市"} / ${profile.expectedIndustry || "待补充行业"}</p>
              </div>
              <div class="summary-block">
                <span class="summary-label">个人介绍</span>
                <p>${profile.intro || "建议补充项目经历、技术方向和求职偏好。"}</p>
              </div>
            </div>
          </section>
        </div>

        <aside class="profile-studio-side">
          <section class="panel">
            <div class="panel-header">
              <div>
                <h2>技能标签</h2>
              </div>
            </div>
            <div class="profile-skill-cloud">${renderTagCloud(skills)}</div>
          </section>

          <section class="panel">
            <div class="panel-header">
              <div>
                <h2>附件中心</h2>
              </div>
            </div>
            <div class="attachment-toolbar-card">
              <div>
                <strong>当前附件</strong>
                <div class="job-card-company">${sanitizeAttachmentUrl(profile.resumeUrl) ? "已上传简历附件" : "暂未上传附件"}</div>
              </div>
              <div class="document-actions-inline">${renderAttachmentLink(profile.resumeUrl, "查看附件")}</div>
            </div>
            <div class="attachment-stage">${renderAttachmentPreview(profile.resumeUrl)}</div>
          </section>

          <section class="panel">
            <div class="panel-header">
              <div>
                <h2>资料完成度</h2>
              </div>
            </div>
            <div class="profile-checklist">
              ${renderChecklist(studentChecklist(profile))}
            </div>
          </section>
        </aside>
      </section>
    </section>
  `);

  document.getElementById("edit-student-profile-btn").addEventListener("click", () => {
    openStudentProfileEditor(profile, session, async () => location.reload());
  });
}

function renderAlumniProfile(profile) {
  const profileRows = [
    { label: "姓名", value: profile.realName || "-" },
    { label: "毕业年份", value: profile.graduationYear || "-" },
    { label: "学院", value: profile.college || "-" },
    { label: "专业", value: profile.major || "-" },
    { label: "企业 ID", value: profile.companyId || "-" },
    { label: "所在城市", value: profile.city || "-" }
  ];

  renderAppLayout("profile", "我的资料", "展示校友身份、企业归属和内推配置。", `
    <section class="profile-studio-shell">
      <section class="profile-hero-card reveal">
        <div class="profile-hero-main">
          <span class="section-eyebrow">Alumni Profile</span>
          <h2>${profile.realName || "校友"}</h2>
          <p>${profile.companyName || "企业待补"} / ${profile.positionName || "岗位待补"} / ${profile.city || "城市待补"}</p>
          <div class="profile-hero-tags">
            <span class="profile-chip">${profile.industry || "行业待补"}</span>
            <span class="profile-chip">${Number(profile.referralPermission || 1) === 1 ? "内推权限已启用" : "内推权限已停用"}</span>
          </div>
        </div>
        <div class="profile-hero-side">
          <div class="profile-avatar-block">
            <div class="profile-avatar-disc">${(profile.realName || "校").slice(0, 1)}</div>
            <div>
              <strong>${profile.companyName || "企业信息"}</strong>
              <div class="job-card-company">${profile.positionName || "岗位待完善"}</div>
            </div>
          </div>
          <button class="btn" id="edit-alumni-profile-btn">编辑资料</button>
        </div>
      </section>

      <section class="profile-stats-row reveal reveal-delay-1">
        <article class="metric-card">
          <span class="metric-label">所属企业</span>
          <strong>${profile.companyName || "待绑定"}</strong>
          <p>${profile.industry || "行业待补充"}</p>
        </article>
        <article class="metric-card">
          <span class="metric-label">当前岗位</span>
          <strong>${profile.positionName || "待填写"}</strong>
          <p>${profile.city || "城市待填写"}</p>
        </article>
        <article class="metric-card">
          <span class="metric-label">内推权限</span>
          <strong>${Number(profile.referralPermission || 1) === 1 ? "启用中" : "已停用"}</strong>
          <p>影响发岗和申请处理</p>
        </article>
      </section>

      <section class="profile-studio-grid reveal reveal-delay-2">
        <div class="profile-studio-main">
          <section class="panel">
            <div class="panel-header">
              <div>
                <h2>身份信息</h2>
              </div>
            </div>
            <div class="info-rows-grid">
              ${renderInfoRows(profileRows)}
            </div>
          </section>

          <section class="panel">
            <div class="panel-header">
              <div>
                <h2>业务说明</h2>
              </div>
            </div>
            <div class="profile-focus-grid">
              <div class="summary-block">
                <span class="summary-label">企业归属</span>
                <strong>${profile.companyName || "待绑定企业"}</strong>
                <p>企业 ID：${profile.companyId || "未绑定"} / 行业：${profile.industry || "待补充"}</p>
              </div>
              <div class="summary-block">
                <span class="summary-label">个人介绍</span>
                <p>${profile.intro || "建议说明行业背景、对接经验和能提供的帮助。"}</p>
              </div>
            </div>
          </section>
        </div>

        <aside class="profile-studio-side">
          <section class="panel">
            <div class="panel-header">
              <div>
                <h2>工作提示</h2>
              </div>
            </div>
            <div class="profile-checklist">
              <div class="check-item done"><span class="check-dot">1</span><span>发布岗位会自动继承企业归属。</span></div>
              <div class="check-item done"><span class="check-dot">2</span><span>咨询消息围绕已投递岗位展开。</span></div>
              <div class="check-item done"><span class="check-dot">3</span><span>后台只负责审核治理，不参与前台业务填写。</span></div>
            </div>
          </section>

          <section class="panel">
            <div class="panel-header">
              <div>
                <h2>资料完成度</h2>
              </div>
            </div>
            <div class="profile-checklist">
              ${renderChecklist(alumniChecklist(profile))}
            </div>
          </section>
        </aside>
      </section>
    </section>
  `);

  document.getElementById("edit-alumni-profile-btn").addEventListener("click", () => {
    openAlumniProfileEditor(profile, async () => location.reload());
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const session = ensureLogin();
  const profile = await loadProfile(session);
  if (session.role === "ALUMNI") {
    renderAlumniProfile(profile);
    return;
  }
  renderStudentProfile(profile, session);
});
