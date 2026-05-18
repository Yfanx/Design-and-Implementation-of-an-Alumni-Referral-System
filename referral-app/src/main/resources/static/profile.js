async function loadProfile(session) {
  const url = session.role === "ALUMNI"
    ? `/referral/alumni-info/get?id=${session.profileId}`
    : `/referral/student-info/get?id=${session.profileId}`;
  const result = await apiRequest(url);
  return result.data || {};
}

let profilePreviewAlignScheduled = false;
let profilePreviewAlignObserver = null;
let profilePreviewAlignResizeBound = false;

function syncProfilePreviewPanelHeight() {
  const rail = document.querySelector(".profile-reference-rail");
  const panel = document.querySelector(".profile-preview-panel");
  if (!rail || !panel) {
    return;
  }
  if (window.innerWidth <= 1100) {
    panel.style.height = "";
    panel.style.minHeight = "";
    return;
  }
  const railHeight = Math.ceil(rail.getBoundingClientRect().height);
  if (railHeight <= 0) {
    return;
  }
  panel.style.height = `${railHeight}px`;
  panel.style.minHeight = `${railHeight}px`;
}

function scheduleProfilePreviewPanelHeightSync() {
  if (profilePreviewAlignScheduled) {
    return;
  }
  profilePreviewAlignScheduled = true;
  requestAnimationFrame(() => {
    profilePreviewAlignScheduled = false;
    syncProfilePreviewPanelHeight();
  });
}

function ensureProfilePreviewPanelHeightSync() {
  scheduleProfilePreviewPanelHeightSync();
  if (!profilePreviewAlignResizeBound) {
    window.addEventListener("resize", scheduleProfilePreviewPanelHeightSync, { passive: true });
    profilePreviewAlignResizeBound = true;
  }
  profilePreviewAlignObserver?.disconnect();
  if (typeof MutationObserver === "undefined") {
    return;
  }
  const rail = document.querySelector(".profile-reference-rail");
  if (!rail) {
    return;
  }
  profilePreviewAlignObserver = new MutationObserver(() => {
    scheduleProfilePreviewPanelHeightSync();
  });
  profilePreviewAlignObserver.observe(rail, { childList: true, subtree: true, attributes: true });
}

function splitTags(value) {
  return String(value || "")
    .split(/[,，、/\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function profileInitial(value, fallback = "我") {
  return String(value || fallback).trim().slice(0, 1) || fallback;
}

function compactValue(value, fallback = "待补充") {
  return value == null || value === "" ? fallback : value;
}

function renderInfoRows(rows) {
  return rows.map((row) => `
    <div class="compact-item">
      <strong>${escapeHtml(row.label)}</strong>
      <p>${escapeHtml(compactValue(row.value, "-"))}</p>
    </div>
  `).join("");
}

function renderTagCloud(tags) {
  return tags.length
    ? tags.map((tag) => `<span class="keyword-pill">${escapeHtml(tag)}</span>`).join("")
    : `<div class="empty-state">暂无标签</div>`;
}

function renderStatCards(items) {
  return items.map((item) => `
    <div class="profile-stat-card">
      <strong>${escapeHtml(item.value)}</strong>
      <span>${escapeHtml(item.label)}</span>
    </div>
  `).join("");
}

function renderAccountRows(rows) {
  return rows.map((row) => `
    <div class="profile-account-row">
      <span>${escapeHtml(row.label)}</span>
      <strong>${escapeHtml(compactValue(row.value, "-"))}</strong>
    </div>
  `).join("");
}

function renderPillCards(items) {
  return items.map((item) => `
    <div class="profile-pill-card">
      <span>${escapeHtml(item.label)}</span>
      <strong>${escapeHtml(compactValue(item.value))}</strong>
      ${item.desc ? `<p>${escapeHtml(item.desc)}</p>` : ""}
    </div>
  `).join("");
}

function completionRate(fields) {
  const total = fields.length || 1;
  const filled = fields.filter((item) => String(item || "").trim()).length;
  return Math.round(filled / total * 100);
}

function renderHeroMetricPills(items) {
  return items.map((item) => `
    <div class="profile-hero-metric">
      <span>${escapeHtml(item.label)}</span>
      <strong>${escapeHtml(compactValue(item.value))}</strong>
    </div>
  `).join("");
}

function studentProfileForm(profile, session) {
  return `
    <form id="student-profile-form" class="demo-form">
      <input type="hidden" name="id" value="${profile.id || session.profileId}">
      <input type="hidden" id="student-resume-url-input" name="resumeUrl" value="${escapeHtml(profile.resumeUrl || "")}">
      <div class="form-grid">
        <label class="form-field"><span>姓名</span><input name="realName" value="${escapeHtml(profile.realName || "")}"></label>
        <label class="form-field">
          <span>性别</span>
          <select name="gender">
            <option value="1" ${Number(profile.gender || 1) === 1 ? "selected" : ""}>男</option>
            <option value="2" ${Number(profile.gender || 1) === 2 ? "selected" : ""}>女</option>
          </select>
        </label>
        <label class="form-field"><span>学号</span><input name="studentNo" value="${escapeHtml(profile.studentNo || "")}"></label>
        <label class="form-field"><span>年级</span><input name="grade" value="${escapeHtml(profile.grade || "")}"></label>
        <label class="form-field"><span>学院</span><input name="college" value="${escapeHtml(profile.college || "")}"></label>
        <label class="form-field"><span>专业</span><input name="major" value="${escapeHtml(profile.major || "")}"></label>
        <label class="form-field"><span>学历</span><input name="education" value="${escapeHtml(profile.education || "")}"></label>
        <label class="form-field"><span>期望行业</span><input name="expectedIndustry" value="${escapeHtml(profile.expectedIndustry || "")}"></label>
        <label class="form-field"><span>期望岗位</span><input name="expectedJob" value="${escapeHtml(profile.expectedJob || "")}"></label>
        <label class="form-field"><span>期望城市</span><input name="expectedCity" value="${escapeHtml(profile.expectedCity || "")}"></label>
        <label class="form-field field-span-2"><span>技能标签</span><input name="skillTags" value="${escapeHtml(profile.skillTags || "")}" placeholder="例如：Java, Spring Boot, 数据分析"></label>
        <div class="form-field field-span-2">
          <span>简历附件</span>
          <div class="upload-bar">
            <input id="student-resume-file-input" class="upload-input-hidden" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp">
            <button type="button" class="btn ghost-btn" id="upload-student-resume-btn">上传附件</button>
          </div>
        </div>
        <label class="form-field field-span-2"><span>个人介绍</span><textarea name="intro">${escapeHtml(profile.intro || "")}</textarea></label>
      </div>
      <div class="page-action-bar top-gap">
        <div id="student-profile-result" class="action-result">准备保存</div>
        <div class="action-group">
          <button type="button" class="btn ghost-btn" id="cancel-student-profile">取消</button>
          <button type="submit" class="btn">保存资料</button>
        </div>
      </div>
    </form>
  `;
}

function alumniProfileForm(profile) {
  return `
    <form id="alumni-profile-form" class="demo-form">
      <input type="hidden" name="id" value="${profile.id || ""}">
      <div class="form-grid">
        <label class="form-field"><span>姓名</span><input name="realName" value="${escapeHtml(profile.realName || "")}"></label>
        <label class="form-field"><span>毕业年份</span><input name="graduationYear" value="${escapeHtml(profile.graduationYear || "")}"></label>
        <label class="form-field"><span>学院</span><input name="college" value="${escapeHtml(profile.college || "")}"></label>
        <label class="form-field"><span>专业</span><input name="major" value="${escapeHtml(profile.major || "")}"></label>
        <label class="form-field"><span>企业 ID</span><input name="companyId" value="${escapeHtml(profile.companyId || "")}"></label>
        <label class="form-field"><span>企业名称</span><input name="companyName" value="${escapeHtml(profile.companyName || "")}"></label>
        <label class="form-field"><span>行业</span><input name="industry" value="${escapeHtml(profile.industry || "")}"></label>
        <label class="form-field"><span>岗位</span><input name="positionName" value="${escapeHtml(profile.positionName || "")}"></label>
        <label class="form-field"><span>所在城市</span><input name="city" value="${escapeHtml(profile.city || "")}"></label>
        <label class="form-field">
          <span>内推权限</span>
          <select name="referralPermission">
            <option value="1" ${Number(profile.referralPermission || 1) === 1 ? "selected" : ""}>启用</option>
            <option value="0" ${Number(profile.referralPermission || 1) === 0 ? "selected" : ""}>停用</option>
          </select>
        </label>
        <label class="form-field field-span-2"><span>个人介绍</span><textarea name="intro">${escapeHtml(profile.intro || "")}</textarea></label>
      </div>
      <div class="page-action-bar top-gap">
        <div id="alumni-profile-result" class="action-result">准备保存</div>
        <div class="action-group">
          <button type="button" class="btn ghost-btn" id="cancel-alumni-profile">取消</button>
          <button type="submit" class="btn">保存资料</button>
        </div>
      </div>
    </form>
  `;
}

function openStudentProfileEditor(profile, session) {
  openPageModal({
    title: "编辑我的资料",
    size: "wide",
    body: studentProfileForm(profile, session),
    onReady(body) {
      const resultNode = body.querySelector("#student-profile-result");
      const resumeUrlInput = body.querySelector("#student-resume-url-input");
      const fileInput = body.querySelector("#student-resume-file-input");

      body.querySelector("#cancel-student-profile")?.addEventListener("click", closePageModal);
      body.querySelector("#upload-student-resume-btn")?.addEventListener("click", () => fileInput.click());
      fileInput.addEventListener("change", async () => {
        const file = fileInput.files?.[0];
        if (!file) {
          return;
        }
        try {
          resultNode.innerText = "正在上传附件...";
          const uploaded = await uploadReferralFile(file, "student/profile");
          resumeUrlInput.value = uploaded.url || "";
          resultNode.innerText = `附件上传成功：${uploaded.originalFileName || file.name}`;
        } catch (error) {
          resultNode.innerText = error.message || "附件上传失败";
        } finally {
          fileInput.value = "";
        }
      });

      body.querySelector("#student-profile-form")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        try {
          resultNode.innerText = "正在保存...";
          const payload = formPayload(event.target);
          await apiRequest("/referral/student-info/update", {
            method: "PUT",
            body: JSON.stringify(payload)
          });
          resultNode.innerText = "资料已保存";
          setTimeout(() => location.reload(), 400);
        } catch (error) {
          resultNode.innerText = error.message || "保存失败";
        }
      });
    }
  });
}

function openAlumniProfileEditor(profile) {
  openPageModal({
    title: "编辑我的资料",
    size: "wide",
    body: alumniProfileForm(profile),
    onReady(body) {
      const resultNode = body.querySelector("#alumni-profile-result");
      body.querySelector("#cancel-alumni-profile")?.addEventListener("click", closePageModal);
      body.querySelector("#alumni-profile-form")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        try {
          resultNode.innerText = "正在保存...";
          const payload = formPayload(event.target);
          payload.gender = profile.gender;
          payload.verifyStatus = profile.verifyStatus;
          await apiRequest("/referral/alumni-info/update", {
            method: "PUT",
            body: JSON.stringify(payload)
          });
          resultNode.innerText = "资料已保存";
          setTimeout(() => location.reload(), 400);
        } catch (error) {
          resultNode.innerText = error.message || "保存失败";
        }
      });
    }
  });
}

function renderStudentProfile(profile, session) {
  const skills = splitTags(profile.skillTags);
  const completion = completionRate([
    profile.realName,
    profile.studentNo,
    profile.grade,
    profile.college,
    profile.major,
    profile.education,
    profile.expectedIndustry,
    profile.expectedJob,
    profile.expectedCity,
    profile.skillTags,
    profile.intro,
    profile.resumeUrl
  ]);
  const stats = [
    { label: "资料完整度", value: `${completion}%` },
    { label: "技能标签", value: `${skills.length} 项` },
    { label: "简历状态", value: sanitizeAttachmentUrl(profile.resumeUrl) ? "已上传" : "待补充" },
    { label: "目标城市", value: compactValue(profile.expectedCity) }
  ];
  const baseRows = [
    { label: "姓名", value: profile.realName || session.displayName },
    { label: "学号", value: profile.studentNo },
    { label: "年级", value: profile.grade },
    { label: "学院", value: profile.college },
    { label: "专业", value: profile.major },
    { label: "学历", value: profile.education }
  ];
  const accountRows = [
    { label: "当前身份", value: "学生" },
    { label: "登录账号", value: session.username },
    { label: "档案 ID", value: session.profileId },
    { label: "简历附件", value: sanitizeAttachmentUrl(profile.resumeUrl) ? "可预览" : "未上传" }
  ];

  renderAppLayout("profile", "我的资料", "", `
    <section class="profile-studio-shell">
      <section class="profile-hero-card reveal">
        <div class="profile-hero-main">
          <span class="section-eyebrow">学生档案</span>
          <h2>${escapeHtml(profile.realName || session.displayName)}</h2>
          <p>${escapeHtml(compactValue(profile.college, "学院待补充"))} / ${escapeHtml(compactValue(profile.major, "专业待补充"))} / ${escapeHtml(compactValue(profile.education, "学历待补充"))}</p>
          <div class="profile-hero-tags">
            <span class="profile-chip">${escapeHtml(compactValue(profile.expectedJob, "目标岗位待补充"))}</span>
            <span class="profile-chip">${escapeHtml(compactValue(profile.expectedCity, "目标城市待补充"))}</span>
            <span class="profile-chip is-muted">${escapeHtml(compactValue(profile.expectedIndustry, "目标行业待补充"))}</span>
          </div>
        </div>
        <div class="profile-hero-side">
          <div class="profile-avatar-block">
            <div class="profile-avatar-disc">${escapeHtml(profileInitial(profile.realName || session.displayName))}</div>
            <div class="profile-summary-copy">
              <strong>${escapeHtml(profile.realName || session.displayName)}</strong>
              <span>${sanitizeAttachmentUrl(profile.resumeUrl) ? "简历已上传，可直接预览" : "建议补充简历附件，方便校友快速判断"}</span>
            </div>
          </div>
          <div class="profile-hero-actions">
            <button class="btn" id="edit-profile-btn">编辑资料</button>
            <div class="profile-side-meta">资料完整度 ${completion}%</div>
          </div>
        </div>
      </section>

      <section class="profile-stats-row reveal reveal-delay-1">
        ${renderStatCards(stats)}
      </section>

      <section class="profile-studio-grid reveal reveal-delay-2">
        <div class="profile-studio-main">
          <section class="panel">
            <div class="panel-header">
              <div>
                <h2>核心信息</h2>
                <p>用统一字段展示学校、专业与基础身份，方便校友快速浏览。</p>
              </div>
            </div>
            <div class="profile-info-grid">${renderInfoRows(baseRows)}</div>
          </section>

          <section class="panel">
            <div class="panel-header">
              <div>
                <h2>求职意向</h2>
                <p>把岗位、城市和行业偏好集中展示，减少来回确认。</p>
              </div>
            </div>
            <div class="profile-pill-grid">
              ${renderPillCards([
                { label: "目标岗位", value: profile.expectedJob, desc: "建议写到具体方向，例如后端开发、数据分析。" },
                { label: "目标城市", value: profile.expectedCity, desc: "优先展示最希望投递的城市。" },
                { label: "目标行业", value: profile.expectedIndustry, desc: "行业越明确，校友越容易匹配岗位。" }
              ])}
            </div>
          </section>

          <section class="panel profile-copy-panel">
            <div class="panel-header">
              <div>
                <h2>个人介绍</h2>
                <p>这是校友判断你是否适合继续推进的第一段摘要。</p>
              </div>
            </div>
            <div class="profile-tone-note">
              ${escapeHtml(compactValue(profile.intro, "暂未填写个人介绍，建议补充项目经历、实习经历和当前求职重点。"))}
            </div>
          </section>
        </div>

        <aside class="profile-studio-side profile-insight-stack">
          <section class="panel profile-sticky-panel">
            <div class="panel-header">
              <div>
                <h2>档案洞察</h2>
                <p>右侧固定显示，便于快速查看当前资料状态。</p>
              </div>
            </div>
            <div class="compact-list">
              <div class="compact-item"><strong>${completion}%</strong><p>整体完整度</p></div>
              <div class="compact-item"><strong>${sanitizeAttachmentUrl(profile.resumeUrl) ? "已就绪" : "需补充"}</strong><p>附件状态</p></div>
              <div class="compact-item"><strong>${skills.length ? `${skills.length} 项` : "暂无"}</strong><p>技能覆盖</p></div>
            </div>
          </section>

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
                <h2>简历附件</h2>
                <p>支持图片与 PDF 站内预览。</p>
              </div>
            </div>
            <div class="document-actions-inline">${renderAttachmentLink(profile.resumeUrl, "查看附件")}</div>
            <div class="attachment-stage top-gap">${renderAttachmentPreview(profile.resumeUrl)}</div>
          </section>

          <section class="panel">
            <div class="panel-header">
              <div>
                <h2>账户状态</h2>
              </div>
            </div>
            <div class="profile-account-list">${renderAccountRows(accountRows)}</div>
          </section>
        </aside>
      </section>
    </section>
  `);

  document.getElementById("edit-profile-btn")?.addEventListener("click", () => openStudentProfileEditor(profile, session));
}

function renderAlumniProfile(profile, session) {
  const completion = completionRate([
    profile.realName,
    profile.graduationYear,
    profile.college,
    profile.major,
    profile.companyId,
    profile.companyName,
    profile.industry,
    profile.positionName,
    profile.city,
    profile.intro
  ]);
  const stats = [
    { label: "资料完整度", value: `${completion}%` },
    { label: "内推权限", value: Number(profile.referralPermission || 1) === 1 ? "已启用" : "已停用" },
    { label: "所在企业", value: compactValue(profile.companyName) },
    { label: "所在城市", value: compactValue(profile.city) }
  ];
  const baseRows = [
    { label: "姓名", value: profile.realName },
    { label: "毕业年份", value: profile.graduationYear },
    { label: "学院", value: profile.college },
    { label: "专业", value: profile.major },
    { label: "企业 ID", value: profile.companyId },
    { label: "所在城市", value: profile.city }
  ];
  const accountRows = [
    { label: "当前身份", value: "校友" },
    { label: "登录账号", value: session.username },
    { label: "档案 ID", value: session.profileId },
    { label: "内推权限", value: Number(profile.referralPermission || 1) === 1 ? "启用中" : "已停用" }
  ];

  renderAppLayout("profile", "我的资料", "", `
    <section class="profile-studio-shell">
      <section class="profile-hero-card reveal">
        <div class="profile-hero-main">
          <span class="section-eyebrow">校友档案</span>
          <h2>${escapeHtml(compactValue(profile.realName, "校友"))}</h2>
          <p>${escapeHtml(compactValue(profile.companyName, "企业待补充"))} / ${escapeHtml(compactValue(profile.positionName, "岗位待补充"))} / ${escapeHtml(compactValue(profile.city, "城市待补充"))}</p>
          <div class="profile-hero-tags">
            <span class="profile-chip">${escapeHtml(compactValue(profile.industry, "行业待补充"))}</span>
            <span class="profile-chip">${Number(profile.referralPermission || 1) === 1 ? "内推权限已启用" : "内推权限已停用"}</span>
            <span class="profile-chip is-muted">${escapeHtml(compactValue(profile.graduationYear, "毕业年份待补充"))}</span>
          </div>
        </div>
        <div class="profile-hero-side">
          <div class="profile-avatar-block">
            <div class="profile-avatar-disc">${escapeHtml(profileInitial(profile.realName, "校"))}</div>
            <div class="profile-summary-copy">
              <strong>${escapeHtml(compactValue(profile.companyName, "企业信息待完善"))}</strong>
              <span>${escapeHtml(compactValue(profile.positionName, "建议补充当前岗位与负责方向"))}</span>
            </div>
          </div>
          <div class="profile-hero-actions">
            <button class="btn" id="edit-profile-btn">编辑资料</button>
            <div class="profile-side-meta">资料完整度 ${completion}%</div>
          </div>
        </div>
      </section>

      <section class="profile-stats-row reveal reveal-delay-1">
        ${renderStatCards(stats)}
      </section>

      <section class="profile-studio-grid reveal reveal-delay-2">
        <div class="profile-studio-main">
          <section class="panel">
            <div class="panel-header">
              <div>
                <h2>核心信息</h2>
                <p>集中展示毕业背景与当前职业身份，减少系统内信息割裂。</p>
              </div>
            </div>
            <div class="profile-info-grid">${renderInfoRows(baseRows)}</div>
          </section>

          <section class="panel">
            <div class="panel-header">
              <div>
                <h2>内推身份</h2>
                <p>把企业、岗位和权限状态收敛在一组卡片中。</p>
              </div>
            </div>
            <div class="profile-pill-grid">
              ${renderPillCards([
                { label: "所在企业", value: profile.companyName, desc: `企业 ID：${compactValue(profile.companyId, "未绑定")}` },
                { label: "负责岗位", value: profile.positionName, desc: "建议补充你最常处理的岗位类型。" },
                { label: "权限状态", value: Number(profile.referralPermission || 1) === 1 ? "已启用" : "已停用", desc: "停用后学生仍可查看历史信息，但不会继续推进。" }
              ])}
            </div>
          </section>

          <section class="panel profile-copy-panel">
            <div class="panel-header">
              <div>
                <h2>个人介绍</h2>
                <p>建议说明你的业务方向、可帮助的岗位范围和沟通偏好。</p>
              </div>
            </div>
            <div class="profile-tone-note">
              ${escapeHtml(compactValue(profile.intro, "暂未填写个人介绍，建议补充所在团队、负责方向和适合对接的岗位类型。"))}
            </div>
          </section>
        </div>

        <aside class="profile-studio-side profile-insight-stack">
          <section class="panel profile-sticky-panel">
            <div class="panel-header">
              <div>
                <h2>处理状态</h2>
                <p>右侧固定展示关键开关和当前工作身份。</p>
              </div>
            </div>
            <div class="compact-list">
              <div class="compact-item"><strong>${Number(profile.referralPermission || 1) === 1 ? "启用中" : "已停用"}</strong><p>内推权限</p></div>
              <div class="compact-item"><strong>${escapeHtml(compactValue(profile.city))}</strong><p>所在城市</p></div>
              <div class="compact-item"><strong>${escapeHtml(compactValue(profile.industry))}</strong><p>行业方向</p></div>
            </div>
          </section>

          <section class="panel">
            <div class="panel-header">
              <div>
                <h2>工作概览</h2>
              </div>
            </div>
            <div class="profile-account-list">
              ${renderAccountRows([
                { label: "企业名称", value: profile.companyName },
                { label: "岗位名称", value: profile.positionName },
                { label: "毕业年份", value: profile.graduationYear },
                { label: "学院专业", value: `${compactValue(profile.college, "-")} / ${compactValue(profile.major, "-")}` }
              ])}
            </div>
          </section>

          <section class="panel">
            <div class="panel-header">
              <div>
                <h2>账户状态</h2>
              </div>
            </div>
            <div class="profile-account-list">${renderAccountRows(accountRows)}</div>
          </section>
        </aside>
      </section>
    </section>
  `);

  document.getElementById("edit-profile-btn")?.addEventListener("click", () => openAlumniProfileEditor(profile));
}

function renderStudentProfileV2(profile, session) {
  const skills = splitTags(profile.skillTags);
  const hasResume = Boolean(sanitizeAttachmentUrl(profile.resumeUrl));
  const completion = completionRate([
    profile.realName,
    profile.studentNo,
    profile.grade,
    profile.college,
    profile.major,
    profile.education,
    profile.expectedIndustry,
    profile.expectedJob,
    profile.expectedCity,
    profile.skillTags,
    profile.intro,
    profile.resumeUrl
  ]);
  const name = compactValue(profile.realName || session.displayName, "学生");
  const intro = compactValue(
    profile.intro,
    "暂未填写个人介绍，建议补充项目经历、实习经历以及当前最希望获得的内推方向。"
  );
  const stats = [
    { label: "资料完整度", value: `${completion}%` },
    { label: "技能标签", value: `${skills.length} 项` },
    { label: "简历状态", value: hasResume ? "已上传" : "待补充" },
    { label: "目标城市", value: compactValue(profile.expectedCity) }
  ];
  const baseRows = [
    { label: "姓名", value: name },
    { label: "学号", value: profile.studentNo },
    { label: "年级", value: profile.grade },
    { label: "学院", value: profile.college },
    { label: "专业", value: profile.major },
    { label: "学历", value: profile.education }
  ];
  const accountRows = [
    { label: "当前身份", value: "学生" },
    { label: "登录账号", value: session.username },
    { label: "档案 ID", value: session.profileId },
    { label: "简历附件", value: hasResume ? "可预览" : "未上传" }
  ];

  renderAppLayout("profile", "我的资料", "", `
    <section class="profile-studio-shell">
      <section class="profile-hero-card reveal">
        <div class="profile-hero-main">
          <span class="section-eyebrow">学生档案</span>
          <h2>${escapeHtml(name)}</h2>
          <p>${escapeHtml(compactValue(profile.college, "学院待补充"))} / ${escapeHtml(compactValue(profile.major, "专业待补充"))} / ${escapeHtml(compactValue(profile.education, "学历待补充"))}</p>
          <div class="profile-hero-tags">
            <span class="profile-chip">${escapeHtml(compactValue(profile.expectedJob, "目标岗位待补充"))}</span>
            <span class="profile-chip">${escapeHtml(compactValue(profile.expectedCity, "目标城市待补充"))}</span>
            <span class="profile-chip is-muted">${escapeHtml(compactValue(profile.expectedIndustry, "目标行业待补充"))}</span>
          </div>
          <div class="profile-hero-intro">${escapeHtml(intro)}</div>
        </div>
        <div class="profile-hero-aside">
          <section class="profile-summary-card">
            <span class="profile-card-kicker">求职摘要</span>
            <div class="profile-avatar-inline">
              <div class="profile-avatar-disc">${escapeHtml(profileInitial(name, "我"))}</div>
              <div class="profile-summary-copy">
                <strong>${escapeHtml(name)}</strong>
                <span>${hasResume ? "简历已上传，校友可以直接查看附件。" : "建议补充简历附件，方便校友快速判断匹配度。"}</span>
              </div>
            </div>
            <div class="profile-brief-grid">
              <div class="profile-brief-row"><span>求职方向</span><strong>${escapeHtml(compactValue(profile.expectedJob))}</strong></div>
              <div class="profile-brief-row"><span>目标城市</span><strong>${escapeHtml(compactValue(profile.expectedCity))}</strong></div>
              <div class="profile-brief-row"><span>目标行业</span><strong>${escapeHtml(compactValue(profile.expectedIndustry))}</strong></div>
            </div>
          </section>
          <section class="profile-action-card">
            <span class="profile-card-kicker">资料操作</span>
            <button class="btn" id="edit-profile-btn">编辑资料</button>
            <p>优先保持目标岗位、技能标签和简历附件同步更新，方便后续投递与沟通。</p>
          </section>
          <div class="profile-hero-metrics">
            ${renderHeroMetricPills([
              { label: "完整度", value: `${completion}%` },
              { label: "标签覆盖", value: skills.length ? `${skills.length} 项` : "待补充" },
              { label: "附件状态", value: hasResume ? "已就绪" : "未上传" }
            ])}
          </div>
        </div>
      </section>

      <section class="profile-stats-row reveal reveal-delay-1">
        ${renderStatCards(stats)}
      </section>

      <section class="profile-studio-grid reveal reveal-delay-2">
        <div class="profile-studio-main">
          <section class="panel">
            <div class="panel-header">
              <div>
                <h2>基础信息</h2>
                <p>统一展示学校背景与当前身份，减少校友二次确认的成本。</p>
              </div>
            </div>
            <div class="profile-info-grid">${renderInfoRows(baseRows)}</div>
          </section>

          <section class="panel">
            <div class="panel-header">
              <div>
                <h2>求职偏好</h2>
                <p>把岗位、城市和行业偏好放在同一个阅读区块，便于快速比对匹配度。</p>
              </div>
            </div>
            <div class="profile-pill-grid">
              ${renderPillCards([
                { label: "目标岗位", value: profile.expectedJob, desc: "建议写到具体岗位方向，例如 Java 后端、数据分析、测试开发。" },
                { label: "目标城市", value: profile.expectedCity, desc: "优先填写最希望投递的城市，方便校友判断是否适合继续推进。" },
                { label: "目标行业", value: profile.expectedIndustry, desc: "行业越明确，岗位检索与内推匹配会越稳定。" }
              ])}
            </div>
          </section>

          <section class="panel profile-copy-panel">
            <div class="panel-header">
              <div>
                <h2>个人介绍</h2>
                <p>这里直接影响校友对你项目经历、实习经历和当前能力重点的第一判断。</p>
              </div>
            </div>
            <div class="profile-tone-note">${escapeHtml(intro)}</div>
          </section>

          <section class="panel">
            <div class="panel-header">
              <div>
                <h2>技能标签</h2>
                <p>标签集中展示，不再放在固定侧栏里，阅读节奏更自然。</p>
              </div>
            </div>
            <div class="profile-skill-cloud">${renderTagCloud(skills)}</div>
          </section>
        </div>

        <aside class="profile-studio-side">
          <section class="panel">
            <div class="panel-header">
              <div>
                <h2>简历附件</h2>
                <p>支持图片与 PDF 站内预览，可直接确认上传结果。</p>
              </div>
            </div>
            <div class="document-actions-inline">${renderAttachmentLink(profile.resumeUrl, "查看附件")}</div>
            <div class="attachment-stage top-gap">${renderAttachmentPreview(profile.resumeUrl)}</div>
          </section>

          <section class="panel">
            <div class="panel-header">
              <div>
                <h2>投递准备</h2>
                <p>把影响投递链路的关键项放在一起看，不再单独做固定档案栏。</p>
              </div>
            </div>
            <div class="profile-account-list">
              ${renderAccountRows([
                { label: "资料完整度", value: `${completion}%` },
                { label: "技能标签", value: skills.length ? `${skills.length} 项` : "待补充" },
                { label: "简历状态", value: hasResume ? "已上传" : "待补充" }
              ])}
            </div>
          </section>

          <section class="panel">
            <div class="panel-header">
              <div>
                <h2>账号信息</h2>
              </div>
            </div>
            <div class="profile-account-list">${renderAccountRows(accountRows)}</div>
          </section>
        </aside>
      </section>
    </section>
  `);

  document.getElementById("edit-profile-btn")?.addEventListener("click", () => openStudentProfileEditor(profile, session));
}

function renderAlumniProfileV2(profile, session) {
  const referralEnabled = Number(profile.referralPermission || 1) === 1;
  const completion = completionRate([
    profile.realName,
    profile.graduationYear,
    profile.college,
    profile.major,
    profile.companyId,
    profile.companyName,
    profile.industry,
    profile.positionName,
    profile.city,
    profile.intro
  ]);
  const name = compactValue(profile.realName, "校友");
  const intro = compactValue(
    profile.intro,
    "暂未填写个人介绍，建议补充所在团队、负责方向，以及适合帮助学生对接的岗位范围。"
  );
  const stats = [
    { label: "资料完整度", value: `${completion}%` },
    { label: "内推权限", value: referralEnabled ? "已启用" : "已停用" },
    { label: "所在企业", value: compactValue(profile.companyName) },
    { label: "所在城市", value: compactValue(profile.city) }
  ];
  const baseRows = [
    { label: "姓名", value: name },
    { label: "毕业年份", value: profile.graduationYear },
    { label: "学院", value: profile.college },
    { label: "专业", value: profile.major },
    { label: "企业 ID", value: profile.companyId },
    { label: "所在城市", value: profile.city }
  ];
  const accountRows = [
    { label: "当前身份", value: "校友" },
    { label: "登录账号", value: session.username },
    { label: "档案 ID", value: session.profileId },
    { label: "内推权限", value: referralEnabled ? "启用中" : "已停用" }
  ];

  renderAppLayout("profile", "我的资料", "", `
    <section class="profile-studio-shell">
      <section class="profile-hero-card reveal">
        <div class="profile-hero-main">
          <span class="section-eyebrow">校友档案</span>
          <h2>${escapeHtml(name)}</h2>
          <p>${escapeHtml(compactValue(profile.companyName, "企业待补充"))} / ${escapeHtml(compactValue(profile.positionName, "岗位待补充"))} / ${escapeHtml(compactValue(profile.city, "城市待补充"))}</p>
          <div class="profile-hero-tags">
            <span class="profile-chip">${escapeHtml(compactValue(profile.industry, "行业待补充"))}</span>
            <span class="profile-chip">${referralEnabled ? "内推权限已启用" : "内推权限已停用"}</span>
            <span class="profile-chip is-muted">${escapeHtml(compactValue(profile.graduationYear, "毕业年份待补充"))}</span>
          </div>
          <div class="profile-hero-intro">${escapeHtml(intro)}</div>
        </div>
        <div class="profile-hero-aside">
          <section class="profile-summary-card">
            <span class="profile-card-kicker">企业摘要</span>
            <div class="profile-avatar-inline">
              <div class="profile-avatar-disc">${escapeHtml(profileInitial(name, "校"))}</div>
              <div class="profile-summary-copy">
                <strong>${escapeHtml(compactValue(profile.companyName, "企业信息待补充"))}</strong>
                <span>${escapeHtml(compactValue(profile.positionName, "建议补充当前岗位与负责方向，方便学生判断是否适合咨询。"))}</span>
              </div>
            </div>
            <div class="profile-brief-grid">
              <div class="profile-brief-row"><span>当前岗位</span><strong>${escapeHtml(compactValue(profile.positionName))}</strong></div>
              <div class="profile-brief-row"><span>所在行业</span><strong>${escapeHtml(compactValue(profile.industry))}</strong></div>
              <div class="profile-brief-row"><span>内推权限</span><strong>${referralEnabled ? "启用中" : "已停用"}</strong></div>
            </div>
          </section>
          <section class="profile-action-card">
            <span class="profile-card-kicker">对接状态</span>
            <button class="btn" id="edit-profile-btn">编辑资料</button>
            <p>优先保持企业、岗位和权限状态同步，避免学生在消息咨询或投递时产生误判。</p>
          </section>
          <div class="profile-hero-metrics">
            ${renderHeroMetricPills([
              { label: "完整度", value: `${completion}%` },
              { label: "城市", value: compactValue(profile.city) },
              { label: "权限", value: referralEnabled ? "启用" : "停用" }
            ])}
          </div>
        </div>
      </section>

      <section class="profile-stats-row reveal reveal-delay-1">
        ${renderStatCards(stats)}
      </section>

      <section class="profile-studio-grid reveal reveal-delay-2">
        <div class="profile-studio-main">
          <section class="panel">
            <div class="panel-header">
              <div>
                <h2>基础信息</h2>
                <p>用一组统一字段说明毕业背景与当前工作身份，避免资料割裂。</p>
              </div>
            </div>
            <div class="profile-info-grid">${renderInfoRows(baseRows)}</div>
          </section>

          <section class="panel">
            <div class="panel-header">
              <div>
                <h2>内推身份</h2>
                <p>把企业、岗位和权限状态合并在一个阅读区域，方便快速浏览。</p>
              </div>
            </div>
            <div class="profile-pill-grid">
              ${renderPillCards([
                { label: "所在企业", value: profile.companyName, desc: `企业 ID：${compactValue(profile.companyId, "未绑定")}` },
                { label: "负责岗位", value: profile.positionName, desc: "建议补充你最常处理或最熟悉的岗位类型。" },
                { label: "权限状态", value: referralEnabled ? "已启用" : "已停用", desc: "停用后学生仍可查看历史信息，但不会继续推进新的内推动作。" }
              ])}
            </div>
          </section>

          <section class="panel profile-copy-panel">
            <div class="panel-header">
              <div>
                <h2>个人介绍</h2>
                <p>建议说明你的业务方向、能帮助的岗位范围，以及偏好的沟通方式。</p>
              </div>
            </div>
            <div class="profile-tone-note">${escapeHtml(intro)}</div>
          </section>
        </div>

        <aside class="profile-studio-side">
          <section class="panel">
            <div class="panel-header">
              <div>
                <h2>协作状态</h2>
                <p>集中查看当前对接过程中最关键的身份与权限信息。</p>
              </div>
            </div>
            <div class="profile-account-list">
              ${renderAccountRows([
                { label: "内推权限", value: referralEnabled ? "启用中" : "已停用" },
                { label: "所在行业", value: profile.industry },
                { label: "所在城市", value: profile.city }
              ])}
            </div>
          </section>

          <section class="panel">
            <div class="panel-header">
              <div>
                <h2>工作信息</h2>
              </div>
            </div>
            <div class="profile-account-list">
              ${renderAccountRows([
                { label: "企业名称", value: profile.companyName },
                { label: "岗位名称", value: profile.positionName },
                { label: "毕业年份", value: profile.graduationYear },
                { label: "学院 / 专业", value: `${compactValue(profile.college, "-")} / ${compactValue(profile.major, "-")}` }
              ])}
            </div>
          </section>

          <section class="panel">
            <div class="panel-header">
              <div>
                <h2>账号信息</h2>
              </div>
            </div>
            <div class="profile-account-list">${renderAccountRows(accountRows)}</div>
          </section>
        </aside>
      </section>
    </section>
  `);

  document.getElementById("edit-profile-btn")?.addEventListener("click", () => openAlumniProfileEditor(profile));
}

function profileSectionIcon(iconType) {
  const icons = {
    user: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a4.1 4.1 0 1 0 0-8.2 4.1 4.1 0 0 0 0 8.2Z"/><path d="M4.8 20.2c1.3-3 4-4.7 7.2-4.7s5.9 1.7 7.2 4.7"/></svg>',
    briefcase: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 7V5.8A1.8 1.8 0 0 1 9.8 4h4.4A1.8 1.8 0 0 1 16 5.8V7"/><path d="M4 8.5h16v8.7A1.8 1.8 0 0 1 18.2 19H5.8A1.8 1.8 0 0 1 4 17.2Z"/><path d="M4 11.4h16"/></svg>',
    tag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 13.5 13.5 20 4 10.5V4h6.5L20 13.5Z"/><circle cx="8.5" cy="8.5" r="1.2"/></svg>',
    file: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3.8h6.8L19.5 8v12.2H8A1.8 1.8 0 0 1 6.2 18.4V5.6A1.8 1.8 0 0 1 8 3.8Z"/><path d="M14.8 3.8v4.4h4.7"/><path d="M9.8 12h6.4"/><path d="M9.8 15.4h6.4"/></svg>',
    chart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19.2V12"/><path d="M11.5 19.2V8"/><path d="M18 19.2V5"/><path d="M3.8 19.2h16.4"/></svg>',
    location: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.3s6-5.4 6-10.2a6 6 0 1 0-12 0c0 4.8 6 10.2 6 10.2Z"/><circle cx="12" cy="10.1" r="2.2"/></svg>',
    shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.8 18.8 6v5.3c0 4.1-2.6 7.1-6.8 8.9-4.2-1.8-6.8-4.8-6.8-8.9V6L12 3.8Z"/><path d="m9.5 11.9 1.7 1.7 3.4-3.7"/></svg>',
    spark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3.8 1.9 5.3 5.3 1.9-5.3 1.9-1.9 5.3-1.9-5.3-5.3-1.9 5.3-1.9L12 3.8Z"/></svg>',
    clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.2"/><path d="M12 7.8v4.5l2.9 1.8"/></svg>'
  };
  return `<span class="profile-section-icon profile-section-icon-${iconType}">${icons[iconType] || icons.user}</span>`;
}

function profileBrandMark(role, name) {
  const initial = escapeHtml(profileInitial(name, role === "ALUMNI" ? "校" : "我"));
  return `<div class="profile-brand-mark ${role === "ALUMNI" ? "is-alumni" : "is-student"}">${initial}</div>`;
}

function formatProfileDate(value) {
  const text = String(value || "").trim();
  if (!text) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }
  return text.slice(0, 10);
}

function buildStudentResumePreview(profile, session) {
  const name = compactValue(profile.realName || session.displayName, "学生");
  const education = `${compactValue(profile.college, "学院待补充")} · ${compactValue(profile.major, "专业待补充")} · ${compactValue(profile.education, "学历待补充")}`;
  const expectedJob = compactValue(profile.expectedJob, "目标岗位待补充");
  const city = compactValue(profile.expectedCity, "目标城市待补充");
  const contactLine = `${session.username}@email.com`;
  const skills = splitTags(profile.skillTags).slice(0, 6);
  const intro = compactValue(profile.intro, "建议补充项目经历、实习经历和当前最希望获取的内推方向。");
  const summaryLines = [
    `熟悉 ${skills[0] || "Java"}、${skills[1] || "Spring Boot"} 等技术栈，具备扎实的工程实现能力。`,
    `求职方向聚焦 ${expectedJob}，希望在 ${city} 获得更高匹配度的岗位机会。`,
    intro
  ];

  return `
    <div class="profile-resume-document">
      <header class="profile-resume-head">
        <div>
          <h3>${escapeHtml(name)}</h3>
          <strong>${escapeHtml(expectedJob)}</strong>
        </div>
        <span>${escapeHtml(city)}</span>
      </header>
      <div class="profile-resume-contact">
        <span>${escapeHtml(education)}</span>
        <span>${escapeHtml(contactLine)}</span>
        <span>${escapeHtml(city)}</span>
      </div>
      <section class="profile-resume-section">
        <h4>教育背景</h4>
        <div class="profile-resume-row">
          <strong>${escapeHtml(education)}</strong>
          <span>${escapeHtml(compactValue(profile.grade, "在读"))}</span>
        </div>
        <p>目标行业：${escapeHtml(compactValue(profile.expectedIndustry, "暂未填写"))}</p>
      </section>
      <section class="profile-resume-section">
        <h4>专业技能</h4>
        <ul>
          ${summaryLines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}
        </ul>
      </section>
      <section class="profile-resume-section">
        <h4>技能标签</h4>
        <div class="profile-resume-chip-row">
          ${(skills.length ? skills : ["Java", "Spring Boot", "项目协作"]).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
        </div>
      </section>
      <section class="profile-resume-section">
        <h4>个人评价</h4>
        <p>${escapeHtml(intro)}</p>
      </section>
    </div>
  `;
}

function buildAlumniResumePreview(profile, session) {
  const name = compactValue(profile.realName, "校友");
  const company = compactValue(profile.companyName, "企业待补充");
  const position = compactValue(profile.positionName, "岗位待补充");
  const city = compactValue(profile.city, "城市待补充");
  const intro = compactValue(profile.intro, "建议补充所在团队、帮助范围以及适合对接的岗位方向。");

  return `
    <div class="profile-resume-document profile-resume-document-alumni">
      <header class="profile-resume-head">
        <div>
          <h3>${escapeHtml(name)}</h3>
          <strong>${escapeHtml(position)}</strong>
        </div>
        <span>${escapeHtml(city)}</span>
      </header>
      <div class="profile-resume-contact">
        <span>${escapeHtml(company)}</span>
        <span>${escapeHtml(session.username)}</span>
        <span>${escapeHtml(compactValue(profile.industry, "行业待补充"))}</span>
      </div>
      <section class="profile-resume-section">
        <h4>工作背景</h4>
        <div class="profile-resume-row">
          <strong>${escapeHtml(company)}</strong>
          <span>${escapeHtml(compactValue(profile.graduationYear, "毕业年份待补充"))}</span>
        </div>
        <p>${escapeHtml(compactValue(profile.college, "学院待补充"))} / ${escapeHtml(compactValue(profile.major, "专业待补充"))}</p>
      </section>
      <section class="profile-resume-section">
        <h4>可对接方向</h4>
        <ul>
          <li>当前负责 ${escapeHtml(position)} 相关岗位，对接信息更聚焦。</li>
          <li>所在城市为 ${escapeHtml(city)}，适合本地与远程机会筛选。</li>
          <li>${escapeHtml(intro)}</li>
        </ul>
      </section>
      <section class="profile-resume-section">
        <h4>协作提示</h4>
        <p>${Number(profile.referralPermission || 1) === 1 ? "当前内推权限已启用，可继续承接学生咨询与申请。" : "当前内推权限已停用，建议恢复前先检查企业与岗位信息。"} </p>
      </section>
    </div>
  `;
}

function renderProfileHeaderMeta(profile, role) {
  const recentDate = role === "ALUMNI"
    ? formatProfileDate(profile.updateTime || profile.gmtModified || profile.gmtCreate || profile.createTime)
    : formatProfileDate(profile.updateTime || profile.gmtModified || profile.gmtCreate || profile.createTime);
  return `
    <div class="profile-header-meta">
      ${profileSectionIcon("clock")}
      <span>最近更新: ${escapeHtml(recentDate)}</span>
    </div>
  `;
}

function renderProfileSummaryTiles(items) {
  return items.map((item) => `
    <div class="profile-summary-tile">
      <div class="profile-summary-tile-icon tone-${item.tone || "blue"}">${profileSectionIcon(item.icon)}</div>
      <div class="profile-summary-tile-copy">
        <strong>${escapeHtml(item.value)}</strong>
        <span>${escapeHtml(item.label)}</span>
        ${item.meta ? `<small>${escapeHtml(item.meta)}</small>` : ""}
      </div>
    </div>
  `).join("");
}

function renderProfileInfoTable(rows) {
  return rows.map((row) => `
    <div class="profile-info-table-row">
      <span>${escapeHtml(row.label)}</span>
      <strong>${escapeHtml(compactValue(row.value, "-"))}</strong>
    </div>
  `).join("");
}

function renderProfileActionChips(items) {
  return items.map((item) => `
    <span class="profile-action-chip">${profileSectionIcon(item.icon)}${escapeHtml(item.label)}</span>
  `).join("");
}

function renderProfileActionButton(label, icon, attributes = "") {
  return `<button class="btn ghost-btn profile-action-btn" type="button" ${attributes}>${profileSectionIcon(icon)}<span>${escapeHtml(label)}</span></button>`;
}

function profileResumeFileLabel(url) {
  const safeUrl = sanitizeAttachmentUrl(url);
  if (!safeUrl) {
    return "暂无附件";
  }
  const lower = safeUrl.toLowerCase();
  if (lower.endsWith(".docx")) {
    return "Word (.docx)";
  }
  if (lower.endsWith(".doc")) {
    return "Word (.doc)";
  }
  if (lower.endsWith(".pdf")) {
    return "PDF";
  }
  if (lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".webp")) {
    return "图片附件";
  }
  return "站内附件";
}

function renderStudentProfileV3(profile, session) {
  const skills = splitTags(profile.skillTags);
  const hasResume = Boolean(sanitizeAttachmentUrl(profile.resumeUrl));
  const completion = completionRate([
    profile.realName,
    profile.studentNo,
    profile.grade,
    profile.college,
    profile.major,
    profile.education,
    profile.expectedIndustry,
    profile.expectedJob,
    profile.expectedCity,
    profile.skillTags,
    profile.intro,
    profile.resumeUrl
  ]);
  const name = compactValue(profile.realName || session.displayName, "学生");
  const resumeLink = sanitizeAttachmentUrl(profile.resumeUrl);
  const fileLabel = profileResumeFileLabel(profile.resumeUrl);

  renderAppLayout("profile", "我的资料", "", `
    <section class="profile-reference-shell">
      <section class="panel profile-reference-head reveal">
        <div>
          <span class="section-eyebrow">学生工作台</span>
          <h2>我的资料</h2>
          <p>岗位浏览与投递</p>
        </div>
        ${renderProfileHeaderMeta(profile, session.role)}
      </section>

      <section class="profile-reference-top reveal reveal-delay-1">
        <section class="profile-identity-card">
          <div class="profile-identity-main">
            ${profileBrandMark(session.role, name)}
            <div class="profile-identity-copy">
              <h3>${escapeHtml(name)}</h3>
              <p>${escapeHtml(compactValue(profile.college, "学院待补充"))} / ${escapeHtml(compactValue(profile.major, "专业待补充"))} / ${escapeHtml(compactValue(profile.education, "学历待补充"))}</p>
              <div class="profile-identity-tags">
                <span>${escapeHtml(compactValue(profile.expectedJob, "目标岗位待补充"))}</span>
                <span>${escapeHtml(compactValue(profile.expectedCity, "目标城市待补充"))}</span>
                <span>${escapeHtml(compactValue(profile.expectedIndustry, "目标行业待补充"))}</span>
              </div>
            </div>
            <button class="btn ghost-btn profile-identity-edit" id="edit-profile-btn">编辑资料</button>
          </div>
          <div class="profile-identity-progress">
            <div class="profile-identity-progress-bar"><i style="width:${completion}%"></i></div>
            <span>资料完整度 ${completion}%</span>
          </div>
        </section>

        <div class="profile-summary-tile-grid">
          ${renderProfileSummaryTiles([
            { icon: "shield", label: "资料完整度", value: `${completion}%`, meta: "资料完整度", tone: "green" },
            { icon: "tag", label: "技能标签", value: `${skills.length} 项`, meta: "技能标签", tone: "violet" },
            { icon: "file", label: "简历状态", value: hasResume ? "已上传" : "待补充", meta: "简历状态", tone: "blue" },
            { icon: "location", label: "目标城市", value: compactValue(profile.expectedCity), meta: "目标城市", tone: "amber" }
          ])}
        </div>

        <section class="profile-status-card">
          <div class="profile-card-title">${profileSectionIcon("chart")}账户状态</div>
          <div class="profile-info-table">
            ${renderProfileInfoTable([
              { label: "当前身份", value: "学生" },
              { label: "登录账号", value: session.username },
              { label: "档案 ID", value: session.profileId },
              { label: "简历附件", value: hasResume ? "可预览" : "未上传" }
            ])}
          </div>
        </section>
      </section>

      <section class="profile-reference-grid reveal reveal-delay-2">
        <aside class="profile-reference-rail">
          <section class="panel profile-side-card-v3">
            <div class="profile-card-title">${profileSectionIcon("user")}核心信息</div>
            <p class="profile-card-desc">用于简历推荐、内推匹配与身份确认。</p>
            <div class="profile-info-table">
              ${renderProfileInfoTable([
                { label: "姓名", value: name },
                { label: "学号", value: profile.studentNo },
                { label: "年级", value: profile.grade },
                { label: "学院", value: profile.college },
                { label: "资料完整度", value: `${completion}%` },
                { label: "已投递", value: "0 家" }
              ])}
            </div>
          </section>

          <section class="panel profile-side-card-v3">
            <div class="profile-card-title">${profileSectionIcon("briefcase")}求职意向</div>
            <p class="profile-card-desc">明确方向，提升岗位匹配效率。</p>
            <div class="profile-info-table">
              ${renderProfileInfoTable([
                { label: "意向岗位", value: profile.expectedJob },
                { label: "目标城市", value: profile.expectedCity },
                { label: "目标行业", value: profile.expectedIndustry },
                { label: "期望类型", value: "全职" },
                { label: "可到岗时间", value: "随时到岗" },
                { label: "预期薪资", value: "面议" }
              ])}
            </div>
          </section>

          <section class="panel profile-side-card-v3">
            <div class="profile-card-title">${profileSectionIcon("tag")}技能标签</div>
            <p class="profile-card-desc">系统识别我的岗位匹配，越精准越好。</p>
            <div class="profile-skill-cloud profile-skill-cloud-v3">
              ${(skills.length ? skills : ["Java", "Spring", "Spring Boot", "MySQL", "Redis", "Git"]).map((item) => `<span class="keyword-pill">${escapeHtml(item)}</span>`).join("")}
            </div>
            <button class="btn ghost-btn profile-chip-action" type="button" id="edit-profile-skill-btn">补充标签</button>
          </section>

          <section class="panel profile-side-card-v3">
            <div class="profile-card-title">${profileSectionIcon("spark")}档案洞察</div>
            <p class="profile-card-desc">多维度了解简历状态与竞争力。</p>
            <div class="profile-info-table">
              ${renderProfileInfoTable([
                { label: "简历状态", value: hasResume ? "已上传" : "待补充" },
                { label: "上传时间", value: formatProfileDate(profile.updateTime || profile.gmtModified || profile.createTime) + " 10:30" },
                { label: "文件类型", value: hasResume ? "站内附件" : "未上传" },
                { label: "预览状态", value: hasResume ? "可预览" : "不可预览" },
                { label: "隐私设置", value: "企业可见" }
              ])}
            </div>
            <button class="btn ghost-btn profile-chip-action" type="button" id="profile-upload-resume-btn">重新上传简历</button>
          </section>

          <section class="panel profile-side-card-v3">
            <div class="profile-card-title">${profileSectionIcon("file")}个人介绍</div>
            <p class="profile-card-desc">这里展示关于你的更多信息。</p>
            <div class="profile-side-intro">${escapeHtml(compactValue(profile.intro, "热爱技术，乐于学习和解决问题，建议补充项目经历、实习经历和求职重点。"))}</div>
            <button class="btn ghost-btn profile-chip-action" type="button" id="edit-profile-intro-btn">编辑介绍</button>
          </section>
        </aside>

        <section class="panel profile-preview-panel">
          <div class="panel-header">
            <div>
              <h2>简历附件 / 预览</h2>
              <p>当前简历可直接预览、下载或分享，用于投递与内推。</p>
            </div>
            <div class="profile-preview-head-side">
              <span class="profile-file-pill">${fileLabel}</span>
              <button class="profile-kebab-btn" type="button" aria-label="更多操作">···</button>
            </div>
          </div>
          <div class="profile-file-chip-row">
            ${renderProfileActionChips([
              { icon: "shield", label: `状态：${hasResume ? "已上传" : "未上传"}` },
              { icon: "file", label: `文件：${fileLabel}` },
              { icon: "clock", label: `上传时间：${formatProfileDate(profile.updateTime || profile.gmtModified || profile.createTime)} 10:30` },
              { icon: "spark", label: `预览：${hasResume ? "可预览" : "不可预览"}` }
            ])}
          </div>
          <div class="profile-file-actions">
            ${resumeLink ? `<a class="btn ghost-btn profile-action-btn" href="${buildAttachmentOpenUrl(profile.resumeUrl)}" target="_blank" rel="noreferrer">${profileSectionIcon("spark")}<span>查看附件</span></a>` : `<button class="btn ghost-btn profile-action-btn" type="button" disabled>${profileSectionIcon("spark")}<span>查看附件</span></button>`}
            ${resumeLink ? `<a class="btn ghost-btn profile-action-btn" href="${escapeHtml(resumeLink)}" target="_blank" rel="noreferrer">${profileSectionIcon("file")}<span>下载简历</span></a>` : `<button class="btn ghost-btn profile-action-btn" type="button" disabled>${profileSectionIcon("file")}<span>下载简历</span></button>`}
            ${renderProfileActionButton("复制账号", "tag", 'id="profile-copy-username-btn"')}
            ${renderProfileActionButton("打印预览", "briefcase", 'id="profile-print-preview-btn"')}
          </div>
          <div class="profile-preview-stage">
            ${renderAttachmentPreview(profile.resumeUrl)}
          </div>
        </section>
      </section>
    </section>
  `, { hideDefaultHero: true });

  const openEdit = () => openStudentProfileEditor(profile, session);
  document.getElementById("edit-profile-btn")?.addEventListener("click", openEdit);
  document.getElementById("edit-profile-skill-btn")?.addEventListener("click", openEdit);
  document.getElementById("edit-profile-intro-btn")?.addEventListener("click", openEdit);
  document.getElementById("profile-upload-resume-btn")?.addEventListener("click", openEdit);
  document.getElementById("profile-copy-username-btn")?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(session.username || "");
      if (typeof showToast === "function") {
        showToast("账号已复制");
      }
    } catch (error) {
      console.warn(error);
    }
  });
  document.getElementById("profile-print-preview-btn")?.addEventListener("click", () => window.print());
  ensureProfilePreviewPanelHeightSync();
}

function renderAlumniProfileV3(profile, session) {
  const referralEnabled = Number(profile.referralPermission || 1) === 1;
  const completion = completionRate([
    profile.realName,
    profile.graduationYear,
    profile.college,
    profile.major,
    profile.companyId,
    profile.companyName,
    profile.industry,
    profile.positionName,
    profile.city,
    profile.intro
  ]);
  const name = compactValue(profile.realName, "校友");

  renderAppLayout("profile", "我的资料", "", `
    <section class="profile-reference-shell">
      <section class="panel profile-reference-head reveal">
        <div>
          <span class="section-eyebrow">校友工作台</span>
          <h2>我的资料</h2>
          <p>岗位维护与学生协作</p>
        </div>
        ${renderProfileHeaderMeta(profile, session.role)}
      </section>

      <section class="profile-reference-top reveal reveal-delay-1">
        <section class="profile-identity-card profile-identity-card-alumni">
          <div class="profile-identity-main">
            ${profileBrandMark(session.role, name)}
            <div class="profile-identity-copy">
              <h3>${escapeHtml(name)}</h3>
              <p>${escapeHtml(compactValue(profile.companyName, "企业待补充"))} / ${escapeHtml(compactValue(profile.positionName, "岗位待补充"))} / ${escapeHtml(compactValue(profile.city, "城市待补充"))}</p>
              <div class="profile-identity-tags">
                <span>${escapeHtml(compactValue(profile.industry, "行业待补充"))}</span>
                <span>${referralEnabled ? "内推权限已启用" : "内推权限已停用"}</span>
                <span>${escapeHtml(compactValue(profile.graduationYear, "毕业年份待补充"))}</span>
              </div>
            </div>
            <button class="btn ghost-btn profile-identity-edit" id="edit-profile-btn">编辑资料</button>
          </div>
          <div class="profile-identity-progress">
            <div class="profile-identity-progress-bar"><i style="width:${completion}%"></i></div>
            <span>资料完整度 ${completion}%</span>
          </div>
        </section>

        <div class="profile-summary-tile-grid">
          ${renderProfileSummaryTiles([
            { icon: "shield", label: "资料完整度", value: `${completion}%`, meta: "资料完整度", tone: "green" },
            { icon: "briefcase", label: "所在企业", value: compactValue(profile.companyName), meta: "所在企业", tone: "amber" },
            { icon: "location", label: "所在城市", value: compactValue(profile.city), meta: "所在城市", tone: "blue" },
            { icon: "spark", label: "内推权限", value: referralEnabled ? "启用" : "停用", meta: "内推权限", tone: "violet" }
          ])}
        </div>

        <section class="profile-status-card">
          <div class="profile-card-title">${profileSectionIcon("chart")}账户状态</div>
          <div class="profile-info-table">
            ${renderProfileInfoTable([
              { label: "当前身份", value: "校友" },
              { label: "登录账号", value: session.username },
              { label: "档案 ID", value: session.profileId },
              { label: "权限状态", value: referralEnabled ? "正常" : "停用" }
            ])}
          </div>
        </section>
      </section>

      <section class="profile-reference-grid reveal reveal-delay-2">
        <aside class="profile-reference-rail">
          <section class="panel profile-side-card-v3">
            <div class="profile-card-title">${profileSectionIcon("user")}基础信息</div>
            <p class="profile-card-desc">用于企业身份、岗位归属与毕业背景确认。</p>
            <div class="profile-info-table">
              ${renderProfileInfoTable([
                { label: "姓名", value: name },
                { label: "毕业年份", value: profile.graduationYear },
                { label: "学院", value: profile.college },
                { label: "专业", value: profile.major },
                { label: "企业 ID", value: profile.companyId },
                { label: "所在城市", value: profile.city }
              ])}
            </div>
          </section>

          <section class="panel profile-side-card-v3">
            <div class="profile-card-title">${profileSectionIcon("briefcase")}工作信息</div>
            <p class="profile-card-desc">明确当前企业、岗位与行业，方便学生判断是否适合咨询。</p>
            <div class="profile-info-table">
              ${renderProfileInfoTable([
                { label: "所在企业", value: profile.companyName },
                { label: "岗位名称", value: profile.positionName },
                { label: "所在行业", value: profile.industry },
                { label: "内推权限", value: referralEnabled ? "启用中" : "已停用" }
              ])}
            </div>
          </section>

          <section class="panel profile-side-card-v3">
            <div class="profile-card-title">${profileSectionIcon("spark")}对接提示</div>
            <p class="profile-card-desc">建议保持企业与岗位信息同步，减少学生误判。</p>
            <div class="profile-side-intro">${escapeHtml(compactValue(profile.intro, "建议补充所在团队、负责方向与适合对接的岗位范围。"))}</div>
            <button class="btn ghost-btn profile-chip-action" type="button" id="edit-profile-intro-btn">编辑介绍</button>
          </section>
        </aside>

        <section class="panel profile-preview-panel">
          <div class="panel-header">
            <div>
              <h2>工作档案 / 预览</h2>
              <p>把企业、岗位与协作身份整理成一张可快速浏览的档案页。</p>
            </div>
            <div class="profile-preview-head-side">
              <span class="profile-file-pill">${referralEnabled ? "权限正常" : "权限停用"}</span>
              <button class="profile-kebab-btn" type="button" aria-label="更多操作">···</button>
            </div>
          </div>
          <div class="profile-file-chip-row">
            ${renderProfileActionChips([
              { icon: "briefcase", label: `企业：${compactValue(profile.companyName)}` },
              { icon: "location", label: `城市：${compactValue(profile.city)}` },
              { icon: "shield", label: `权限：${referralEnabled ? "已启用" : "已停用"}` },
              { icon: "clock", label: `更新：${formatProfileDate(profile.updateTime || profile.gmtModified || profile.createTime)}` }
            ])}
          </div>
          <div class="profile-file-actions">
            ${renderProfileActionButton("复制账号", "tag", 'id="profile-copy-username-btn"')}
            ${renderProfileActionButton("打印预览", "briefcase", 'id="profile-print-preview-btn"')}
          </div>
          <div class="profile-preview-stage">
            ${buildAlumniResumePreview(profile, session)}
          </div>
        </section>
      </section>
    </section>
  `, { hideDefaultHero: true });

  const openEdit = () => openAlumniProfileEditor(profile);
  document.getElementById("edit-profile-btn")?.addEventListener("click", openEdit);
  document.getElementById("edit-profile-intro-btn")?.addEventListener("click", openEdit);
  document.getElementById("profile-copy-username-btn")?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(session.username || "");
      if (typeof showToast === "function") {
        showToast("账号已复制");
      }
    } catch (error) {
      console.warn(error);
    }
  });
  document.getElementById("profile-print-preview-btn")?.addEventListener("click", () => window.print());
  ensureProfilePreviewPanelHeightSync();
}

async function bootProfilePage() {
  const session = ensureLogin();
  const profile = await loadProfile(session);
  if (session.role === "ALUMNI") {
    renderAlumniProfileV3(profile, session);
    return;
  }
  renderStudentProfileV3(profile, session);
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    if (typeof globalThis.runPageTask === "function") {
      await globalThis.runPageTask({ pageKey: "profile", title: "我的资料", subtitle: "" }, bootProfilePage);
      return;
    }
    await bootProfilePage();
  } catch (error) {
    console.error(error);
  }
});
