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

function applicationStatusText(status) {
  return statusBadge(Number(status)).text;
}

function renderApplicationTimeline(target, applications, { showActions = false, onDetail, onCancel } = {}) {
  target.innerHTML = (applications || []).map((item) => {
    const badge = statusBadge(Number(item.applyStatus));
    return `
      <div class="timeline-item">
        <div class="split-header">
          <div>
            <strong>${item.jobTitle || "-"}</strong>
            <div class="job-card-company">${item.alumniName || item.studentName || "-"}</div>
          </div>
          <span class="status-badge ${badge.cls}">${badge.text}</span>
        </div>
        <div class="meta-row">
          <span class="meta-tag">匹配度：${item.matchScore || "-"}</span>
          <span class="meta-tag">${item.processRemark || "已提交，等待处理"}</span>
          <span class="meta-tag">${renderAttachmentLink(item.resumeUrl, "查看附件")}</span>
        </div>
        ${showActions ? `
          <div class="action-group top-gap">
            <button class="btn ghost-btn detail-application-btn" data-id="${item.id}">查看详情</button>
            ${(Number(item.applyStatus) === 0 || Number(item.applyStatus) === 1)
              ? `<button class="btn ghost-btn cancel-application-btn" data-id="${item.id}">撤回申请</button>`
              : ""}
          </div>
        ` : ""}
      </div>
    `;
  }).join("") || `<div class="timeline-item">暂无投递记录。</div>`;

  if (!showActions) {
    return;
  }
  target.querySelectorAll(".detail-application-btn").forEach((button) => {
    button.addEventListener("click", () => onDetail?.(Number(button.dataset.id)));
  });
  target.querySelectorAll(".cancel-application-btn").forEach((button) => {
    button.addEventListener("click", () => onCancel?.(Number(button.dataset.id)));
  });
}

function buildJobOptions(jobs, currentId) {
  return (jobs || []).map((item) => `
    <option value="${item.id}" ${Number(item.id) === Number(currentId) ? "selected" : ""}>
      ${item.jobTitle} / ${item.companyName} / ${item.city}
    </option>
  `).join("");
}

function syncApplicationJobPreview(jobs, jobId, titleNode, companyNode) {
  const selected = (jobs || []).find((item) => Number(item.id) === Number(jobId));
  titleNode.textContent = selected?.jobTitle || "未选择岗位";
  companyNode.textContent = `${selected?.companyName || "-"} / ${selected?.city || "-"}`;
}

function syncApplicationAttachment(url, previewLink, previewArea) {
  const safeUrl = sanitizeAttachmentUrl(url);
  previewLink.href = safeUrl || "#";
  previewLink.classList.toggle("is-disabled", !safeUrl);
  previewArea.innerHTML = renderAttachmentPreview(safeUrl);
}

function openApplicationComposer(jobs, initialJobId, onSubmitted) {
  const current = (jobs || []).find((item) => Number(item.id) === Number(initialJobId)) || jobs[0];
  const defaultResumeUrl = sanitizeAttachmentUrl("/uploads/demo/resume/wang.pdf");

  openPageModal({
    title: "发起申请",
    subtitle: "岗位、附件与自我介绍统一在弹窗里填写，提交后会直接进入右侧申请时间线。",
    size: "wide",
    body: `
      <form class="demo-form" id="application-form">
        <div class="job-preview-card">
          <strong id="application-job-title">${current?.jobTitle || "未选择岗位"}</strong>
          <div class="job-card-company" id="application-job-company">${current?.companyName || "-"} / ${current?.city || "-"}</div>
          <div class="preview-desc">从职位页进入时会自动带入当前岗位，也可以在这里重新切换。</div>
        </div>
        <div class="form-grid top-gap">
          <label class="form-field field-span-2">
            <span>目标岗位</span>
            <select name="jobId" id="application-job-select">
              ${buildJobOptions(jobs, current?.id)}
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
              <a class="btn ghost-btn" id="application-preview-link" href="${defaultResumeUrl}" target="_blank" rel="noreferrer">打开当前附件</a>
            </div>
          </div>
          <div class="field-span-2" id="application-preview-area">${renderAttachmentPreview(defaultResumeUrl)}</div>
          <label class="form-field field-span-2">
            <span>自我介绍</span>
            <textarea name="selfIntroduction" placeholder="简要说明你的项目经历、技能亮点和申请动机">我有较好的项目经验，希望通过校友内推获得这次机会。</textarea>
          </label>
        </div>
        <div class="page-action-bar top-gap">
          <div class="page-action-note">系统会自动绑定当前登录学生与岗位对应校友，无需手动填写 studentId、alumniId。</div>
          <div class="action-group">
            <button type="button" class="btn ghost-btn" id="cancel-application-editor">取消</button>
            <button type="submit" class="btn">提交申请</button>
          </div>
        </div>
      </form>
      <div id="application-result" class="action-result">提交成功后会自动刷新申请记录。</div>
    `,
    onReady(body) {
      const resultNode = body.querySelector("#application-result");
      const jobSelectNode = body.querySelector("#application-job-select");
      const resumeUrlInput = body.querySelector("#application-resume-url");
      const previewLink = body.querySelector("#application-preview-link");
      const previewArea = body.querySelector("#application-preview-area");
      const titleNode = body.querySelector("#application-job-title");
      const companyNode = body.querySelector("#application-job-company");

      body.querySelector("#cancel-application-editor").addEventListener("click", closePageModal);
      jobSelectNode.addEventListener("change", (event) => {
        syncApplicationJobPreview(jobs, event.target.value, titleNode, companyNode);
      });
      resumeUrlInput.addEventListener("input", () => {
        syncApplicationAttachment(resumeUrlInput.value.trim(), previewLink, previewArea);
      });

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
          syncApplicationAttachment(uploaded.url, previewLink, previewArea);
          resultNode.innerText = `附件上传成功：${uploaded.originalFileName || "已完成上传"}`;
        } catch (error) {
          resultNode.innerText = error.message || "上传失败，请稍后重试。";
        }
      });

      body.querySelector("#application-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const payload = formPayload(event.target);
        resultNode.innerText = "正在提交申请...";
        try {
          const response = await apiRequest("/referral/referral-application/create", {
            method: "POST",
            body: JSON.stringify(payload)
          });
          resultNode.innerText = `申请已提交，记录 ID：${response.data}`;
          await onSubmitted(payload, response.data);
          setTimeout(() => closePageModal(), 400);
        } catch (error) {
          resultNode.innerText = error.message || "提交失败，请稍后重试。";
        }
      });
    }
  });
}

function openApplicationDetail(item) {
  if (!item) {
    return;
  }
  const badge = statusBadge(Number(item.applyStatus));
  openPageModal({
    title: "申请详情",
    subtitle: "查看当前申请状态、处理说明与附件。",
    body: `
      <div class="compact-list">
        <div class="compact-item"><strong>${item.jobTitle || "-"}</strong><div class="job-card-company">${item.alumniName || item.studentName || "-"}</div></div>
        <div class="compact-item"><strong>状态</strong><div class="job-card-company"><span class="status-badge ${badge.cls}">${badge.text}</span></div></div>
        <div class="compact-item"><strong>提交时间</strong><p>${formatDateTime(item.applyTime)}</p></div>
        <div class="compact-item"><strong>处理时间</strong><p>${formatDateTime(item.processTime)}</p></div>
        <div class="compact-item"><strong>处理备注</strong><p>${item.processRemark || "当前还没有新的处理备注。"}</p></div>
        <div class="compact-item"><strong>附件</strong><div class="job-card-company">${renderAttachmentLink(item.resumeUrl, "查看附件")}</div></div>
        <div class="compact-item"><strong>自我介绍</strong><p>${item.selfIntroduction || "未填写"}</p></div>
      </div>
    `
  });
}

function openApplicationCancel(id, onCancelled) {
  openPageModal({
    title: "撤回申请",
    subtitle: "撤回后会保留历史记录，但状态会更新为已取消。",
    body: `
      <div class="compact-item">
        <strong>确认撤回</strong>
        <p>仅建议撤回待处理或已查看阶段的申请。如果校友已经推进流程，建议先通过消息沟通说明情况。</p>
      </div>
      <div class="page-action-bar top-gap">
        <div class="page-action-note">该操作只会影响当前登录学生自己的申请。</div>
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
    subtitle: "校友可以更新处理状态，并把备注同步回学生端时间线。",
    body: `
      <form class="demo-form" id="process-application-form">
        <div class="compact-list">
          <div class="compact-item"><strong>${item.studentName || "-"}</strong><div class="job-card-company">${item.jobTitle || "-"}</div></div>
          <div class="compact-item"><strong>附件</strong><div class="job-card-company">${renderAttachmentLink(item.resumeUrl, "查看附件")}</div></div>
          <div class="compact-item"><strong>当前状态</strong><div class="job-card-company">${applicationStatusText(item.applyStatus)}</div></div>
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
            <textarea name="processRemark" placeholder="例如：已推荐给用人部门，建议补充项目经历，或流程已结束。">${item.processRemark || ""}</textarea>
          </label>
        </div>
        <div class="page-action-bar top-gap">
          <div class="page-action-note">建议把推进结果、补充建议或流程状态写清楚，学生端会直接看到。</div>
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
        resultNode.innerText = "正在提交处理结果...";
        try {
          await apiRequest("/referral/referral-application/process", {
            method: "POST",
            body: JSON.stringify(payload)
          });
          resultNode.innerText = "处理结果已提交。";
          await onProcessed();
          setTimeout(() => closePageModal(), 400);
        } catch (error) {
          resultNode.innerText = error.message || "提交失败，请稍后重试。";
        }
      });
    }
  });
}

function renderStudentApplications(jobs, applications, currentJobId) {
  const currentJob = (jobs || []).find((item) => Number(item.id) === Number(currentJobId)) || jobs[0];
  const processingCount = (applications || []).filter((item) => Number(item.applyStatus) === 0 || Number(item.applyStatus) === 1).length;

  renderAppLayout("applications", "我的申请", "提交内推申请、预览附件，并持续跟踪处理进度。", `
    <section class="panel reveal">
      <div class="cards">
        <div class="card"><div class="card-label">全部申请</div><div class="card-value">${applications.length}</div></div>
        <div class="card"><div class="card-label">处理中</div><div class="card-value">${processingCount}</div></div>
        <div class="card"><div class="card-label">已内推</div><div class="card-value">${applications.filter((item) => Number(item.applyStatus) === 2).length}</div></div>
        <div class="card"><div class="card-label">已完成</div><div class="card-value">${applications.filter((item) => Number(item.applyStatus) === 4).length}</div></div>
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
          <div class="compact-item"><strong>投递说明</strong><p>岗位、附件和自我介绍都统一在弹窗中填写，提交后会直接进入右侧申请时间线。</p></div>
          <div class="compact-item"><strong>闭环规则</strong><p>系统会自动绑定当前学生和岗位所属校友，不再依赖前端手填 ID。</p></div>
        </div>
      </section>
      <section class="panel">
        <div class="panel-header">
          <div>
            <h2>申请记录</h2>
            <p>这里只展示当前学生账号自己的投递历史。</p>
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
        jobId: Number(payload.jobId),
        jobTitle: job?.jobTitle || "新申请",
        alumniName: job?.alumniName || "待处理",
        resumeUrl: payload.resumeUrl,
        selfIntroduction: payload.selfIntroduction,
        matchScore: "-",
        applyStatus: 0,
        processRemark: "申请已提交，等待校友查看",
        applyTime: new Date().toISOString()
      });
      rerender();
    });
  });
}

function renderAlumniApplications(applications) {
  const waiting = (applications || []).filter((item) => Number(item.applyStatus) === 0 || Number(item.applyStatus) === 1).length;
  const recommended = (applications || []).filter((item) => Number(item.applyStatus) === 2).length;

  renderAppLayout("applications", "学生申请", "查看并处理投递到我岗位上的内推申请，同时支持直接预览学生附件。", `
    <section class="panel">
      <div class="cards">
        <div class="card"><div class="card-label">收到申请</div><div class="card-value">${applications.length}</div></div>
        <div class="card"><div class="card-label">待处理</div><div class="card-value">${waiting}</div></div>
        <div class="card"><div class="card-label">已内推</div><div class="card-value">${recommended}</div></div>
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
  timelineNode.innerHTML = (applications || []).map((item) => {
    const badge = statusBadge(Number(item.applyStatus));
    return `
      <div class="timeline-item">
        <div class="split-header">
          <div>
            <strong>${item.studentName || "-"}</strong>
            <div class="job-card-company">${item.jobTitle || "-"}</div>
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

  if (query.get("jobId")) {
    setTimeout(() => {
      document.getElementById("open-application-modal")?.click();
    }, 0);
  }
});
