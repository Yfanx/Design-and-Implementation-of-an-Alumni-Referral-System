async function loadProfile(session) {
  if (session.role === "ALUMNI") {
    const result = await apiRequest(`/referral/alumni-info/get?id=${session.profileId}`);
    return result.data || {};
  }
  const result = await apiRequest(`/referral/student-info/get?id=${session.profileId}`);
  return result.data || {};
}

function openStudentProfileEditor(profile, session, onSaved) {
  openPageModal({
    title: "编辑学生资料",
    subtitle: "求职意向、技能标签和附件统一在弹窗中维护，保存后会立即刷新摘要卡片。",
    size: "wide",
    body: `
      <form class="demo-form" id="student-profile-form">
        <input type="hidden" name="id" value="${profile.id || session.profileId}">
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
          <label class="form-field field-span-2"><span>技能标签</span><input name="skillTags" value="${profile.skillTags || ""}" placeholder="例如：Java / Spring Boot / MySQL / Vue"></label>
          <label class="form-field field-span-2"><span>附件链接</span><input id="student-resume-url-input" name="resumeUrl" value="${profile.resumeUrl || ""}" placeholder="例如：/uploads/student/profile/resume.pdf"></label>
          <div class="form-field field-span-2">
            <span>上传附件</span>
            <div class="upload-bar">
              <input id="student-resume-file-input" type="file" accept=".pdf,.png,.jpg,.jpeg,.gif,.svg">
              <button type="button" class="btn ghost-btn" id="upload-student-resume-btn">上传 PDF / 图片</button>
              <a class="btn ghost-btn" id="preview-student-resume-link" href="${profile.resumeUrl || "#"}" target="_blank" rel="noreferrer">打开当前附件</a>
            </div>
          </div>
          <div class="field-span-2" id="student-resume-preview-area">${renderAttachmentPreview(profile.resumeUrl)}</div>
          <label class="form-field field-span-2"><span>个人介绍</span><textarea name="intro" placeholder="建议描述项目经历、技能方向和目标岗位。">${profile.intro || ""}</textarea></label>
        </div>
        <div class="page-action-bar top-gap">
          <div class="page-action-note">这些字段会用于岗位匹配、申请展示和校友筛选，建议尽量填写完整。</div>
          <div class="action-group">
            <button type="button" class="btn ghost-btn" id="cancel-student-profile">取消</button>
            <button type="submit" class="btn">保存资料</button>
          </div>
        </div>
      </form>
      <div id="student-profile-result" class="action-result">保存后不会离开当前页面。</div>
    `,
    onReady(body) {
      const resumeUrlInput = body.querySelector("#student-resume-url-input");
      const previewResumeLink = body.querySelector("#preview-student-resume-link");
      const resumePreviewArea = body.querySelector("#student-resume-preview-area");
      const resultNode = body.querySelector("#student-profile-result");
      const syncAttachmentPreview = (url) => {
        const safeUrl = sanitizeAttachmentUrl(url);
        previewResumeLink.href = safeUrl || "#";
        previewResumeLink.classList.toggle("is-disabled", !safeUrl);
        resumePreviewArea.innerHTML = renderAttachmentPreview(safeUrl);
      };
      body.querySelector("#cancel-student-profile").addEventListener("click", closePageModal);
      resumeUrlInput.addEventListener("input", () => syncAttachmentPreview(resumeUrlInput.value.trim()));
      body.querySelector("#upload-student-resume-btn").addEventListener("click", async () => {
        const file = body.querySelector("#student-resume-file-input").files?.[0];
        if (!file) {
          resultNode.innerText = "请先选择一个 PDF 或图片文件。";
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
        }
      });
      body.querySelector("#student-profile-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const payload = formPayload(event.target);
        await apiRequest("/referral/student-info/update", {
          method: "PUT",
          body: JSON.stringify(payload)
        });
        resultNode.innerText = "资料更新成功。";
        await onSaved();
        setTimeout(() => closePageModal(), 500);
      });
    }
  });
}

function openAlumniProfileEditor(profile, onSaved) {
  openPageModal({
    title: "编辑校友资料",
    subtitle: "校友档案会用于岗位发布、企业关联和学生咨询时的身份展示。",
    size: "wide",
    body: `
      <form class="demo-form" id="alumni-profile-form">
        <input type="hidden" name="id" value="${profile.id || ""}">
        <div class="form-grid">
          <label class="form-field"><span>姓名</span><input name="realName" value="${profile.realName || ""}" placeholder="例如：张学长"></label>
          <label class="form-field"><span>毕业年份</span><input name="graduationYear" value="${profile.graduationYear || ""}" placeholder="例如：2021"></label>
          <label class="form-field"><span>学院</span><input name="college" value="${profile.college || ""}" placeholder="例如：计算机学院"></label>
          <label class="form-field"><span>专业</span><input name="major" value="${profile.major || ""}" placeholder="例如：软件工程"></label>
          <label class="form-field"><span>企业 ID</span><input name="companyId" value="${profile.companyId || ""}" placeholder="例如：3001"></label>
          <label class="form-field"><span>企业名称</span><input name="companyName" value="${profile.companyName || ""}" placeholder="例如：腾讯"></label>
          <label class="form-field"><span>行业</span><input name="industry" value="${profile.industry || ""}" placeholder="例如：互联网"></label>
          <label class="form-field"><span>岗位名称</span><input name="positionName" value="${profile.positionName || ""}" placeholder="例如：后端开发工程师"></label>
          <label class="form-field"><span>所在城市</span><input name="city" value="${profile.city || ""}" placeholder="例如：上海"></label>
          <label class="form-field"><span>内推权限</span><select name="referralPermission"><option value="1" ${Number(profile.referralPermission || 1) === 1 ? "selected" : ""}>启用</option><option value="0" ${Number(profile.referralPermission || 1) === 0 ? "selected" : ""}>停用</option></select></label>
          <label class="form-field field-span-2"><span>个人介绍</span><textarea name="intro" placeholder="说明自己的行业背景、可提供的帮助以及擅长对接的岗位方向。">${profile.intro || ""}</textarea></label>
        </div>
        <div class="page-action-bar top-gap">
          <div class="page-action-note">保存后会同步影响岗位发布页、消息页和学生端看到的校友展示信息。</div>
          <div class="action-group">
            <button type="button" class="btn ghost-btn" id="cancel-alumni-profile">取消</button>
            <button type="submit" class="btn">保存资料</button>
          </div>
        </div>
      </form>
      <div id="alumni-profile-result" class="action-result">校友资料更新后会立即刷新当前卡片。</div>
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
        resultNode.innerText = "校友资料已更新。";
        await onSaved();
        setTimeout(() => closePageModal(), 500);
      });
    }
  });
}

function renderStudentProfile(profile, session) {
  renderAppLayout("profile", "我的资料", "完善求职意向、技能标签和简历附件，便于校友快速判断是否适合内推。", `
    <section class="content-grid">
      <div class="panel">
        <div class="page-action-bar">
          <div>
            <strong>${profile.realName || session.displayName}</strong>
            <div class="page-action-note">${profile.college || "学院待补"} / ${profile.major || "专业待补"}</div>
          </div>
          <div class="action-group">
            <button class="btn" id="edit-student-profile-btn">编辑资料</button>
          </div>
        </div>
        <div class="compact-list">
          <div class="compact-item"><strong>目标岗位</strong><div class="job-card-company">${profile.expectedJob || "待填写"} / ${profile.expectedCity || "城市未设置"}</div></div>
          <div class="compact-item"><strong>技能标签</strong><p>${profile.skillTags || "建议补充用于匹配的核心技能标签。"}</p></div>
          <div class="compact-item"><strong>个人介绍</strong><p>${profile.intro || "建议补充项目经历、求职方向和岗位偏好。"}</p></div>
        </div>
      </div>
      <div class="panel floating-panel">
        <div class="section-eyebrow">预览</div>
        <div class="panel-header"><div><h2>附件预览</h2><p>PDF 和图片文件都可以直接在这里预览。</p></div></div>
        <div class="compact-list">
          <div class="compact-item"><strong>当前附件</strong><div class="job-card-company">${renderAttachmentLink(profile.resumeUrl, "查看附件")}</div></div>
        </div>
        <div id="resume-preview-area" class="top-gap">${renderAttachmentPreview(profile.resumeUrl)}</div>
      </div>
    </section>
  `);

  document.getElementById("edit-student-profile-btn").addEventListener("click", () => {
    openStudentProfileEditor(profile, session, async () => location.reload());
  });
}

function renderAlumniProfile(profile) {
  renderAppLayout("profile", "我的资料", "完善校友档案、内推权限和岗位背景信息。", `
    <section class="content-grid">
      <div class="panel">
        <div class="page-action-bar">
          <div>
            <strong>${profile.realName || "校友"}</strong>
            <div class="page-action-note">${profile.companyName || "企业待补"} / ${profile.positionName || "岗位待补"}</div>
          </div>
          <div class="action-group">
            <button class="btn" id="edit-alumni-profile-btn">编辑资料</button>
          </div>
        </div>
        <div class="compact-list">
          <div class="compact-item"><strong>毕业信息</strong><div class="job-card-company">${profile.college || "学院待补"} / ${profile.major || "专业待补"} / ${profile.graduationYear || "毕业年份待补"}</div></div>
          <div class="compact-item"><strong>所在城市</strong><div class="job-card-company">${profile.city || "城市待补"}</div></div>
          <div class="compact-item"><strong>内推权限</strong><div class="job-card-company">${Number(profile.referralPermission || 1) === 1 ? "已启用" : "已停用"}</div></div>
          <div class="compact-item"><strong>个人介绍</strong><p>${profile.intro || "建议补充行业背景、岗位方向和可以提供的帮助。"}</p></div>
        </div>
      </div>
      <div class="panel floating-panel">
        <div class="section-eyebrow">说明</div>
        <div class="panel-header"><div><h2>使用方式</h2><p>校友资料会联动岗位发布页、学生咨询页和申请处理页。</p></div></div>
        <div class="compact-list">
          <div class="compact-item"><strong>岗位发布</strong><p>系统会自动把当前登录校友绑定到新岗位上。</p></div>
          <div class="compact-item"><strong>消息对接</strong><p>学生围绕已投递岗位咨询时，会自动匹配到当前校友账号。</p></div>
          <div class="compact-item"><strong>审核治理</strong><p>后台管理员只负责治理与核验，不再替校友操作这些资料。</p></div>
        </div>
      </div>
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
