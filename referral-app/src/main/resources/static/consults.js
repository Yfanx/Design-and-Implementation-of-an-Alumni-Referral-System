const CONSULT_ROLE_ALUMNI = 1;
const CONSULT_ROLE_STUDENT = 2;

async function loadConsultContext(session) {
  const requests = [
    apiRequest("/referral/consult-message/list"),
    session.role === "ALUMNI" ? apiRequest("/referral/job-info/list") : apiRequest("/referral/job-info/match-list"),
    apiRequest("/referral/referral-application/list")
  ];
  const [consultResult, jobResult, applicationResult] = await Promise.all(requests);
  return {
    consults: consultResult.data?.list || [],
    jobs: jobResult.data?.list || [],
    applications: applicationResult.data?.list || []
  };
}

function consultRoleName(role) {
  if (Number(role) === CONSULT_ROLE_ALUMNI) {
    return "校友";
  }
  if (Number(role) === CONSULT_ROLE_STUDENT) {
    return "学生";
  }
  return "用户";
}

function myConsultsForSession(consults, session) {
  return (consults || [])
    .filter((item) => Number(item.senderUserId) === Number(session.userId) || Number(item.receiverUserId) === Number(session.userId))
    .sort((left, right) => Number(right.id || 0) - Number(left.id || 0));
}

function buildJobMap(jobs) {
  return new Map((jobs || []).map((item) => [Number(item.id), item]));
}

function buildConsultableJobs(applications, jobMap) {
  const merged = new Map();
  (applications || []).forEach((item) => {
    const jobId = Number(item.jobId);
    if (!jobId || merged.has(jobId)) {
      return;
    }
    const job = jobMap.get(jobId) || {};
    merged.set(jobId, {
      jobId,
      jobTitle: item.jobTitle || job.jobTitle || `岗位 ${jobId}`,
      companyName: job.companyName || "-",
      alumniId: item.alumniId || job.alumniId || null,
      alumniName: item.alumniName || "",
      city: job.city || "-",
      applyStatus: item.applyStatus,
      processRemark: item.processRemark || "",
      matchScore: item.matchScore || "-"
    });
  });
  return Array.from(merged.values());
}

const alumniUserCache = new Map();

async function resolveAlumniUser(alumniId) {
  const normalizedId = Number(alumniId);
  if (!normalizedId) {
    return null;
  }
  if (alumniUserCache.has(normalizedId)) {
    return alumniUserCache.get(normalizedId);
  }
  const result = await apiRequest(`/referral/alumni-info/get?id=${normalizedId}`);
  const payload = {
    alumniId: normalizedId,
    userId: result.data?.userId || null,
    displayName: result.data?.realName || "对应校友",
    companyName: result.data?.companyName || ""
  };
  alumniUserCache.set(normalizedId, payload);
  return payload;
}

function threadPartnerUserId(item, session) {
  return Number(item.senderUserId) === Number(session.userId) ? item.receiverUserId : item.senderUserId;
}

function jobTitleFor(item, jobMap, consultableJobs = []) {
  const matched = consultableJobs.find((job) => Number(job.jobId) === Number(item.jobId));
  return matched?.jobTitle || jobMap.get(Number(item.jobId))?.jobTitle || `岗位 ${item.jobId || "-"}`;
}

function companyNameFor(item, jobMap, consultableJobs = []) {
  const matched = consultableJobs.find((job) => Number(job.jobId) === Number(item.jobId));
  return matched?.companyName || jobMap.get(Number(item.jobId))?.companyName || "-";
}

function renderConsultTimeline(consults, session, jobMap, consultableJobs = []) {
  if (!consults.length) {
    return `<div class="timeline-item empty-state">当前还没有咨询消息，发起一次咨询后会显示在这里。</div>`;
  }
  return consults.map((item) => {
    const unread = Number(item.receiverUserId) === Number(session.userId) && Number(item.readStatus) !== 1;
    const partnerId = threadPartnerUserId(item, session);
    const senderCopy = Number(item.senderUserId) === Number(session.userId)
      ? "我发出的消息"
      : `${consultRoleName(item.senderRole)}发来的消息`;
    return `
      <div class="timeline-item ${unread ? "timeline-unread" : ""}">
        <div class="split-header">
          <div>
            <strong>${jobTitleFor(item, jobMap, consultableJobs)}</strong>
            <div class="job-card-company">${companyNameFor(item, jobMap, consultableJobs)} / ${senderCopy}</div>
          </div>
          <span class="meta-tag">${formatDateTime(item.sendTime)}</span>
        </div>
        <div class="meta-row">
          <span class="meta-tag">岗位 ID：${item.jobId || "-"}</span>
          <span class="meta-tag">${Number(item.senderUserId) === Number(session.userId) ? "发送给" : "来自"} 用户 ${partnerId || "-"}</span>
          <span class="meta-tag ${unread ? "warn" : ""}">${unread ? "未读" : "已读"}</span>
        </div>
        <p>${item.content || "-"}</p>
      </div>
    `;
  }).join("");
}

function buildAlumniThreads(consults, session, jobMap) {
  const threads = new Map();
  (consults || []).forEach((item) => {
    const otherUserId = Number(threadPartnerUserId(item, session));
    const key = `${item.jobId}-${otherUserId}`;
    if (!threads.has(key)) {
      const job = jobMap.get(Number(item.jobId)) || {};
      threads.set(key, {
        key,
        jobId: Number(item.jobId),
        receiverUserId: otherUserId,
        jobTitle: job.jobTitle || `岗位 ${item.jobId || "-"}`,
        companyName: job.companyName || "-",
        latestTime: item.sendTime,
        unreadCount: 0
      });
    }
    const current = threads.get(key);
    if (Number(item.receiverUserId) === Number(session.userId) && Number(item.readStatus) !== 1) {
      current.unreadCount += 1;
    }
  });
  return Array.from(threads.values()).sort((left, right) =>
    String(right.latestTime || "").localeCompare(String(left.latestTime || ""))
  );
}

async function markIncomingConsultsRead(consults, session) {
  const unreadIncoming = (consults || []).filter((item) =>
    Number(item.receiverUserId) === Number(session.userId) && Number(item.readStatus) !== 1
  );
  if (!unreadIncoming.length) {
    return;
  }
  await Promise.all(unreadIncoming.map((item) =>
    apiRequest(`/referral/consult-message/mark-read?id=${item.id}`, { method: "PUT" }).catch(() => null)
  ));
  unreadIncoming.forEach((item) => {
    item.readStatus = 1;
  });
}

function openStudentConsultComposer(session, consultableJobs, defaultJobId, onSent) {
  const jobMap = new Map((consultableJobs || []).map((item) => [Number(item.jobId), item]));
  const initialJob = jobMap.get(Number(defaultJobId)) || consultableJobs[0];
  openPageModal({
    title: "发起岗位咨询",
    subtitle: "这里只能围绕你已投递的岗位发起咨询，系统会自动匹配对应校友。",
    size: "wide",
    body: `
      <form class="demo-form" id="student-consult-form">
        <div class="form-grid">
          <label class="form-field field-span-2">
            <span>咨询岗位</span>
            <select name="jobId" id="student-consult-job-select">
              ${(consultableJobs || []).map((item) => `
                <option value="${item.jobId}" ${Number(item.jobId) === Number(initialJob?.jobId) ? "selected" : ""}>
                  ${item.jobTitle} / ${item.companyName}
                </option>
              `).join("")}
            </select>
          </label>
          <label class="form-field">
            <span>公司与城市</span>
            <input id="student-consult-company" value="${initialJob?.companyName || "-"} / ${initialJob?.city || "-"}" readonly>
          </label>
          <label class="form-field">
            <span>当前进度</span>
            <input id="student-consult-status" value="${initialJob?.processRemark || "已投递，等待进一步沟通"}" readonly>
          </label>
          <label class="form-field field-span-2">
            <span>咨询内容</span>
            <textarea name="content" id="student-consult-content">您好，我已经投递“${initialJob?.jobTitle || ""}”，想进一步了解这个岗位更看重哪些项目经验，以及简历中应该重点突出哪些内容。</textarea>
          </label>
        </div>
        <div class="page-action-bar top-gap">
          <div class="page-action-note" id="student-consult-target">正在匹配对应校友账号...</div>
          <div class="action-group">
            <button type="button" class="btn ghost-btn" id="cancel-student-consult">取消</button>
            <button type="submit" class="btn" id="submit-student-consult">发送咨询</button>
          </div>
        </div>
      </form>
      <div id="student-consult-result" class="action-result">发送后会自动刷新消息记录。</div>
    `,
    onReady(body) {
      const resultNode = body.querySelector("#student-consult-result");
      const targetNode = body.querySelector("#student-consult-target");
      const companyNode = body.querySelector("#student-consult-company");
      const statusNode = body.querySelector("#student-consult-status");
      const contentNode = body.querySelector("#student-consult-content");
      const submitNode = body.querySelector("#submit-student-consult");
      let resolvedReceiverUserId = null;

      const syncJob = async (jobId) => {
        const current = jobMap.get(Number(jobId));
        if (!current) {
          return;
        }
        companyNode.value = `${current.companyName || "-"} / ${current.city || "-"}`;
        statusNode.value = current.processRemark || "已投递，等待进一步沟通";
        contentNode.value = `您好，我已经投递“${current.jobTitle}”，想进一步了解这个岗位更看重哪些项目经验，以及简历中应该重点突出哪些内容。`;
        const alumni = await resolveAlumniUser(current.alumniId);
        resolvedReceiverUserId = alumni?.userId || null;
        targetNode.textContent = resolvedReceiverUserId
          ? `将发送给 ${alumni?.displayName || "对应校友"}，系统已自动完成匹配。`
          : "当前岗位暂未匹配到可用校友账号，请稍后再试。";
        submitNode.disabled = !resolvedReceiverUserId;
      };

      body.querySelector("#cancel-student-consult").addEventListener("click", closePageModal);
      body.querySelector("#student-consult-job-select").addEventListener("change", (event) => syncJob(event.target.value));
      body.querySelector("#student-consult-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const payload = formPayload(event.target);
        if (!resolvedReceiverUserId) {
          resultNode.innerText = "当前岗位暂未匹配到可用校友账号，暂时不能发送。";
          return;
        }
        payload.receiverUserId = resolvedReceiverUserId;
        payload.senderUserId = session.userId;
        payload.senderRole = CONSULT_ROLE_STUDENT;
        payload.receiverRole = CONSULT_ROLE_ALUMNI;
        try {
          const response = await apiRequest("/referral/consult-message/send", {
            method: "POST",
            body: JSON.stringify(payload)
          });
          resultNode.innerText = `咨询已发送，消息 ID：${response.data}`;
          await onSent();
          setTimeout(() => closePageModal(), 400);
        } catch (error) {
          resultNode.innerText = error.message || "发送失败，请稍后重试。";
        }
      });

      syncJob(initialJob?.jobId);
    }
  });
}

function openAlumniConsultComposer(session, threads, defaultKey, onSent) {
  const threadMap = new Map((threads || []).map((item) => [item.key, item]));
  const initial = threadMap.get(defaultKey) || threads[0];
  openPageModal({
    title: "回复学生",
    subtitle: "只能从已有咨询线程里回复学生，系统会自动绑定岗位与收件人。",
    size: "wide",
    body: `
      <form class="demo-form" id="alumni-consult-form">
        <div class="form-grid">
          <label class="form-field field-span-2">
            <span>选择对话线程</span>
            <select id="alumni-thread-select">
              ${(threads || []).map((item) => `
                <option value="${item.key}" ${item.key === initial?.key ? "selected" : ""}>
                  ${item.jobTitle} / 学生 ${item.receiverUserId}${item.unreadCount ? ` / 未读 ${item.unreadCount}` : ""}
                </option>
              `).join("")}
            </select>
          </label>
          <label class="form-field">
            <span>岗位与公司</span>
            <input id="alumni-thread-job" value="${initial ? `${initial.jobTitle} / ${initial.companyName}` : "暂无"}" readonly>
          </label>
          <label class="form-field">
            <span>对接学生</span>
            <input id="alumni-thread-user" value="${initial ? `用户 ID ${initial.receiverUserId}` : "暂无"}" readonly>
          </label>
          <label class="form-field field-span-2">
            <span>回复内容</span>
            <textarea name="content" id="alumni-thread-content">${initial ? `你好，我已经看到你咨询的“${initial.jobTitle}”。你可以先补充与岗位最相关的项目经历，我再继续帮你看简历和推进建议。` : ""}</textarea>
          </label>
        </div>
        <div class="page-action-bar top-gap">
          <div class="page-action-note">回复内容会直接进入对应岗位的消息线程，学生端会同步看到。</div>
          <div class="action-group">
            <button type="button" class="btn ghost-btn" id="cancel-alumni-consult">取消</button>
            <button type="submit" class="btn">发送回复</button>
          </div>
        </div>
      </form>
      <div id="alumni-consult-result" class="action-result">发送后会自动刷新消息记录。</div>
    `,
    onReady(body) {
      const resultNode = body.querySelector("#alumni-consult-result");
      const jobNode = body.querySelector("#alumni-thread-job");
      const userNode = body.querySelector("#alumni-thread-user");
      const contentNode = body.querySelector("#alumni-thread-content");
      let current = initial;

      const syncThread = (threadKey) => {
        current = threadMap.get(threadKey) || threads[0];
        if (!current) {
          return;
        }
        jobNode.value = `${current.jobTitle} / ${current.companyName}`;
        userNode.value = `用户 ID ${current.receiverUserId}`;
        contentNode.value = `你好，我已经看到你咨询的“${current.jobTitle}”。你可以先补充与岗位最相关的项目经历，我再继续帮你看简历和推进建议。`;
      };

      body.querySelector("#cancel-alumni-consult").addEventListener("click", closePageModal);
      body.querySelector("#alumni-thread-select").addEventListener("change", (event) => syncThread(event.target.value));
      body.querySelector("#alumni-consult-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const payload = formPayload(event.target);
        payload.jobId = current.jobId;
        payload.senderUserId = session.userId;
        payload.receiverUserId = current.receiverUserId;
        payload.senderRole = CONSULT_ROLE_ALUMNI;
        payload.receiverRole = CONSULT_ROLE_STUDENT;
        try {
          const response = await apiRequest("/referral/consult-message/send", {
            method: "POST",
            body: JSON.stringify(payload)
          });
          resultNode.innerText = `回复已发送，消息 ID：${response.data}`;
          await onSent();
          setTimeout(() => closePageModal(), 400);
        } catch (error) {
          resultNode.innerText = error.message || "发送失败，请稍后重试。";
        }
      });
    }
  });
}

function renderStudentConsults(session, consults, jobs, applications, query) {
  const jobMap = buildJobMap(jobs);
  const consultableJobs = buildConsultableJobs(applications, jobMap);
  const selectedJobId = Number(query.get("jobId")) || consultableJobs[0]?.jobId || null;

  if (!consultableJobs.length) {
    renderAppLayout("consults", "消息中心", "围绕你已投递的岗位与校友继续沟通。", `
      <section class="panel">
        <div class="panel-header">
          <div>
            <h2>还没有可咨询的岗位</h2>
            <p>这里只展示你已经投递过的岗位。请先去申请页提交一条内推申请，再回来发起咨询。</p>
          </div>
        </div>
        <div class="compact-item">
          <strong>建议操作</strong>
          <div class="job-card-company">先前往“我的申请”投递简历，系统会自动把对应岗位和校友带到消息页。</div>
        </div>
      </section>
    `);
    return;
  }

  const selectedJob = consultableJobs.find((item) => Number(item.jobId) === selectedJobId) || consultableJobs[0];
  const myConsults = myConsultsForSession(consults, session);

  renderAppLayout("consults", "消息中心", "仅基于你已投递的岗位发起咨询，系统会自动匹配对应校友。", `
    <div class="content-grid">
      <section class="panel">
        <div class="page-action-bar">
          <div>
            <strong>发起岗位咨询</strong>
            <div class="page-action-note">当前默认岗位：${selectedJob.jobTitle} / ${selectedJob.companyName}</div>
          </div>
          <div class="action-group">
            <button class="btn" id="open-student-consult-btn">发起咨询</button>
          </div>
        </div>
        <div class="compact-list">
          <div class="compact-item"><strong>咨询范围</strong><p>这里只展示你已投递过的岗位，避免消息发错对象。</p></div>
          <div class="compact-item"><strong>校友匹配</strong><p>接收校友由岗位归属自动决定，无需手动填写用户编号。</p></div>
          <div class="compact-item"><strong>推荐提问</strong><p>可以围绕岗位要求、简历优化、项目匹配度和后续推进节奏来咨询。</p></div>
        </div>
      </section>
      <section class="panel">
        <div class="panel-header">
          <div>
            <h2>我的消息记录</h2>
            <p>进入页面后会自动把收件消息标记为已读。</p>
          </div>
        </div>
        <div class="timeline">${renderConsultTimeline(myConsults, session, jobMap, consultableJobs)}</div>
      </section>
    </div>
  `);

  document.getElementById("open-student-consult-btn").addEventListener("click", () => {
    openStudentConsultComposer(session, consultableJobs, selectedJob.jobId, async () => location.reload());
  });
}

function renderAlumniConsults(session, consults, jobs) {
  const jobMap = buildJobMap(jobs);
  const myConsults = myConsultsForSession(consults, session);
  const threads = buildAlumniThreads(myConsults, session, jobMap);

  renderAppLayout("consults", "消息中心", "优先按已发生的咨询线程回复学生，避免手动填写岗位和用户编号。", `
    <div class="content-grid">
      <section class="panel">
        <div class="page-action-bar">
          <div>
            <strong>回复学生</strong>
            <div class="page-action-note">${threads.length ? `当前共有 ${threads.length} 条可回复线程` : "暂时还没有学生发起咨询"}</div>
          </div>
          <div class="action-group">
            <button class="btn" id="open-alumni-consult-btn" ${threads.length ? "" : "disabled"}>回复消息</button>
          </div>
        </div>
        <div class="compact-list">
          <div class="compact-item"><strong>线程规则</strong><p>线程按“岗位 + 学生”维度组织，回复时系统自动绑定正确对象。</p></div>
          <div class="compact-item"><strong>权限边界</strong><p>你只能回复自己岗位上的咨询，无法越权给其他岗位学生发消息。</p></div>
        </div>
      </section>
      <section class="panel">
        <div class="panel-header">
          <div>
            <h2>消息记录</h2>
            <p>这里只展示与你相关的全部沟通记录，未读消息进入页面后会自动标记为已读。</p>
          </div>
        </div>
        <div class="timeline">${renderConsultTimeline(myConsults, session, jobMap)}</div>
      </section>
    </div>
  `);

  const trigger = document.getElementById("open-alumni-consult-btn");
  if (trigger) {
    trigger.addEventListener("click", () => {
      openAlumniConsultComposer(session, threads, threads[0]?.key, async () => location.reload());
    });
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const session = ensureLogin();
  const query = new URLSearchParams(location.search);
  const context = await loadConsultContext(session);
  const myConsults = myConsultsForSession(context.consults, session);

  await markIncomingConsultsRead(myConsults, session);

  if (session.role === "ALUMNI") {
    renderAlumniConsults(session, myConsults, context.jobs);
    return;
  }

  renderStudentConsults(session, myConsults, context.jobs, context.applications, query);

  if (query.get("jobId")) {
    setTimeout(() => {
      document.getElementById("open-student-consult-btn")?.click();
    }, 0);
  }
});
