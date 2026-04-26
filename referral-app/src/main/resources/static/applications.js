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

function getApplicationStageText(status) {
  const value = Number(status);
  if (value === 0) return "待查看";
  if (value === 1) return "沟通中";
  if (value === 2) return "已内推";
  if (value === 3) return "未通过";
  if (value === 4) return "已完成";
  if (value === 5) return "已撤回";
  return "处理中";
}

function renderApplicationRecordCard(item, { studentSide = true, showActions = false } = {}) {
  const badge = statusBadge(Number(item.applyStatus));
  const actorLine = studentSide
    ? `${item.companyName || "-"} / ${item.alumniName || "校友"}`
    : `${item.studentName || "-"} / 匹配度 ${item.matchScore || "-"}%`;
  const intro = item.selfIntroduction || "未填写自我介绍。";
  const remark = item.processRemark || (studentSide ? "已提交申请，等待校友处理。" : "等待处理该申请。");

  return `
    <article class="application-record-card">
      <div class="application-record-head">
        <div>
          <strong>${item.jobTitle || "-"}</strong>
          <div class="job-card-company">${actorLine}</div>
        </div>
        <span class="status-badge ${badge.cls}">${badge.text}</span>
      </div>
      <div class="application-meta-grid">
        <div class="application-meta-card">
          <span>阶段</span>
          <strong>${getApplicationStageText(item.applyStatus)}</strong>
        </div>
        <div class="application-meta-card">
          <span>匹配度</span>
          <strong>${item.matchScore || "-"}</strong>
        </div>
        <div class="application-meta-card">
          <span>提交时间</span>
          <strong>${formatDateTime(item.applyTime) || "-"}</strong>
        </div>
        <div class="application-meta-card">
          <span>附件</span>
          <strong>${sanitizeAttachmentUrl(item.resumeUrl) ? "已上传" : "未上传"}</strong>
        </div>
      </div>
      <div class="application-note-block">
        <span>处理说明</span>
        <p>${remark}</p>
      </div>
      <div class="application-note-block subtle">
        <span>${studentSide ? "投递说明" : "学生简介"}</span>
        <p>${intro}</p>
      </div>
      <div class="application-record-actions">
        <div class="document-actions-inline">${renderAttachmentLink(item.resumeUrl, "查看附件")}</div>
        ${showActions ? `
          <div class="action-group">
            <button class="btn ghost-btn detail-application-btn" data-id="${item.id}">查看详情</button>
            ${studentSide && (Number(item.applyStatus) === 0 || Number(item.applyStatus) === 1)
              ? `<button class="btn ghost-btn cancel-application-btn" data-id="${item.id}">撤回申请</button>`
              : ""}
            ${!studentSide ? `<button class="btn" data-process-id="${item.id}">处理申请</button>` : ""}
          </div>
        ` : ""}
      </div>
    </article>
  `;
}

function buildJobOptions(jobs, currentId) {
  return (jobs || []).map((item) => `
    <option value="${item.id}" ${Number(item.id) === Number(currentId) ? "selected" : ""}>
      ${item.jobTitle} / ${item.companyName} / ${item.city}
    </option>
  `).join("");
}

function syncApplicationJobPreview(jobs, jobId, titleNode, metaNode, contactNode) {
  const selected = (jobs || []).find((item) => Number(item.id) === Number(jobId));
  titleNode.textContent = selected?.jobTitle || "未选择岗位";
  metaNode.textContent = `${selected?.companyName || "-"} / ${selected?.city || "-"}`;
  contactNode.textContent = selected?.contactWechat || selected?.contactPhone || selected?.contactEmail || selected?.contactType || "站内消息";
}

function syncUploadedAttachment(url, previewArea) {
  const safeUrl = sanitizeAttachmentUrl(url);
  previewArea.innerHTML = renderAttachmentPreview(safeUrl);
}

function openApplicationComposer(jobs, initialJobId, existingApplications, onSubmitted) {
  const current = (jobs || []).find((item) => Number(item.id) === Number(initialJobId)) || jobs[0];
  const defaultResumeUrl = sanitizeAttachmentUrl("/uploads/demo/resume/wang.pdf");

  openPageModal({
    title: "发起申请",
    subtitle: "在弹窗内完成岗位确认、附件上传和投递说明。",
    size: "wide",
    body: `
      <form class="demo-form" id="application-form">
        <input type="hidden" id="application-resume-url" name="resumeUrl" value="${defaultResumeUrl}">
        <section class="application-form-hero">
          <div>
            <span class="section-eyebrow">Current Target</span>
            <strong id="application-job-title">${current?.jobTitle || "未选择岗位"}</strong>
            <div class="job-card-company" id="application-job-company">${current?.companyName || "-"} / ${current?.city || "-"}</div>
          </div>
          <div class="application-form-hero-side">
            <span class="profile-chip" id="application-job-contact">${current?.contactWechat || current?.contactPhone || current?.contactEmail || current?.contactType || "站内消息"}</span>
          </div>
        </section>
        <div class="form-grid top-gap">
          <label class="form-field field-span-2">
            <span>目标岗位</span>
            <select name="jobId" id="application-job-select">
              ${buildJobOptions(jobs, current?.id)}
            </select>
          </label>
          <div class="form-field field-span-2">
            <span>上传附件</span>
            <div class="upload-bar">
              <input id="application-file-input" class="upload-input-hidden" type="file" accept=".pdf,.png,.jpg,.jpeg,.gif,.svg">
              <button type="button" class="btn ghost-btn" id="upload-application-file-btn">上传附件</button>
            </div>
          </div>
          <div class="field-span-2" id="application-preview-area">${renderAttachmentPreview(defaultResumeUrl)}</div>
          <label class="form-field field-span-2">
            <span>自我介绍</span>
            <textarea name="selfIntroduction" placeholder="简要说明项目经历、技能亮点和申请动机">我有较好的项目经验，希望通过校友内推获得这次机会。</textarea>
          </label>
        </div>
        <div class="page-action-bar top-gap">
          <div class="action-group">
            <button type="button" class="btn ghost-btn" id="cancel-application-editor">取消</button>
            <button type="submit" class="btn">提交申请</button>
          </div>
        </div>
      </form>
      <div id="application-result" class="action-result">提交后会自动刷新当前申请记录。</div>
    `,
    onReady(body) {
      const resultNode = body.querySelector("#application-result");
      const jobSelectNode = body.querySelector("#application-job-select");
      const resumeUrlInput = body.querySelector("#application-resume-url");
      const previewArea = body.querySelector("#application-preview-area");
      const titleNode = body.querySelector("#application-job-title");
      const metaNode = body.querySelector("#application-job-company");
      const contactNode = body.querySelector("#application-job-contact");
      const fileInput = body.querySelector("#application-file-input");

      body.querySelector("#cancel-application-editor").addEventListener("click", closePageModal);
      jobSelectNode.addEventListener("change", (event) => {
        syncApplicationJobPreview(jobs, event.target.value, titleNode, metaNode, contactNode);
      });

      const uploadCurrentFile = async () => {
        const file = fileInput.files?.[0];
        if (!file) {
          return;
        }
        resultNode.innerText = "正在上传附件...";
        try {
          const uploaded = await uploadReferralFile(file, "student/application");
          resumeUrlInput.value = uploaded.url;
          syncUploadedAttachment(uploaded.url, previewArea);
          resultNode.innerText = `附件上传成功：${uploaded.originalFileName || "已完成上传"}`;
        } catch (error) {
          resultNode.innerText = error.message || "上传失败，请稍后重试。";
        } finally {
          fileInput.value = "";
        }
      };

      body.querySelector("#upload-application-file-btn").addEventListener("click", () => fileInput.click());
      fileInput.addEventListener("change", uploadCurrentFile);

      body.querySelector("#application-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const payload = formPayload(event.target);
        const duplicated = (existingApplications || []).some((item) => Number(item.jobId) === Number(payload.jobId) && Number(item.applyStatus) !== 5);
        if (duplicated) {
          resultNode.innerText = "你已经投递过这个岗位，请直接查看申请进度。";
          return;
        }
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
          const message = error.message?.includes("已经投递过")
            ? "你已经投递过这个岗位，请直接查看申请记录。"
            : (error.message || "提交失败，请稍后重试。");
          resultNode.innerText = message;
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
    subtitle: "查看当前申请状态、处理时间和附件。",
    body: `
      <div class="application-detail-grid">
        <div class="compact-item"><strong>${item.jobTitle || "-"}</strong><div class="job-card-company">${item.companyName || "-"} / ${item.alumniName || item.studentName || "-"}</div></div>
        <div class="compact-item"><strong>状态</strong><div class="job-card-company"><span class="status-badge ${badge.cls}">${badge.text}</span></div></div>
        <div class="compact-item"><strong>提交时间</strong><p>${formatDateTime(item.applyTime)}</p></div>
        <div class="compact-item"><strong>处理时间</strong><p>${formatDateTime(item.processTime)}</p></div>
        <div class="compact-item field-span-2"><strong>处理备注</strong><p>${item.processRemark || "当前还没有新的处理备注。"}</p></div>
        <div class="compact-item"><strong>附件</strong><div class="job-card-company">${renderAttachmentLink(item.resumeUrl, "查看附件")}</div></div>
        <div class="compact-item field-span-2"><strong>自我介绍</strong><p>${item.selfIntroduction || "未填写"}</p></div>
      </div>
    `
  });
}

function openApplicationCancel(id, onCancelled) {
  openPageModal({
    title: "撤回申请",
    subtitle: "撤回后会保留历史记录，但状态会更新为已撤回。",
    body: `
      <div class="compact-item">
        <strong>确认撤回</strong>
        <p>建议仅撤回尚未推进到后续流程的申请。</p>
      </div>
      <div class="page-action-bar top-gap">
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
    subtitle: "更新当前申请状态，并同步备注给学生端。",
    body: `
      <form class="demo-form" id="process-application-form">
        <div class="application-detail-grid">
          <div class="compact-item"><strong>${item.studentName || "-"}</strong><div class="job-card-company">${item.jobTitle || "-"}</div></div>
          <div class="compact-item"><strong>附件</strong><div class="job-card-company">${renderAttachmentLink(item.resumeUrl, "查看附件")}</div></div>
          <div class="compact-item field-span-2"><strong>当前状态</strong><p>${applicationStatusText(item.applyStatus)}</p></div>
        </div>
        <div class="form-grid top-gap">
          <label class="form-field">
            <span>处理状态</span>
            <select name="applyStatus">
              <option value="1" ${Number(item.applyStatus) === 1 ? "selected" : ""}>已查看</option>
              <option value="2" ${Number(item.applyStatus) === 2 ? "selected" : ""}>已内推</option>
              <option value="3" ${Number(item.applyStatus) === 3 ? "selected" : ""}>已驳回</option>
              <option value="4" ${Number(item.applyStatus) === 4 ? "selected" : ""}>已完成</option>
            </select>
          </label>
          <label class="form-field field-span-2">
            <span>处理备注</span>
            <textarea name="processRemark" placeholder="例如：已转交用人部门，建议补充项目经历，或流程已结束。">${item.processRemark || ""}</textarea>
          </label>
        </div>
        <div class="page-action-bar top-gap">
          <div class="action-group">
            <button type="button" class="btn ghost-btn" id="cancel-process-application">取消</button>
            <button type="submit" class="btn">提交结果</button>
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
  const finishedCount = (applications || []).filter((item) => Number(item.applyStatus) === 4).length;
  const recommendationCount = (applications || []).filter((item) => Number(item.applyStatus) === 2).length;

  renderAppLayout("applications", "我的申请", "集中查看投递进度、附件和处理反馈。", `
    <section class="application-shell">
      <section class="application-hero panel reveal">
        <div class="application-hero-copy">
          <span class="section-eyebrow">Applications</span>
          <h2>${currentJob?.jobTitle || "选择一个岗位开始投递"}</h2>
          <p>${currentJob?.companyName || "暂无企业"} / ${currentJob?.city || "-"}</p>
        </div>
        <div class="application-hero-actions">
          <div class="application-contact-card">
            <span>岗位联系方式</span>
            <strong>${currentJob?.contactWechat || currentJob?.contactPhone || currentJob?.contactEmail || currentJob?.contactType || "站内消息"}</strong>
          </div>
          <button class="btn" id="open-application-modal">发起申请</button>
        </div>
      </section>

      <section class="application-metric-row reveal reveal-delay-1">
        <article class="metric-card">
          <span class="metric-label">全部申请</span>
          <strong>${applications.length}</strong>
          <p>已提交的全部记录</p>
        </article>
        <article class="metric-card">
          <span class="metric-label">处理中</span>
          <strong>${processingCount}</strong>
          <p>等待查看或沟通中</p>
        </article>
        <article class="metric-card">
          <span class="metric-label">已内推</span>
          <strong>${recommendationCount}</strong>
          <p>校友已推进到下一步</p>
        </article>
        <article class="metric-card">
          <span class="metric-label">已完成</span>
          <strong>${finishedCount}</strong>
          <p>流程结束的记录</p>
        </article>
      </section>

      <section class="application-board reveal reveal-delay-2">
        <div class="application-column-main panel">
          <div class="panel-header">
            <div>
              <h2>投递记录</h2>
            </div>
          </div>
          <div class="application-record-list" id="application-timeline"></div>
        </div>
        <aside class="application-column-side">
          <section class="panel application-side-card">
            <div class="panel-header">
              <div>
                <h2>当前岗位</h2>
              </div>
            </div>
            <div class="application-side-stack">
              <div class="info-row-card"><span>岗位名称</span><strong>${currentJob?.jobTitle || "-"}</strong></div>
              <div class="info-row-card"><span>企业与城市</span><strong>${currentJob?.companyName || "-"} / ${currentJob?.city || "-"}</strong></div>
              <div class="info-row-card"><span>联系方式</span><strong>${currentJob?.contactWechat || currentJob?.contactPhone || currentJob?.contactEmail || currentJob?.contactType || "站内消息"}</strong></div>
            </div>
          </section>
        </aside>
      </section>
    </section>
  `);

  const timelineNode = document.getElementById("application-timeline");
  const rerender = () => {
    timelineNode.innerHTML = (applications || []).map((item) => renderApplicationRecordCard(item, {
      studentSide: true,
      showActions: true
    })).join("") || `<div class="empty-state">暂无投递记录。</div>`;
    timelineNode.querySelectorAll(".detail-application-btn").forEach((button) => {
      button.addEventListener("click", () => {
        const item = applications.find((record) => Number(record.id) === Number(button.dataset.id));
        openApplicationDetail(item);
      });
    });
    timelineNode.querySelectorAll(".cancel-application-btn").forEach((button) => {
      button.addEventListener("click", () => {
        openApplicationCancel(Number(button.dataset.id), async () => location.reload());
      });
    });
  };
  rerender();

  document.getElementById("open-application-modal").addEventListener("click", () => {
    openApplicationComposer(jobs, currentJob?.id, applications, async (payload, id) => {
      const job = jobs.find((item) => Number(item.id) === Number(payload.jobId));
      applications.unshift({
        id,
        jobId: Number(payload.jobId),
        jobTitle: job?.jobTitle || "新申请",
        companyName: job?.companyName || "-",
        alumniName: job?.alumniName || "待处理",
        resumeUrl: payload.resumeUrl,
        selfIntroduction: payload.selfIntroduction,
        matchScore: "85",
        applyStatus: 0,
        processRemark: "申请已提交，等待校友查看。",
        applyTime: new Date().toISOString(),
        city: job?.city || "-",
        contactType: job?.contactType || "站内消息"
      });
      rerender();
    });
  });
}

function renderAlumniApplications(applications) {
  const waiting = (applications || []).filter((item) => Number(item.applyStatus) === 0 || Number(item.applyStatus) === 1).length;
  const recommended = (applications || []).filter((item) => Number(item.applyStatus) === 2).length;
  const finished = (applications || []).filter((item) => Number(item.applyStatus) === 4).length;

  renderAppLayout("applications", "学生申请", "查看投递到你岗位上的申请，并在弹窗中完成处理。", `
    <section class="application-shell">
      <section class="application-metric-row reveal">
        <article class="metric-card">
          <span class="metric-label">收到申请</span>
          <strong>${applications.length}</strong>
          <p>全部投递记录</p>
        </article>
        <article class="metric-card">
          <span class="metric-label">待处理</span>
          <strong>${waiting}</strong>
          <p>尚未完成推进</p>
        </article>
        <article class="metric-card">
          <span class="metric-label">已内推</span>
          <strong>${recommended}</strong>
          <p>已推荐给企业</p>
        </article>
        <article class="metric-card">
          <span class="metric-label">已完成</span>
          <strong>${finished}</strong>
          <p>流程结束记录</p>
        </article>
      </section>

      <section class="panel reveal reveal-delay-1">
        <div class="panel-header">
          <div>
            <h2>申请列表</h2>
          </div>
        </div>
        <div class="application-record-list" id="alumni-application-timeline"></div>
      </section>
    </section>
  `);

  const timelineNode = document.getElementById("alumni-application-timeline");
  timelineNode.innerHTML = (applications || []).map((item) => renderApplicationRecordCard(item, {
    studentSide: false,
    showActions: true
  })).join("") || `<div class="empty-state">当前还没有学生投递到你的岗位。</div>`;

  timelineNode.querySelectorAll("[data-process-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const current = applications.find((item) => Number(item.id) === Number(button.dataset.processId));
      if (!current) {
        return;
      }
      openApplicationProcessor(current, async () => location.reload());
    });
  });
  timelineNode.querySelectorAll(".detail-application-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const current = applications.find((item) => Number(item.id) === Number(button.dataset.id));
      openApplicationDetail(current);
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
