async function loadStudentApplicationContext() {
  const [jobResult, applicationResult] = await Promise.all([
    apiRequest("/referral/job-info/match-list"),
    apiRequest("/referral/referral-application/list")
  ]);
  return {
    jobs: jobResult.data?.list || [],
    applications: applicationResult.data?.list || []
  };
}

async function loadAlumniApplications() {
  const result = await apiRequest("/referral/referral-application/list");
  return result.data?.list || [];
}

function applicationStageText(status) {
  const mapping = {
    0: "待处理",
    1: "沟通中",
    2: "已内推",
    3: "未通过",
    4: "已完成",
    5: "已撤回"
  };
  return mapping[Number(status)] || "处理中";
}

function renderApplicationCard(item, { studentSide = true, showActions = true } = {}) {
  const badge = statusBadge(Number(item.applyStatus));
  const actorLine = studentSide
    ? `${item.companyName || "-"} / ${item.alumniName || "校友"}`
    : `${item.studentName || "-"} / 匹配 ${asNumber(item.matchScore)}%`;

  return `
    <article class="application-record-card">
      <div class="application-record-head">
        <div>
          <strong>${escapeHtml(item.jobTitle || "-")}</strong>
          <div class="job-card-company">${escapeHtml(actorLine)}</div>
        </div>
        <span class="status-badge ${badge.cls}">${badge.text}</span>
      </div>
      <div class="application-meta-grid">
        <div class="application-meta-card"><span>处理阶段</span><strong>${applicationStageText(item.applyStatus)}</strong></div>
        <div class="application-meta-card"><span>匹配度</span><strong>${asNumber(item.matchScore)}%</strong></div>
        <div class="application-meta-card"><span>投递时间</span><strong>${formatDateTime(item.applyTime)}</strong></div>
        <div class="application-meta-card"><span>附件状态</span><strong>${sanitizeAttachmentUrl(item.resumeUrl) ? "已上传" : "未上传"}</strong></div>
      </div>
      <div class="application-note-block">
        <span>处理说明</span>
        <p>${escapeHtml(item.processRemark || (studentSide ? "等待校友处理。" : "等待处理这份申请。"))}</p>
      </div>
      <div class="application-progress-inline">${renderProgressSteps(item.progressSteps || [])}</div>
      <div class="application-note-block subtle">
        <span>${studentSide ? "投递说明" : "学生自述"}</span>
        <p>${escapeHtml(item.selfIntroduction || "未填写。")}</p>
      </div>
      <div class="application-record-actions">
        <div class="document-actions-inline">${renderAttachmentLink(item.resumeUrl, "查看附件")}</div>
        ${showActions ? `
          <div class="action-group">
            <button class="btn ghost-btn detail-application-btn" data-id="${item.id}">详情</button>
            ${studentSide && [0, 1].includes(Number(item.applyStatus)) ? `<button class="btn ghost-btn cancel-application-btn" data-id="${item.id}">撤回</button>` : ""}
            ${!studentSide ? `<button class="btn process-application-btn" data-id="${item.id}">处理</button>` : ""}
          </div>
        ` : ""}
      </div>
    </article>
  `;
}

function renderJobOptions(jobs, currentId) {
  return (jobs || []).map((job) => `
    <option value="${job.id}" ${Number(job.id) === Number(currentId) ? "selected" : ""}>
      ${escapeHtml(job.jobTitle || "-")} / ${escapeHtml(job.companyName || "-")}
    </option>
  `).join("");
}

function openApplicationCreator(session, jobs, currentJobId, existingApplications) {
  const appliedJobIds = new Set(
    (existingApplications || [])
      .filter((item) => Number(item.applyStatus) !== 5)
      .map((item) => Number(item.jobId))
  );

  openPageModal({
    title: "提交申请",
    subtitle: "",
    size: "wide",
    body: `
      <form id="application-create-form" class="demo-form">
        <input type="hidden" name="studentId" value="${session.profileId}">
        <div class="application-form-hero">
          <label class="form-field">
            <span>目标岗位</span>
            <select name="jobId" id="application-job-select" required>
              ${renderJobOptions(jobs, currentJobId)}
            </select>
          </label>
          <div class="application-contact-card">
            <span>当前岗位</span>
            <strong id="application-job-title">-</strong>
          </div>
        </div>
        <div class="form-grid top-gap">
          <label class="form-field field-span-2">
            <span>简历附件地址</span>
            <input name="resumeUrl" id="resume-url-input" placeholder="上传 PDF 或图片后会自动填入">
          </label>
          <label class="form-field field-span-2">
            <span>投递说明</span>
            <textarea name="selfIntroduction" placeholder="补充你的项目经历、求职方向或希望校友重点关注的信息"></textarea>
          </label>
        </div>
        <div class="page-action-bar top-gap">
          <div id="application-create-result" class="action-result">准备提交</div>
          <div class="action-group">
            <label class="btn ghost-btn">
              上传附件
              <input type="file" id="resume-upload-input" class="upload-input-hidden" accept=".pdf,.png,.jpg,.jpeg,.webp">
            </label>
            <button type="button" class="btn ghost-btn" id="cancel-create-application">取消</button>
            <button type="submit" class="btn">提交申请</button>
          </div>
        </div>
      </form>
    `,
    onReady(body) {
      const select = body.querySelector("#application-job-select");
      const title = body.querySelector("#application-job-title");
      const resultNode = body.querySelector("#application-create-result");

      const syncTitle = () => {
        const selected = jobs.find((item) => Number(item.id) === Number(select.value));
        title.textContent = selected?.jobTitle || "-";
      };

      syncTitle();
      select.addEventListener("change", syncTitle);
      body.querySelector("#cancel-create-application")?.addEventListener("click", closePageModal);
      body.querySelector("#resume-upload-input")?.addEventListener("change", async (event) => {
        const file = event.target.files?.[0];
        if (!file) {
          return;
        }
        try {
          resultNode.innerText = "上传中...";
          const uploaded = await uploadReferralFile(file, "resume");
          body.querySelector("#resume-url-input").value = uploaded.url || "";
          resultNode.innerText = `附件上传成功：${uploaded.originalFileName || file.name}`;
        } catch (error) {
          resultNode.innerText = error.message || "附件上传失败";
        }
      });

      body.querySelector("#application-create-form")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const payload = formPayload(event.target);
        if (appliedJobIds.has(Number(payload.jobId))) {
          resultNode.innerText = "该岗位已经投递过了。";
          return;
        }
        try {
          resultNode.innerText = "提交中...";
          await apiRequest("/referral/referral-application/create", {
            method: "POST",
            body: JSON.stringify(payload)
          });
          resultNode.innerText = "提交成功";
          setTimeout(() => { location.href = "/applications.html"; }, 500);
        } catch (error) {
          resultNode.innerText = error.message || "提交失败";
        }
      });
    }
  });
}

function openApplicationDetail(item, studentSide) {
  openPageModal({
    title: "申请详情",
    subtitle: "",
    size: "wide",
    body: `
      ${renderApplicationCard(item, { studentSide, showActions: false })}
      <div id="application-detail-radar" class="chart-surface modal-radar top-gap"></div>
    `,
    onReady() {
      renderRadarChart("application-detail-radar", item.matchBreakdown || [], "五维匹配");
    }
  });
}

function bindStudentApplicationActions(applications) {
  document.querySelectorAll(".detail-application-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const item = applications.find((application) => Number(application.id) === Number(button.dataset.id));
      if (item) {
        openApplicationDetail(item, true);
      }
    });
  });

  document.querySelectorAll(".cancel-application-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      await apiRequest(`/referral/referral-application/cancel?id=${button.dataset.id}`, { method: "POST" });
      location.reload();
    });
  });
}

function renderStudentApplications(session, jobs, applications) {
  const query = new URLSearchParams(location.search);
  const currentJobId = query.get("jobId") || jobs[0]?.id || "";
  const myApplications = (applications || [])
    .filter((item) => Number(item.studentId) === Number(session.profileId))
    .sort((left, right) => String(right.applyTime || "").localeCompare(String(left.applyTime || "")));

  renderAppLayout("applications", "我的申请", "", `
    <section class="application-shell">
      <section class="panel application-hero">
        <div class="application-hero-copy">
          <span class="section-eyebrow">申请记录</span>
          <h2>跟踪每一次投递的处理进度</h2>
        </div>
        <div class="application-hero-actions">
          <button class="btn" id="open-application-create">提交申请</button>
        </div>
      </section>
      <section class="application-board">
        <div class="application-column-main panel">
          <div class="panel-header"><div><h2>全部申请</h2></div><span class="meta-tag">${myApplications.length} 条</span></div>
          <div class="application-record-list">
            ${myApplications.map((item) => renderApplicationCard(item, { studentSide: true })).join("") || '<div class="empty-state">暂无申请。</div>'}
          </div>
        </div>
        <aside class="application-side-stack">
          <section class="panel application-side-card">
            <div class="panel-header"><div><h2>状态统计</h2></div></div>
            <div class="compact-list">
              <div class="compact-item"><strong>${myApplications.length}</strong><p>全部申请</p></div>
              <div class="compact-item"><strong>${myApplications.filter((item) => [0, 1].includes(Number(item.applyStatus))).length}</strong><p>处理中</p></div>
              <div class="compact-item"><strong>${myApplications.filter((item) => [2, 4].includes(Number(item.applyStatus))).length}</strong><p>已推进</p></div>
            </div>
          </section>
        </aside>
      </section>
    </section>
  `, { hideDefaultHero: true });

  document.getElementById("open-application-create")?.addEventListener("click", () => {
    openApplicationCreator(session, jobs, currentJobId, myApplications);
  });
  if (query.get("jobId")) {
    openApplicationCreator(session, jobs, currentJobId, myApplications);
  }
  bindStudentApplicationActions(myApplications);
}

function openProcessModal(item) {
  openPageModal({
    title: "处理申请",
    subtitle: "",
    body: `
      <form id="process-application-form" class="demo-form">
        <label class="form-field">
          <span>处理状态</span>
          <select name="applyStatus">
            <option value="1" ${Number(item.applyStatus) === 1 ? "selected" : ""}>已查看</option>
            <option value="2" ${Number(item.applyStatus) === 2 ? "selected" : ""}>已内推</option>
            <option value="3" ${Number(item.applyStatus) === 3 ? "selected" : ""}>未通过</option>
            <option value="4" ${Number(item.applyStatus) === 4 ? "selected" : ""}>已完成</option>
          </select>
        </label>
        <label class="form-field">
          <span>处理说明</span>
          <textarea name="processRemark">${escapeHtml(item.processRemark || "")}</textarea>
        </label>
        <div class="page-action-bar top-gap">
          <div id="process-application-result" class="action-result">准备处理</div>
          <div class="action-group">
            <button type="button" class="btn ghost-btn" id="cancel-process-application">取消</button>
            <button type="submit" class="btn">保存</button>
          </div>
        </div>
      </form>
    `,
    onReady(body) {
      body.querySelector("#cancel-process-application")?.addEventListener("click", closePageModal);
      body.querySelector("#process-application-form")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const payload = formPayload(event.target);
        payload.id = item.id;
        const resultNode = body.querySelector("#process-application-result");
        try {
          resultNode.innerText = "保存中...";
          await apiRequest("/referral/referral-application/process", {
            method: "POST",
            body: JSON.stringify(payload)
          });
          resultNode.innerText = "已保存";
          setTimeout(() => location.reload(), 400);
        } catch (error) {
          resultNode.innerText = error.message || "保存失败";
        }
      });
    }
  });
}

function renderAlumniApplications(applications) {
  renderAppLayout("applications", "申请处理", "", `
    <section class="panel">
      <div class="panel-header"><div><h2>学生申请</h2></div><span class="meta-tag">${applications.length} 条</span></div>
      <div class="application-record-list">
        ${applications.map((item) => renderApplicationCard(item, { studentSide: false })).join("") || '<div class="empty-state">暂无申请。</div>'}
      </div>
    </section>
  `);

  document.querySelectorAll(".process-application-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const item = applications.find((application) => Number(application.id) === Number(button.dataset.id));
      if (item) {
        openProcessModal(item);
      }
    });
  });

  document.querySelectorAll(".detail-application-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const item = applications.find((application) => Number(application.id) === Number(button.dataset.id));
      if (item) {
        openApplicationDetail(item, false);
      }
    });
  });
}

function renderApplicationHeroSummary(myApplications) {
  const activeCount = myApplications.filter((item) => [0, 1].includes(Number(item.applyStatus))).length;
  const doneCount = myApplications.filter((item) => [2, 4].includes(Number(item.applyStatus))).length;
  const cancelledCount = myApplications.filter((item) => Number(item.applyStatus) === 5).length;
  const averageMatch = myApplications.length
    ? Math.round(myApplications.reduce((sum, item) => sum + asNumber(item.matchScore), 0) / myApplications.length)
    : 0;

  return `
    <div class="application-overview-grid">
      <div class="application-overview-card">
        ${buildApplicationMiniIcon("attachment")}
        <span>全部申请</span>
        <strong>${myApplications.length}</strong>
      </div>
      <div class="application-overview-card">
        ${buildApplicationMiniIcon("stage")}
        <span>处理中</span>
        <strong>${activeCount}</strong>
      </div>
      <div class="application-overview-card">
        ${buildApplicationMiniIcon("detail")}
        <span>已推进</span>
        <strong>${doneCount}</strong>
      </div>
      <div class="application-overview-card">
        ${buildApplicationMiniIcon(cancelledCount ? "cancel" : "detail")}
        <span>平均匹配度</span>
        <strong>${averageMatch}%</strong>
      </div>
    </div>
  `;
}

function renderStudentApplicationsV2(session, jobs, applications) {
  const query = new URLSearchParams(location.search);
  const currentJobId = query.get("jobId") || jobs[0]?.id || "";
  const myApplications = (applications || [])
    .filter((item) => Number(item.studentId) === Number(session.profileId))
    .sort((left, right) => String(right.applyTime || "").localeCompare(String(left.applyTime || "")));
  const latest = myApplications[0] || null;

  renderAppLayout("applications", "我的申请", "", `
    ${renderWorkspaceEditorialHeader(session, { title: "我的申请", subtitle: "岗位浏览与投递" })}
    <section class="application-shell">
      <section class="panel application-hero application-hero-editorial">
        <div class="application-hero-copy">
          <span class="section-eyebrow">申请记录</span>
          <h2>跟踪每一次投递的处理进度</h2>
          <p>把状态、匹配度、附件和处理说明都收在一个申请时间线里，减少来回切页确认。</p>
          ${renderApplicationHeroSummary(myApplications)}
        </div>
        <div class="application-hero-actions">
          <button class="btn" id="open-application-create">提交申请</button>
          <div class="application-contact-card">
            <span>最近一次投递</span>
            <strong>${escapeHtml(latest?.jobTitle || "暂无申请记录")}</strong>
            <p>${escapeHtml(latest ? `${latest.companyName || "-"} / ${applicationStageText(latest.applyStatus)}` : "可以从职位广场进入新的岗位申请。")}</p>
          </div>
        </div>
      </section>
      <section class="application-board">
        <div class="application-column-main panel">
          <div class="panel-header">
            <div>
              <h2>全部申请</h2>
              <p>按最近投递时间排序，优先处理还在推进中的记录。</p>
            </div>
            <span class="meta-tag">${myApplications.length} 条</span>
          </div>
          <div class="application-record-list">
            ${myApplications.map((item) => renderApplicationCard(item, { studentSide: true })).join("") || '<div class="empty-state">暂无申请。</div>'}
          </div>
        </div>
        <aside class="application-side-stack">
          <section class="panel application-side-card">
            <div class="panel-header">
              <div>
                <h2>状态统计</h2>
                <p>快速查看当前投递池的推进节奏。</p>
              </div>
            </div>
            <div class="compact-list">
              <div class="compact-item"><strong>${myApplications.length}</strong><p>全部申请</p></div>
              <div class="compact-item"><strong>${myApplications.filter((item) => [0, 1].includes(Number(item.applyStatus))).length}</strong><p>处理中</p></div>
              <div class="compact-item"><strong>${myApplications.filter((item) => [2, 4].includes(Number(item.applyStatus))).length}</strong><p>已推进</p></div>
            </div>
          </section>
        </aside>
      </section>
    </section>
  `, { hideDefaultHero: true });

  document.getElementById("open-application-create")?.addEventListener("click", () => {
    openApplicationCreator(session, jobs, currentJobId, myApplications);
  });
  if (query.get("jobId")) {
    openApplicationCreator(session, jobs, currentJobId, myApplications);
  }
  bindStudentApplicationActions(myApplications);
}

function buildApplicationFilterTabsV3(myApplications) {
  const counts = {
    all: myApplications.length,
    active: myApplications.filter((item) => [0, 1].includes(Number(item.applyStatus))).length,
    advanced: myApplications.filter((item) => [2, 4].includes(Number(item.applyStatus))).length,
    cancelled: myApplications.filter((item) => Number(item.applyStatus) === 5).length
  };

  return `
    <div class="application-filter-tabs">
      <button class="application-filter-tab is-active" type="button" data-filter="all">全部</button>
      <button class="application-filter-tab" type="button" data-filter="active">处理中</button>
      <button class="application-filter-tab" type="button" data-filter="advanced">已推进</button>
      <button class="application-filter-tab" type="button" data-filter="cancelled">已撤回</button>
    </div>
    <div class="application-filter-hint">
      <span>全部 ${counts.all}</span>
      <span>处理中 ${counts.active}</span>
      <span>已推进 ${counts.advanced}</span>
      <span>已撤回 ${counts.cancelled}</span>
    </div>
  `;
}

function buildApplicationMiniIcon(type) {
  const icons = {
    detail: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"></path><circle cx="12" cy="12" r="3"></circle></svg>',
    attachment: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4H7.5A1.5 1.5 0 0 0 6 5.5v13A1.5 1.5 0 0 0 7.5 20h9A1.5 1.5 0 0 0 18 18.5V8z"></path><path d="M14 4v4h4"></path></svg>',
    cancel: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12"></path><path d="m18 6-12 12"></path></svg>',
    stage: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h4l2-5 3 10 2-5h1"></path></svg>'
  };
  return `<span class="application-mini-icon application-mini-icon-${type}">${icons[type] || icons.detail}</span>`;
}

function buildApplicationTimelineStepsV3(item) {
  const fallback = item.progressSteps?.length ? item.progressSteps : [
    { title: "已投递", description: "学生已提交申请，等待校友查看。", time: formatDateTime(item.applyTime), state: "done" },
    { title: "校友查看", description: item.processRemark || "等待校友处理。", time: formatDateTime(item.applyTime), state: Number(item.applyStatus) >= 1 ? "done" : "pending" },
    { title: "沟通/推荐中", description: item.processRemark || "等待流程推进。", time: formatDateTime(item.applyTime), state: Number(item.applyStatus) >= 2 ? "done" : (Number(item.applyStatus) === 1 ? "active" : "pending") },
    { title: "结果反馈", description: "等待最终处理结果。", time: formatDateTime(item.applyTime), state: [3, 4, 5].includes(Number(item.applyStatus)) ? "done" : "pending" }
  ];

  return `
    <div class="application-timeline-v3">
      ${fallback.map((step, index) => `
        <div class="application-timeline-step is-${step.state || "pending"}">
          <span class="application-timeline-index">${index + 1}</span>
          <div class="application-timeline-copy">
            <strong>${escapeHtml(step.title || "")}</strong>
            <p>${escapeHtml(step.description || "")}</p>
            ${step.time ? `<span>${escapeHtml(step.time)}</span>` : ""}
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function buildApplicationJourneyCardV3(item) {
  const badge = statusBadge(Number(item.applyStatus));
  return `
    <article class="application-journey-card">
      <div class="application-journey-head">
        <div>
          <h3>${escapeHtml(item.jobTitle || "-")}</h3>
          <p>${escapeHtml(item.companyName || "-")} / ${escapeHtml(item.alumniName || "校友")}</p>
        </div>
        <span class="status-badge ${badge.cls}">${badge.text}</span>
      </div>
      <div class="application-journey-grid">
        <div class="application-journey-track">
          ${buildApplicationTimelineStepsV3(item)}
          <div class="application-journey-links">
            ${sanitizeAttachmentUrl(item.resumeUrl)
              ? `<a class="btn ghost-btn" href="${buildAttachmentOpenUrl(item.resumeUrl)}">${buildApplicationMiniIcon("attachment")}查看附件</a>`
              : ""}
            ${sanitizeAttachmentUrl(item.resumeUrl) ? `<a class="btn ghost-btn" href="${buildAttachmentOpenUrl(item.resumeUrl)}" target="_blank" rel="noreferrer">新窗口打开</a>` : ""}
          </div>
        </div>
        <div class="application-journey-details">
          <div class="application-journey-metrics">
            <div><span>处理阶段</span><strong>${applicationStageText(item.applyStatus)}</strong></div>
            <div><span>匹配度</span><strong>${asNumber(item.matchScore)}%</strong></div>
            <div><span>投递时间</span><strong>${formatDateTime(item.applyTime)}</strong></div>
            <div><span>附件状态</span><strong>${sanitizeAttachmentUrl(item.resumeUrl) ? "已上传" : "未上传"}</strong></div>
          </div>
          <div class="application-journey-note">
            <span>处理说明</span>
            <p>${escapeHtml(item.processRemark || "等待校友处理结果。")}</p>
          </div>
          <div class="application-journey-note subtle">
            <span>投递说明</span>
            <p>${escapeHtml(item.selfIntroduction || "暂无补充说明。")}</p>
          </div>
          <div class="application-journey-actions">
            <button class="btn ghost-btn detail-application-btn" data-id="${item.id}">${buildApplicationMiniIcon("detail")}详情</button>
            ${[0, 1].includes(Number(item.applyStatus)) ? `<button class="btn ghost-btn cancel-application-btn" data-id="${item.id}">${buildApplicationMiniIcon("cancel")}撤回</button>` : ""}
          </div>
        </div>
      </div>
    </article>
  `;
}

function renderApplicationProgressSidebarV3(myApplications) {
  const active = myApplications.filter((item) => [0, 1].includes(Number(item.applyStatus))).length;
  const advanced = myApplications.filter((item) => [2, 4].includes(Number(item.applyStatus))).length;
  const cancelled = myApplications.filter((item) => Number(item.applyStatus) === 5).length;
  const total = Math.max(1, myApplications.length);
  const blue = Math.round(active / total * 360);
  const green = Math.round(advanced / total * 360);
  const red = Math.round(cancelled / total * 360);
  const chart = `conic-gradient(#3b82f6 0deg ${blue}deg, #45b36b ${blue}deg ${blue + green}deg, #ff6b6b ${blue + green}deg ${blue + green + red}deg, #e7edf8 ${blue + green + red}deg 360deg)`;

  return `
    <section class="panel application-side-card">
      <div class="panel-header"><div><h2>状态统计</h2></div></div>
      <div class="application-side-metrics">
        <div class="application-side-metric-card">${buildApplicationMiniIcon("attachment")}<div><span>全部申请</span><strong>${myApplications.length}</strong></div></div>
        <div class="application-side-metric-card">${buildApplicationMiniIcon("stage")}<div><span>处理中</span><strong>${active}</strong></div></div>
        <div class="application-side-metric-card">${buildApplicationMiniIcon("detail")}<div><span>已推进</span><strong>${advanced}</strong></div></div>
        <div class="application-side-metric-card">${buildApplicationMiniIcon("cancel")}<div><span>已撤回</span><strong>${cancelled}</strong></div></div>
      </div>
    </section>
    <section class="panel application-side-card">
      <div class="panel-header"><div><h2>进度分布</h2></div></div>
      <div class="application-side-donut">
        <div class="application-side-ring" style="background:${chart}">
          <div class="application-side-ring-inner"><strong>${myApplications.length}</strong><span>全部申请</span></div>
        </div>
        <div class="application-side-legend">
          <div><i style="background:#3b82f6"></i><span>处理中</span><strong>${active}</strong></div>
          <div><i style="background:#45b36b"></i><span>已推进</span><strong>${advanced}</strong></div>
          <div><i style="background:#ff6b6b"></i><span>已撤回</span><strong>${cancelled}</strong></div>
        </div>
      </div>
    </section>
    <section class="panel application-side-card">
      <div class="panel-header"><div><h2>阶段概览</h2></div></div>
      <div class="compact-list">
        <div class="compact-item">${buildApplicationMiniIcon("stage")}<div><strong>已投递</strong><p>${myApplications.length} 条记录进入申请链路</p></div></div>
        <div class="compact-item">${buildApplicationMiniIcon("stage")}<div><strong>校友查看</strong><p>${myApplications.filter((item) => Number(item.applyStatus) >= 1).length} 条已被查看</p></div></div>
        <div class="compact-item">${buildApplicationMiniIcon("stage")}<div><strong>沟通/推荐中</strong><p>${myApplications.filter((item) => Number(item.applyStatus) >= 1 && Number(item.applyStatus) !== 5).length} 条继续推进</p></div></div>
        <div class="compact-item">${buildApplicationMiniIcon("stage")}<div><strong>结果反馈</strong><p>${myApplications.filter((item) => [3, 4, 5].includes(Number(item.applyStatus))).length} 条已有结果</p></div></div>
      </div>
    </section>
    <section class="panel application-side-card">
      <div class="panel-header"><div><h2>投递建议</h2></div></div>
      <div class="compact-list">
        <div class="compact-item">${buildApplicationMiniIcon("detail")}<div><strong>保持沟通顺畅</strong><p>处理中的申请建议及时跟进校友回复，推动进度。</p></div></div>
        <div class="compact-item">${buildApplicationMiniIcon("attachment")}<div><strong>完善附件材料</strong><p>上传完整简历与作品集，可提升匹配度与通过率。</p></div></div>
        <div class="compact-item">${buildApplicationMiniIcon("stage")}<div><strong>关注内推机会</strong><p>已内推岗位建议继续准备笔试与面试。</p></div></div>
      </div>
    </section>
  `;
}

function renderStudentApplicationsV3(session, jobs, applications) {
  const query = new URLSearchParams(location.search);
  const currentJobId = query.get("jobId") || jobs[0]?.id || "";
  const myApplications = (applications || [])
    .filter((item) => Number(item.studentId) === Number(session.profileId))
    .sort((left, right) => String(right.applyTime || "").localeCompare(String(left.applyTime || "")));
  const latest = myApplications[0] || null;

  renderAppLayout("applications", "我的申请", "", `
    ${renderWorkspaceEditorialHeader(session, { title: "我的申请", subtitle: "岗位浏览与投递" })}
    <section class="application-shell">
      <section class="panel application-hero application-hero-editorial">
        <div class="application-hero-copy">
          <h2>跟踪每一次投递的处理进度</h2>
          <p>实时追踪申请进展，与校友协作，提高求职成功率。</p>
          ${renderApplicationHeroSummary(myApplications)}
        </div>
        <div class="application-hero-actions">
          <button class="btn" id="open-application-create">提交申请</button>
          <div class="application-contact-card">
            <span>最近投递</span>
            <strong>${escapeHtml(latest?.jobTitle || "暂无申请记录")}</strong>
            <p>${escapeHtml(latest ? `${latest.companyName || "-"} / ${applicationStageText(latest.applyStatus)}` : "可以从职位广场继续发起新的申请。")}</p>
          </div>
        </div>
      </section>
      <section class="application-board">
        <div class="application-column-main panel">
          <div class="application-toolbar-v3">
            ${buildApplicationFilterTabsV3(myApplications)}
            <div class="application-toolbar-actions">
              <select id="application-sort-select">
                <option value="time-desc">按投递时间</option>
                <option value="match-desc">按匹配度</option>
              </select>
            </div>
          </div>
          <div id="application-journey-list" class="application-journey-list"></div>
        </div>
        <aside class="application-side-stack">
          ${renderApplicationProgressSidebarV3(myApplications)}
        </aside>
      </section>
      <section class="panel application-banner-tip">
        <strong>小贴士：</strong>
        与校友保持积极沟通，及时补充材料，将更有机会获得内推与面试机会。
      </section>
    </section>
  `, { hideDefaultHero: true });

  const listNode = document.getElementById("application-journey-list");
  const tabs = Array.from(document.querySelectorAll(".application-filter-tab"));
  const sortSelect = document.getElementById("application-sort-select");
  let activeFilter = "all";

  const renderList = () => {
    const sorted = myApplications.slice().sort((left, right) => {
      if (sortSelect?.value === "match-desc") {
        return asNumber(right.matchScore) - asNumber(left.matchScore);
      }
      return String(right.applyTime || "").localeCompare(String(left.applyTime || ""));
    }).filter((item) => {
      if (activeFilter === "active") {
        return [0, 1].includes(Number(item.applyStatus));
      }
      if (activeFilter === "advanced") {
        return [2, 4].includes(Number(item.applyStatus));
      }
      if (activeFilter === "cancelled") {
        return Number(item.applyStatus) === 5;
      }
      return true;
    });

    listNode.innerHTML = sorted.map(buildApplicationJourneyCardV3).join("")
      || '<div class="empty-state">当前筛选条件下暂无申请记录。</div>';
    bindStudentApplicationActions(myApplications);
  };

  tabs.forEach((button) => {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.filter;
      tabs.forEach((item) => item.classList.toggle("is-active", item === button));
      renderList();
    });
  });
  sortSelect?.addEventListener("change", renderList);
  renderList();

  document.getElementById("open-application-create")?.addEventListener("click", () => {
    openApplicationCreator(session, jobs, currentJobId, myApplications);
  });
  if (query.get("jobId")) {
    openApplicationCreator(session, jobs, currentJobId, myApplications);
  }
}

async function bootApplicationsPage() {
  const session = ensureLogin();
  if (session.role === "ALUMNI") {
    renderAlumniApplications(await loadAlumniApplications());
    return;
  }
  const context = await loadStudentApplicationContext();
  renderStudentApplicationsV3(session, context.jobs, context.applications);
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    if (typeof globalThis.runPageTask === "function") {
      await globalThis.runPageTask({ pageKey: "applications", title: "申请", subtitle: "" }, bootApplicationsPage);
      return;
    }
    await bootApplicationsPage();
  } catch (error) {
    console.error(error);
  }
});
function buildApplicationSortControl() {
  return `
    <label class="application-sort-shell" for="application-sort-select">
      <img class="application-sort-icon" src="/alumni-icons/svg/page-applications/applications-sort.svg" alt="" aria-hidden="true" loading="lazy">
      <select id="application-sort-select">
        <option value="time-desc">按投递时间</option>
        <option value="match-desc">按匹配度</option>
      </select>
      <span class="application-sort-chevron" aria-hidden="true"></span>
    </label>
  `;
}

function renderStudentApplicationsV3(session, jobs, applications) {
  const query = new URLSearchParams(location.search);
  const currentJobId = query.get("jobId") || jobs[0]?.id || "";
  const myApplications = (applications || [])
    .filter((item) => Number(item.studentId) === Number(session.profileId))
    .sort((left, right) => String(right.applyTime || "").localeCompare(String(left.applyTime || "")));
  const latest = myApplications[0] || null;

  renderAppLayout("applications", "我的申请", "", `
    ${renderWorkspaceEditorialHeader(session, { title: "我的申请", subtitle: "岗位浏览与投递" })}
    <section class="application-shell">
      <section class="panel application-hero application-hero-editorial">
        <div class="application-hero-copy">
          <h2>跟踪每一次投递的处理进度</h2>
          <p>实时追踪申请进展，与校友协作，提高求职成功率。</p>
          ${renderApplicationHeroSummary(myApplications)}
        </div>
        <div class="application-hero-actions">
          <button class="btn" id="open-application-create">提交申请</button>
          <div class="application-contact-card">
            <span>最近投递</span>
            <strong>${escapeHtml(latest?.jobTitle || "暂无申请记录")}</strong>
            <p>${escapeHtml(latest ? `${latest.companyName || "-"} / ${applicationStageText(latest.applyStatus)}` : "可以从职位广场继续发起新的申请。")}</p>
          </div>
        </div>
      </section>
      <section class="application-board">
        <div class="application-column-main panel">
          <div class="application-toolbar-v3">
            ${buildApplicationFilterTabsV3(myApplications)}
            <div class="application-toolbar-actions">
              ${buildApplicationSortControl()}
            </div>
          </div>
          <div id="application-journey-list" class="application-journey-list"></div>
        </div>
        <aside class="application-side-stack">
          ${renderApplicationProgressSidebarV3(myApplications)}
        </aside>
      </section>
      <section class="panel application-banner-tip">
        <strong>小贴士：</strong>
        与校友保持积极沟通，及时补充材料，将更有机会获得内推与面试机会。
      </section>
    </section>
  `, { hideDefaultHero: true });

  const listNode = document.getElementById("application-journey-list");
  const tabs = Array.from(document.querySelectorAll(".application-filter-tab"));
  const sortSelect = document.getElementById("application-sort-select");
  let activeFilter = "all";

  const renderList = () => {
    const sorted = myApplications.slice().sort((left, right) => {
      if (sortSelect?.value === "match-desc") {
        return asNumber(right.matchScore) - asNumber(left.matchScore);
      }
      return String(right.applyTime || "").localeCompare(String(left.applyTime || ""));
    }).filter((item) => {
      if (activeFilter === "active") {
        return [0, 1].includes(Number(item.applyStatus));
      }
      if (activeFilter === "advanced") {
        return [2, 4].includes(Number(item.applyStatus));
      }
      if (activeFilter === "cancelled") {
        return Number(item.applyStatus) === 5;
      }
      return true;
    });

    listNode.innerHTML = sorted.map(buildApplicationJourneyCardV3).join("")
      || '<div class="empty-state">当前筛选条件下暂无申请记录。</div>';
    bindStudentApplicationActions(myApplications);
  };

  tabs.forEach((button) => {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.filter;
      tabs.forEach((item) => item.classList.toggle("is-active", item === button));
      renderList();
    });
  });
  sortSelect?.addEventListener("change", renderList);
  renderList();

  document.getElementById("open-application-create")?.addEventListener("click", () => {
    openApplicationCreator(session, jobs, currentJobId, myApplications);
  });
  if (query.get("jobId")) {
    openApplicationCreator(session, jobs, currentJobId, myApplications);
  }
}
