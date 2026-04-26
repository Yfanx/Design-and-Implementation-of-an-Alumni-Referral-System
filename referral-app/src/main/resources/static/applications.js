async function loadStudentApplicationContext() {
  const [jobResult, applicationResult] = await Promise.all([
    apiRequest("/referral/job-info/match-list"),
    apiRequest("/referral/referral-application/list")
  ]);
  return {
    jobs: jobResult.data.list || [],
    applications: applicationResult.data.list || []
  };
}

async function loadAlumniApplications() {
  const result = await apiRequest("/referral/referral-application/list");
  return result.data.list || [];
}

function renderApplicationTimeline(target, applications, { showActions = false, onDetail, onCancel } = {}) {
  target.innerHTML = applications.map((item) => {
    const badge = statusBadge(item.applyStatus);
    return `
      <div class="timeline-item">
        <div class="split-header">
          <div>
            <strong>${item.jobTitle}</strong>
            <div class="job-card-company">${item.alumniName || item.studentName || "-"}</div>
          </div>
          <span class="status-badge ${badge.cls}">${badge.text}</span>
        </div>
        <div class="meta-row">
          <span class="meta-tag">匹配度：${item.matchScore || "-"}</span>
          <span class="meta-tag">${item.processRemark || "等待进一步处理"}</span>
          <span class="meta-tag">${renderAttachmentLink(item.resumeUrl, "查看附件")}</span>
        </div>
        ${showActions ? `
          <div class="action-group top-gap">
            <button class="btn ghost-btn detail-application-btn" data-id="${item.id}">查看详情</button>
            ${Number(item.applyStatus) === 0 || Number(item.applyStatus) === 1 ? `<button class="btn ghost-btn cancel-application-btn" data-id="${item.id}">撤回申请</button>` : ""}
          </div>
        ` : ""}
      </div>
    `;
  }).join("") || `<div class="timeline-item">暂无投递记录。</div>`;

  if (showActions) {
    target.querySelectorAll(".detail-application-btn").forEach((button) => {
      button.addEventListener("click", () => onDetail?.(Number(button.dataset.id)));
    });
    target.querySelectorAll(".cancel-application-btn").forEach((button) => {
      button.addEventListener("click", () => onCancel?.(Number(button.dataset.id)));
    });
  }
}

function openApplicationComposer(jobs, initialJobId, onSubmitted) {
  const current = jobs.find((item) => Number(item.id) === Number(initialJobId)) || jobs[0];
  const defaultResumeUrl = sanitizeAttachmentUrl("/uploads/demo/resume/wang.pdf");
  openPageModal({
    title: "发起申请",
    subtitle: "岗位、附件与自我介绍统一在弹窗中填写，提交后会自动进入申请时间线。",
    size: "wide",
    body: `
      <form class="demo-form" id="application-form">
        <div class="job-preview-card">
          <strong id="application-job-title">${current?.jobTitle || "未选择岗位"}</strong>
          <div class="job-card-company" id="application-job-company">${current?.companyName || "-"} / ${current?.city || "-"}</div>
          <div class="preview-desc">从岗位页跳转过来时会自动带入当前岗位信息，也可以在这里重新切换。</div>
        </div>
        <div class="form-grid top-gap">
          <label class="form-field field-span-2">
            <span>目标岗位</span>
            <select name="jobId" id="application-job-select">
              ${jobs.map((item) => `<option value="${item.id}" ${Number(item.id) === Number(current?.id) ? "selected" : ""}>${item.jobTitle} · ${item.companyName} · ${item.city}</option>`).join("")}
            </select>
          </label>
          <label class="form-field field-span-2">
            <span>附件链接</span>
            <input id="application-resume-url" name="resumeUrl" value="${defaultResumeUrl}" placeholder="上传后会自动回填">
          </label>
          <div class="form-field field-span-2">
            <span>上传附件</span>
            <div class="upload-bar">
              <input id="application-file-input" type="file" accept=".pdf,.png,.jpg,.jpeg,.gif,.svg">
              <button type="button" class="btn ghost-btn" id="upload-application-file-btn">上传附件</button>
              <a class="btn ghost-btn" id="application-preview-link" href="${defaultResumeUrl || "#"}" target="_blank" rel="noreferrer">打开当前附件</a>
            </div>
          </div>
          <div class="field-span-2" id="application-preview-area">${renderAttachmentPreview(defaultResumeUrl)}</div>
          <label class="form-field field-span-2">
            <span>自我介绍</span>
            <textarea name="selfIntroduction" placeholder="简要描述你为什么适合这个岗位。">我有较好的项目经验，希望通过校友内推获得这次机会。</textarea>
          </label>
        </div>
        <div class="page-action-bar top-gap">
          <div class="page-action-note">系统会自动绑定当前登录学生与岗位所属校友，无需手工填写各种 ID。</div>
          <div class="action-group">
            <button type="button" class="btn ghost-btn" id="cancel-application-editor">取消</button>
            <button type="submit" class="btn">提交申请</button>
          </div>
        </div>
      </form>
      <div id="application-result" class="action-result">提交成功后会自动刷新右侧记录。</div>
    `,
    onReady(body) {
      const resultNode = body.querySelector("#application-result");
      const jobSelectNode = body.querySelector("#application-job-select");
      const resumeUrlInput = body.querySelector("#application-resume-url");
      const previewLink = body.querySelector("#application-preview-link");
      const previewArea = body.querySelector("#application-preview-area");
      const titleNode = body.querySelector("#application-job-title");
      const companyNode = body.querySelector("#application-job-company");

      const syncSelectedJob = (jobId) => {
        const selected = jobs.find((item) => Number(item.id) === Number(jobId));
        titleNode.textContent = selected?.jobTitle || "未选择岗位";
        companyNode.textContent = `${selected?.companyName || "-"} / ${selected?.city || "-"}`;
      };

      const syncAttachment = (url) => {
        const safeUrl = sanitizeAttachmentUrl(url);
        previewLink.href = safeUrl || "#";
        previewLink.classList.toggle("is-disabled", !safeUrl);
        previewArea.innerHTML = renderAttachmentPreview(safeUrl);
      };

      body.querySelector("#cancel-application-editor").addEventListener("click", closePageModal);
      jobSelectNode.addEventListener("change", (event) => syncSelectedJob(event.target.value));
      resumeUrlInput.addEventListener("input", () => syncAttachment(resumeUrlInput.value.trim()));
      body.querySelector("#upload-application-file-btn").addEventListener("click", async () => {
        const file = body.querySelector("#application-file-input").files?.[0];
        if (!file) {
          resultNode.innerText = "请先选择一个 PDF 或图片文件。";
          return;
        }
        resultNode.innerText = "正在上传附件...";
        try {
          const uploaded = await uploadReferralFile(file, "student/application");
          resumeUrlInput.value = uploaded.url;
          syncAttachment(uploaded.url);
          resultNode.innerText = `附件上传成功：${uploaded.originalFileName}`;
        } catch (error) {
          resultNode.innerText = error.message || "上传失败，请稍后重试。";
        }
      });
      body.querySelector("#application-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const payload = formPayload(event.target);
        const response = await apiRequest("/referral/referral-application/create", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        resultNode.innerText = `申请已提交，记录 ID：${response.data}`;
        await onSubmitted(payload, response.data);
        setTimeout(() => closePageModal(), 500);
      });
    }
  });
}

function openApplicationDetail(item) {
  const badge = statusBadge(item.applyStatus);
  openPageModal({
    title: "申请详情",
    subtitle: "查看当前申请的状态说明、附件与处理备注。",
    body: `
      <div class="compact-list">
        <div class="compact-item"><strong>${item.jobTitle}</strong><div class="job-card-company">${item.alumniName || item.studentName || "-"}</div></div>
        <div class="compact-item"><strong>状态</strong><div class="job-card-company"><span class="status-badge ${badge.cls}">${badge.text}</span></div></div>
        <div class="compact-item"><strong>处理备注</strong><p>${item.processRemark || "当前还没有新的处理备注。"}</p></div>
        <div class="compact-item"><strong>附件</strong><div class="job-card-company">${renderAttachmentLink(item.resumeUrl, "查看附件")}</div></div>
      </div>
    `
  });
}

function openApplicationCancel(id, onCancelled) {
  openPageModal({
    title: "撤回申请",
    subtitle: "撤回后该记录会保留在时间线中，但状态会更新为已取消。",
    body: `
      <div class="compact-item">
        <strong>确认撤回</strong>
        <p>只有待处理或已查看阶段的申请建议撤回。若校友已推进流程，请优先通过消息沟通说明情况。</p>
      </div>
      <div class="page-action-bar top-gap">
        <div class="page-action-note">撤回操作只会作用于当前登录学生自己的申请。</div>
        <div class="action-group">
          <button type="button" class="btn ghost-btn" id="cancel-application-close">取消</button>
          <button type="button" class="btn danger-btn" id="confirm-application-cancel">确认撤回</button>
        </div>
      </div>
    `,
    onReady(body) {
      body.querySelector("#cancel-application-close").addEventListener("click", closePageModal);
      body.querySelector("#confirm-application-cancel").addEventListener("click", async () => {
        await apiRequest(`/referral/referral-application/cancel?id=${id}`, { method: "POST" });
        closePageModal();
        await onCancelled();
      });
    }
  });
}

function openApplicationProcessor(item, onProcessed) {
  openPageModal({
    title: "处理申请",
    subtitle: "校友只能处理投递到自己岗位上的申请，状态和备注会同步回学生端时间线。",
    body: `
      <form class="demo-form" id="process-application-form">
        <div class="compact-list">
          <div class="compact-item"><strong>${item.studentName}</strong><div class="job-card-company">${item.jobTitle}</div></div>
          <div class="compact-item"><strong>简历附件</strong><div class="job-card-company">${renderAttachmentLink(item.resumeUrl, "查看附件")}</div></div>
        </div>
        <div class="form-grid top-gap">
          <label class="form-field">
            <span>处理状态</span>
            <select name="applyStatus">
              <option value="1" ${Number(item.applyStatus) === 1 ? "selected" : ""}>已查看</option>
              <option value="2" ${Number(item.applyStatus) === 2 ? "selected" : ""}>已内推</option>
              <option value="3" ${Number(item.applyStatus) === 3 ? "selected" : ""}>已拒绝</option>
              <option value="4" ${Number(item.applyStatus) === 4 ? "selected" : ""}>已完成</option>
            </select>
          </label>
          <label class="form-field field-span-2">
            <span>处理备注</span>
            <textarea name="processRemark" placeholder="例如：已推荐给用人部门、建议补充项目经历、流程已完成。">${item.processRemark || ""}</textarea>
          </label>
        </div>
        <div class="page-action-bar top-gap">
          <div class="page-action-note">建议把推荐结果、补充建议或流程状态写清楚，学生端会直接看到这段说明。</div>
          <div class="action-group">
            <button type="button" class="btn ghost-btn" id="cancel-process-application">取消</button>
            <button type="submit" class="btn">提交处理结果</button>
          </div>
        </div>
      </form>
      <div id="process-application-result" class="action-result">处理完成后会自动刷新申请列表。</div>
    `,
    onReady(body) {
      const resultNode = body.querySelector("#process-application-result");
      body.querySelector("#cancel-process-application").addEventListener("click", closePageModal);
      body.querySelector("#process-application-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const payload = formPayload(event.target);
        payload.id = item.id;
        await apiRequest("/referral/referral-application/process", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        resultNode.innerText = "处理结果已提交。";
        await onProcessed();
        setTimeout(() => closePageModal(), 500);
      });
    }
  });
}

function renderStudentApplications(jobs, applications, currentJobId) {
  const currentJob = jobs.find((item) => Number(item.id) === Number(currentJobId)) || jobs[0];
  const processingCount = applications.filter((item) => item.applyStatus === 0 || item.applyStatus === 1).length;

  renderAppLayout("applications", "我的申请", "提交内推申请、预览附件，并在时间线中持续跟踪进度。", `
    <section class="panel reveal">
      <div class="cards">
        <div class="card"><div class="card-label">全部申请</div><div class="card-value">${applications.length}</div></div>
        <div class="card"><div class="card-label">处理中</div><div class="card-value">${processingCount}</div></div>
        <div class="card"><div class="card-label">已内推</div><div class="card-value">${applications.filter((item) => item.applyStatus === 2).length}</div></div>
        <div class="card"><div class="card-label">已完成</div><div class="card-value">${applications.filter((item) => item.applyStatus === 4).length}</div></div>
      </div>
    </section>
    <div class="content-grid reveal reveal-delay-1">
      <section class="panel">
        <div class="page-action-bar">
          <div>
            <strong>${currentJob?.jobTitle || "未选择岗位"}</strong>
            <div class="page-action-note">${currentJob?.companyName || "-"} / ${currentJob?.city || "-"}</div>
          </div>
          <div class="action-group">
            <button class="btn" id="open-application-modal">发起申请</button>
          </div>
        </div>
        <div class="compact-list">
          <div class="compact-item"><strong>投递说明</strong><p>岗位、附件和自我介绍都统一在弹窗中填写，提交后直接进入右侧申请时间线。</p></div>
          <div class="compact-item"><strong>闭环规则</strong><p>系统会自动绑定当前学生和岗位所属校友，不再允许手工填写 `studentId`、`alumniId` 等归属字段。</p></div>
        </div>
      </section>
      <section class="panel">
        <div class="panel-header">
          <div>
            <h2>申请记录</h2>
            <p>这里只显示当前学生账号自己的投递历史。</p>
          </div>
        </div>
        <div class="timeline" id="application-timeline"></div>
      </section>
    </div>
  `);

  const timelineNode = document.getElementById("application-timeline");
  const rerender = () => renderApplicationTimeline(timelineNode, applications, {
    showActions: true,
    onDetail: (id) => openApplicationDetail(applications.find((item) => Number(item.id) === id)),
    onCancel: (id) => openApplicationCancel(id, async () => location.reload())
  });
  rerender();

  document.getElementById("open-application-modal").addEventListener("click", () => {
    openApplicationComposer(jobs, currentJob?.id, async (payload, id) => {
      const job = jobs.find((item) => Number(item.id) === Number(payload.jobId));
      applications.unshift({
        id,
        jobTitle: job?.jobTitle || "新申请",
        alumniName: job?.alumniName || "待处理",
        applyStatus: 0,
        matchScore: "-",
        processRemark: "申请已提交，等待校友查看",
        resumeUrl: payload.resumeUrl
      });
      rerender();
    });
  });
}

function renderAlumniApplications(applications) {
  const waiting = applications.filter((item) => item.applyStatus === 0 || item.applyStatus === 1).length;
  const recommended = applications.filter((item) => item.applyStatus === 2).length;

  renderAppLayout("applications", "学生申请", "查看并处理投递到我岗位上的内推申请，同时支持直接预览学生附件。", `
    <section class="panel">
      <div class="cards">
        <div class="card"><div class="card-label">收到申请</div><div class="card-value">${applications.length}</div></div>
        <div class="card"><div class="card-label">待处理</div><div class="card-value">${waiting}</div></div>
        <div class="card"><div class="card-label">已推进</div><div class="card-value">${recommended}</div></div>
      </div>
    </section>
    <section class="panel top-gap">
      <div class="panel-header">
        <div>
          <h2>申请列表</h2>
          <p>所有处理动作都通过弹窗完成，避免列表页和处理表单混在一起。</p>
        </div>
      </div>
      <div class="timeline" id="alumni-application-timeline"></div>
    </section>
  `);

  const timelineNode = document.getElementById("alumni-application-timeline");
  timelineNode.innerHTML = applications.map((item) => {
    const badge = statusBadge(item.applyStatus);
    return `
      <div class="timeline-item">
        <div class="split-header">
          <div>
            <strong>${item.studentName}</strong>
            <div class="job-card-company">${item.jobTitle}</div>
          </div>
          <span class="status-badge ${badge.cls}">${badge.text}</span>
        </div>
        <div class="meta-row">
          <span class="meta-tag">${item.processRemark || "等待处理"}</span>
          <span class="meta-tag">${renderAttachmentLink(item.resumeUrl, "查看附件")}</span>
        </div>
        <div class="action-group top-gap">
          <button class="btn detail-application-btn" data-id="${item.id}">处理申请</button>
        </div>
      </div>
    `;
  }).join("") || `<div class="timeline-item">当前还没有学生投递到你的岗位。</div>`;

  timelineNode.querySelectorAll(".detail-application-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const current = applications.find((item) => Number(item.id) === Number(button.dataset.id));
      if (!current) {
        return;
      }
      openApplicationProcessor(current, async () => location.reload());
    });
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const session = ensureLogin();
  if (session.role === "ALUMNI") {
    renderAlumniApplications(await loadAlumniApplications());
    return;
  }

  const query = new URLSearchParams(location.search);
  const { jobs, applications } = await loadStudentApplicationContext();
  renderStudentApplications(jobs, applications, Number(query.get("jobId")) || jobs[0]?.id);
});
