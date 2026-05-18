const CONSULT_ROLE_ALUMNI = 1;
const CONSULT_ROLE_STUDENT = 2;
const APPLICATION_STATUS_CANCELLED = 5;
const alumniUserCache = new Map();

async function loadConsultContext(session) {
  const [consultResult, jobResult, applicationResult] = await Promise.all([
    apiRequest("/referral/consult-message/list"),
    session.role === "ALUMNI" ? apiRequest("/referral/job-info/list") : apiRequest("/referral/job-info/match-list"),
    apiRequest("/referral/referral-application/list")
  ]);

  return {
    consults: consultResult.data?.list || [],
    jobs: jobResult.data?.list || [],
    applications: applicationResult.data?.list || []
  };
}

function mineOnly(consults, session) {
  return (consults || []).filter((item) =>
    Number(item.senderUserId) === Number(session.userId) || Number(item.receiverUserId) === Number(session.userId)
  );
}

function sortMessages(messages) {
  return (messages || []).slice().sort((left, right) => {
    const leftKey = `${left.sendTime || ""}-${String(left.id || "").padStart(10, "0")}`;
    const rightKey = `${right.sendTime || ""}-${String(right.id || "").padStart(10, "0")}`;
    return leftKey.localeCompare(rightKey);
  });
}

function previewText(content) {
  const text = String(content || "").trim();
  if (!text) {
    return "暂无消息";
  }
  return text.length > 34 ? `${text.slice(0, 34)}...` : text;
}

function buildJobMap(jobs) {
  return new Map((jobs || []).map((item) => [Number(item.id), item]));
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

function isActiveApplication(item) {
  return Number(item?.applyStatus) !== APPLICATION_STATUS_CANCELLED;
}

function buildStudentConsultableJobs(applications, jobs) {
  const jobMap = buildJobMap(jobs);
  const merged = new Map();

  (applications || [])
    .filter(isActiveApplication)
    .forEach((item) => {
      const jobId = Number(item.jobId);
      if (!jobId || merged.has(jobId)) {
        return;
      }

      const job = jobMap.get(jobId) || {};
      merged.set(jobId, {
        applicationId: item.id || null,
        applyStatus: Number(item.applyStatus ?? 0),
        statusText: applicationStageText(item.applyStatus),
        canSend: true,
        jobId,
        jobTitle: item.jobTitle || job.jobTitle || `岗位 ${jobId}`,
        companyName: item.companyName || job.companyName || "校友企业",
        companyLogoUrl: item.companyLogoUrl || job.companyLogoUrl || "",
        city: item.city || job.city || "-",
        alumniId: item.alumniId || job.alumniId || null,
        alumniName: item.alumniName || "对应校友",
        matchScore: item.matchScore || job.matchScore || null,
        processRemark: item.processRemark || ""
      });
    });

  return Array.from(merged.values());
}

async function resolveAlumniUser(alumniId) {
  const id = Number(alumniId);
  if (!id) {
    return null;
  }
  if (alumniUserCache.has(id)) {
    return alumniUserCache.get(id);
  }

  const result = await apiRequest(`/referral/alumni-info/get?id=${id}`);
  const user = {
    alumniId: id,
    userId: result.data?.userId || null,
    displayName: result.data?.realName || "对应校友"
  };
  alumniUserCache.set(id, user);
  return user;
}

function groupMessagesByJob(consults) {
  const grouped = new Map();
  (consults || []).forEach((item) => {
    const jobId = Number(item.jobId);
    if (!jobId) {
      return;
    }
    if (!grouped.has(jobId)) {
      grouped.set(jobId, []);
    }
    grouped.get(jobId).push(item);
  });
  return grouped;
}

function buildStudentConversations(session, consultableJobs, consults) {
  const grouped = groupMessagesByJob(consults);
  return (consultableJobs || [])
    .map((job) => {
      const messages = sortMessages(grouped.get(Number(job.jobId)) || []);
      const latest = messages[messages.length - 1] || null;
      return {
        key: String(job.jobId),
        ...job,
        latestTime: latest?.sendTime || "",
        latestPreview: latest ? previewText(latest.content) : "暂无消息",
        unreadCount: messages.filter((item) =>
          Number(item.receiverUserId) === Number(session.userId) && Number(item.readStatus) !== 1
        ).length,
        messages
      };
    })
    .sort((left, right) => String(right.latestTime || "").localeCompare(String(left.latestTime || "")));
}

function buildAlumniConversations(session, jobs, applications, consults) {
  const jobMap = buildJobMap(jobs);
  const grouped = groupMessagesByJob(consults);
  const applicationGroups = new Map();

  (applications || []).forEach((item) => {
    const jobId = Number(item.jobId);
    if (!jobId) {
      return;
    }
    if (!applicationGroups.has(jobId)) {
      applicationGroups.set(jobId, []);
    }
    applicationGroups.get(jobId).push(item);
  });

  return Array.from(grouped.entries())
    .map(([jobId, rawMessages]) => {
      const messages = sortMessages(rawMessages);
      const latest = messages[messages.length - 1] || null;
      const job = jobMap.get(Number(jobId)) || {};
      const relatedApplications = applicationGroups.get(Number(jobId)) || [];
      const participantMap = new Map();

      messages.forEach((item) => {
        const outgoing = Number(item.senderUserId) === Number(session.userId);
        const peerUserId = Number(outgoing ? item.receiverUserId : item.senderUserId);
        if (!peerUserId || participantMap.has(peerUserId)) {
          return;
        }

        const application = relatedApplications.find((record) => Number(record.studentUserId) === peerUserId)
          || relatedApplications.find((record) => Number(record.studentId) === Number(item.studentId))
          || relatedApplications[0]
          || {};
        const peerName = outgoing
          ? (item.receiverDisplayName || application.studentName || `学生 ${peerUserId}`)
          : (item.senderDisplayName || application.studentName || `学生 ${peerUserId}`);

        participantMap.set(peerUserId, { userId: peerUserId, displayName: peerName });
      });

      const participants = Array.from(participantMap.values());
      return {
        key: String(jobId),
        jobId: Number(jobId),
        jobTitle: job.jobTitle || relatedApplications[0]?.jobTitle || `岗位 ${jobId}`,
        companyName: job.companyName || relatedApplications[0]?.companyName || "校友企业",
        companyLogoUrl: job.companyLogoUrl || relatedApplications[0]?.companyLogoUrl || "",
        city: job.city || relatedApplications[0]?.city || "-",
        latestTime: latest?.sendTime || "",
        latestPreview: latest ? previewText(latest.content) : "暂无消息",
        unreadCount: messages.filter((item) =>
          Number(item.receiverUserId) === Number(session.userId) && Number(item.readStatus) !== 1
        ).length,
        activePeerUserId: participants.find((item) => Number(item.userId) === Number(latest?.senderUserId))?.userId
          || participants[0]?.userId
          || null,
        participants,
        messages
      };
    })
    .sort((left, right) => String(right.latestTime || "").localeCompare(String(left.latestTime || "")));
}

function consultInitial(name, fallback = "友") {
  const text = String(name || "").trim();
  return text ? text.slice(0, 1).toUpperCase() : fallback;
}

function buildConsultAvatar(name, tone = "blue", fallback = "友") {
  return `<span class="consult-avatar consult-avatar-${tone}">${escapeHtml(consultInitial(name, fallback))}</span>`;
}

function buildConsultAssetIcon(path, alt, className = "consult-asset-icon") {
  return `<img class="${className}" src="${path}" alt="${escapeHtml(alt || "")}" loading="lazy">`;
}

function resolveConsultBrandAsset(companyName) {
  const text = String(companyName || "").trim();
  if (/华为/.test(text)) return "/alumni-icons/svg/logos_placeholders/brand-huawei-placeholder.svg";
  if (/阿里|阿里云/.test(text)) return "/alumni-icons/svg/logos_placeholders/brand-alibaba-cloud-placeholder.svg";
  if (/腾讯/.test(text)) return "/alumni-icons/svg/logos_placeholders/brand-tencent-placeholder.svg";
  if (/字节/.test(text)) return "/alumni-icons/svg/logos_placeholders/brand-bytedance-placeholder.svg";
  if (/美团/.test(text)) return "/alumni-icons/svg/logos_placeholders/brand-meituan-placeholder.svg";
  if (/百度/.test(text)) return "/alumni-icons/svg/logos_placeholders/brand-baidu-placeholder.svg";
  return "";
}

function buildConsultCompanyVisual(companyName, logoUrl = "") {
  const safeLogoUrl = sanitizeAttachmentUrl(logoUrl);
  if (safeLogoUrl) {
    return `
      <span class="consult-thread-brand is-image">
        <img class="consult-thread-brand-image" src="${safeLogoUrl}" alt="${escapeHtml(companyName || "企业")} logo">
      </span>
    `;
  }
  const assetPath = resolveConsultBrandAsset(companyName);
  if (assetPath) {
    return `
      <span class="consult-thread-brand">
        ${buildConsultAssetIcon(assetPath, `${companyName || "企业"} 图标`, "consult-thread-brand-image is-vector")}
      </span>
    `;
  }
  return `<span class="consult-thread-brand is-fallback">${escapeHtml(String(companyName || "企").slice(0, 1))}</span>`;
}

function buildConsultMetricIcon(type) {
  const icons = {
    chat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 18.5 3.5 20V6.5A1.5 1.5 0 0 1 5 5h14A1.5 1.5 0 0 1 20.5 6.5v9A1.5 1.5 0 0 1 19 17H8l-2 1.5Z"></path><path d="M8 9h8"></path><path d="M8 12h5"></path></svg>',
    reply: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 8 4 12l5 4"></path><path d="M20 18c0-4.4-3.6-8-8-8H4"></path></svg>',
    chart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19.5V11"></path><path d="M12 19.5V6"></path><path d="M19 19.5V14"></path><path d="M3.5 19.5h17"></path></svg>',
    idea: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18.5h6"></path><path d="M10 21h4"></path><path d="M12 3.5a6.5 6.5 0 0 0-4 11.6c.7.6 1.2 1.3 1.5 2.1h5c.3-.8.8-1.5 1.5-2.1A6.5 6.5 0 0 0 12 3.5Z"></path></svg>',
    flow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h7"></path><path d="M12 7 9.5 4.5"></path><path d="M12 7 9.5 9.5"></path><path d="M19 17h-7"></path><path d="M12 17 14.5 14.5"></path><path d="M12 17 14.5 19.5"></path></svg>',
    smile: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"></circle><path d="M9 10h.01"></path><path d="M15 10h.01"></path><path d="M8.5 14.5c1 1.2 2.2 1.8 3.5 1.8s2.5-.6 3.5-1.8"></path></svg>',
    search: buildConsultAssetIcon("/alumni-icons/svg/page-message-center/message-search.svg", "搜索", "consult-inline-svg-icon"),
    more: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none"></circle><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"></circle><circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none"></circle></svg>',
    emoji: buildConsultAssetIcon("/alumni-icons/svg/page-message-center/message-emoji.svg", "表情", "consult-inline-svg-icon")
  };
  return `<span class="consult-mini-icon consult-mini-icon-${type}">${icons[type] || icons.chat}</span>`;
}

function buildConsultSuggestionCard(icon, title, description) {
  const assetMap = {
    flow: "/alumni-icons/svg/page-message-center/message-advice-follow-progress.svg",
    idea: "/alumni-icons/svg/page-message-center/message-advice-learn-position.svg",
    smile: "/alumni-icons/svg/page-message-center/message-advice-professional.svg"
  };
  const assetPath = assetMap[icon];
  return `
    <div class="consult-suggestion-card">
      <div class="consult-suggestion-icon">
        ${assetPath ? buildConsultAssetIcon(assetPath, title, "consult-suggestion-asset-icon") : buildConsultMetricIcon(icon)}
      </div>
      <div class="consult-suggestion-copy">
        <strong>${escapeHtml(title)}</strong>
        <p>${escapeHtml(description)}</p>
      </div>
    </div>
  `;
}

function renderConversationList(conversations, selectedKey, role) {
  if (!conversations.length) {
    return `
      <div class="consult-empty-list">
        <strong>暂无会话</strong>
        <p>${role === "STUDENT" ? "请先投递有效岗位，撤回申请后不会继续出现在消息中心。" : "当前还没有学生围绕岗位发起咨询。"}</p>
      </div>
    `;
  }

  return conversations.map((item) => {
    const subtitle = role === "STUDENT"
      ? `${item.companyName} / ${item.alumniName || "对应校友"}`
      : `${item.companyName} / ${item.participants.length} 位学生`;
    const peerName = role === "STUDENT"
      ? (item.alumniName || "校友")
      : (item.participants[0]?.displayName || "学生");
    return `
      <button type="button" class="consult-thread-card ${item.key === String(selectedKey) ? "is-active" : ""}" data-thread-key="${item.key}">
        <div class="consult-thread-avatar-wrap">
          ${buildConsultAvatar(peerName, role === "STUDENT" ? "slate" : "gold", role === "STUDENT" ? "校" : "生")}
        </div>
        <div class="consult-thread-main">
          <div class="split-header consult-thread-title-row">
            <div class="consult-thread-job-block">
              ${buildConsultCompanyVisual(item.companyName, item.companyLogoUrl)}
              <strong>${escapeHtml(item.jobTitle)}</strong>
            </div>
            <span class="consult-thread-time">${item.latestTime ? formatDateTime(item.latestTime) : "暂无"}</span>
          </div>
          <div class="consult-thread-subtitle">${escapeHtml(subtitle)}</div>
          <div class="consult-thread-pill-row">
            ${item.city ? `<span class="consult-thread-pill">${escapeHtml(item.city)}</span>` : ""}
            ${role === "STUDENT" && item.statusText ? `<span class="consult-thread-pill">${escapeHtml(item.statusText)}</span>` : ""}
          </div>
          <p>${escapeHtml(item.latestPreview)}</p>
        </div>
        <div class="consult-thread-side">
          ${role === "STUDENT" && item.matchScore != null ? `<span class="match-badge">${asNumber(item.matchScore)}%</span>` : ""}
          ${item.unreadCount ? `<span class="consult-unread-dot"><img class="consult-unread-dot-icon" src="/alumni-icons/svg/page-message-center/message-unread-dot.svg" alt=""><span>${item.unreadCount}</span></span>` : ""}
          <span class="consult-thread-chevron">${buildConsultAssetIcon("/alumni-icons/svg/page-message-center/message-row-chevron.svg", "展开", "consult-inline-svg-icon")}</span>
        </div>
      </button>
    `;
  }).join("");
}

function renderMessageBubbles(messages, session) {
  if (!messages.length) {
    return `
      <div class="consult-chat-empty">
        <strong>还没有消息</strong>
        <p>可以先发送一条问题，围绕岗位信息继续沟通。</p>
      </div>
    `;
  }

  return messages.map((item) => {
    const outgoing = Number(item.senderUserId) === Number(session.userId);
    const name = outgoing ? "我" : (item.senderDisplayName || "对方");
    return `
      <div class="consult-bubble-row ${outgoing ? "is-self" : "is-peer"}">
        ${outgoing ? "" : `<div class="consult-bubble-avatar">${buildConsultAvatar(name, "slate", "校")}</div>`}
        <div class="consult-bubble-stack">
          <div class="consult-bubble-meta">
            <span>${escapeHtml(name)}</span>
            <span>${formatDateTime(item.sendTime)}</span>
          </div>
          <div class="consult-bubble ${outgoing ? "is-self" : "is-peer"}">${escapeHtml(item.content || "")}</div>
        </div>
      </div>
    `;
  }).join("");
}

function renderStudentComposer(conversation) {
  const disabled = conversation.canSend ? "" : "disabled";
  const resultText = conversation.canSend ? "准备发送" : "当前申请状态不可继续咨询";

  return `
    <form id="consult-send-form" class="consult-composer ${conversation.canSend ? "" : "is-disabled"}">
      <input type="hidden" name="jobId" value="${conversation.jobId}">
      <div class="consult-composer-head">
        <span class="meta-tag">${escapeHtml(conversation.alumniName || "对应校友")}</span>
        <a class="btn ghost-btn" href="/job-detail.html?id=${conversation.jobId}">岗位详情</a>
      </div>
      <textarea name="content" placeholder="输入你想咨询的问题，例如岗位要求、流程进度或投递建议" required ${disabled}></textarea>
      <div class="consult-composer-actions">
        <div id="consult-send-result" class="action-result">${resultText}</div>
        <button type="submit" class="btn" ${disabled}>发送消息</button>
      </div>
    </form>
  `;
}

function renderAlumniComposer(conversation) {
  const disabled = conversation.participants.length ? "" : "disabled";
  const resultText = conversation.participants.length ? "准备发送" : "当前没有可回复的学生";

  return `
    <form id="consult-send-form" class="consult-composer">
      <input type="hidden" name="jobId" value="${conversation.jobId}">
      <div class="consult-composer-head consult-composer-head-alumni">
        <label class="form-field consult-inline-field">
          <span>回复对象</span>
          <select name="receiverUserId" ${disabled}>
            ${conversation.participants.map((item) => `
              <option value="${item.userId}" ${Number(item.userId) === Number(conversation.activePeerUserId) ? "selected" : ""}>
                ${escapeHtml(item.displayName)}
              </option>
            `).join("")}
          </select>
        </label>
        <a class="btn ghost-btn" href="/applications.html">查看申请</a>
      </div>
      <textarea name="content" placeholder="输入回复内容" required ${disabled}></textarea>
      <div class="consult-composer-actions">
        <div id="consult-send-result" class="action-result">${resultText}</div>
        <button type="submit" class="btn" ${disabled}>发送消息</button>
      </div>
    </form>
  `;
}

function renderChatPane(role, conversation, session) {
  if (!conversation) {
    return `
      <section class="panel consult-chat-panel">
        <div class="consult-chat-empty">
          <strong>暂无可展示的会话</strong>
          <p>${role === "STUDENT" ? "只有有效申请关联的岗位才会出现在这里。" : "等待学生就岗位发起咨询后，这里会显示完整对话。"}
          </p>
        </div>
      </section>
    `;
  }

  const headerMeta = role === "STUDENT"
    ? `${conversation.companyName} / ${conversation.alumniName || "对应校友"}`
    : `${conversation.companyName} / ${conversation.participants.length} 位学生`;

  return `
    <section class="panel consult-chat-panel">
      <div class="consult-chat-header">
        <div>
          <h2>${escapeHtml(conversation.jobTitle)}</h2>
          <p>${escapeHtml(headerMeta)}</p>
        </div>
        <div class="meta-row">
          <span class="meta-tag">${escapeHtml(conversation.city || "城市待定")}</span>
          ${role === "STUDENT" ? `<span class="meta-tag">${escapeHtml(conversation.statusText || "处理中")}</span>` : ""}
          ${role === "STUDENT" && conversation.matchScore != null ? `<span class="meta-tag">${asNumber(conversation.matchScore)}%</span>` : ""}
        </div>
      </div>
      ${role === "STUDENT" && conversation.processRemark ? `
        <div class="application-note-block subtle consult-progress-note">
          <span>当前申请说明</span>
          <p>${escapeHtml(conversation.processRemark)}</p>
        </div>
      ` : ""}
      <div id="consult-chat-stream" class="consult-chat-stream">${renderMessageBubbles(conversation.messages, session)}</div>
      ${role === "STUDENT" ? renderStudentComposer(conversation) : renderAlumniComposer(conversation)}
    </section>
  `;
}

async function markConversationRead(conversation, session) {
  const unread = (conversation?.messages || []).filter((item) =>
    Number(item.receiverUserId) === Number(session.userId) && Number(item.readStatus) !== 1
  );
  await Promise.all(unread.map((item) =>
    apiRequest(`/referral/consult-message/mark-read?id=${item.id}`, { method: "PUT" }).catch(() => null)
  ));
}

function buildSendPayload(form) {
  const payload = formPayload(form);
  payload.content = String(payload.content || "").trim();
  if (!payload.content) {
    throw new Error("请输入消息内容");
  }
  return payload;
}

async function sendStudentMessage(session, conversation, form) {
  if (!conversation.canSend) {
    throw new Error("当前申请已不可继续咨询");
  }

  const payload = buildSendPayload(form);
  const alumni = await resolveAlumniUser(conversation.alumniId);
  if (!alumni?.userId) {
    throw new Error("当前岗位暂未关联可接收消息的校友账号");
  }

  payload.senderUserId = session.userId;
  payload.senderRole = CONSULT_ROLE_STUDENT;
  payload.receiverUserId = alumni.userId;
  payload.receiverRole = CONSULT_ROLE_ALUMNI;

  return apiRequest("/referral/consult-message/send", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

async function sendAlumniMessage(session, form) {
  const payload = buildSendPayload(form);
  if (!payload.receiverUserId) {
    throw new Error("请选择要回复的学生");
  }

  payload.senderUserId = session.userId;
  payload.senderRole = CONSULT_ROLE_ALUMNI;
  payload.receiverRole = CONSULT_ROLE_STUDENT;

  return apiRequest("/referral/consult-message/send", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

async function refreshContext(state) {
  const context = await loadConsultContext(state.session);
  state.consults = mineOnly(context.consults, state.session);
  state.jobs = context.jobs || [];
  state.applications = context.applications || [];
  state.consultableJobs = buildStudentConsultableJobs(
    state.applications.filter((item) => Number(item.studentId) === Number(state.session.profileId)),
    state.jobs
  );
}

function renderConsultOverview(conversations, conversation, role) {
  const unread = conversations.reduce((sum, item) => sum + Number(item.unreadCount || 0), 0);
  const activeLabel = role === "ALUMNI"
    ? `${conversations.length} 个岗位会话`
    : `${conversations.filter((item) => item.canSend).length} 个可继续沟通岗位`;

  return `
    <section class="panel consult-overview-panel">
      <div class="consult-overview-copy">
        <span class="section-eyebrow">沟通总览</span>
        <h2>${role === "ALUMNI" ? "围绕岗位统一回复学生咨询" : "围绕已投递岗位继续推进沟通"}</h2>
        <p>${role === "ALUMNI" ? "按岗位维度查看对话，减少重复切换学生上下文。" : "只保留仍可继续沟通的有效申请，把消息、申请说明和岗位入口放到同一屏里。"}</p>
      </div>
      <div class="consult-overview-stats">
        <div class="consult-overview-card">
          <span>全部会话</span>
          <strong>${conversations.length}</strong>
        </div>
        <div class="consult-overview-card">
          <span>未读消息</span>
          <strong>${unread}</strong>
        </div>
        <div class="consult-overview-card">
          <span>当前焦点</span>
          <strong>${escapeHtml(conversation?.jobTitle || "暂无")}</strong>
          <p>${escapeHtml(activeLabel)}</p>
        </div>
      </div>
    </section>
  `;
}

function renderConsultStatusSidebarV3(conversations, conversation) {
  const averageMatch = conversations.length
    ? Math.round(conversations.reduce((sum, item) => sum + asNumber(item.matchScore), 0) / conversations.length)
    : 0;
  const waitingCount = conversations.filter((item) => Number(item.unreadCount || 0) > 0).length;

  return `
    <aside class="consult-side-panel">
      <section class="panel consult-side-card">
        <div class="panel-header"><div><h2>${buildConsultMetricIcon("chat")}沟通状态</h2></div></div>
        <div class="compact-list consult-status-list">
          <div class="consult-side-metric">
            <div class="consult-side-metric-icon tone-blue">${buildConsultMetricIcon("chat")}</div>
            <span>有效会话</span>
            <strong>${conversations.length}</strong>
            <i>›</i>
          </div>
          <div class="consult-side-metric">
            <div class="consult-side-metric-icon tone-amber">${buildConsultMetricIcon("reply")}</div>
            <span>待回复</span>
            <strong>${waitingCount}</strong>
            <i>›</i>
          </div>
          <div class="consult-side-metric">
            <div class="consult-side-metric-icon tone-green">${buildConsultMetricIcon("chart")}</div>
            <span>平均匹配度</span>
            <strong>${averageMatch}%</strong>
            <i>›</i>
          </div>
        </div>
      </section>
      <section class="panel consult-side-card">
        <div class="panel-header">
          <div><h2>${buildConsultMetricIcon("idea")}沟通建议</h2></div>
          <span class="consult-side-link">更多建议</span>
        </div>
        <div class="consult-suggestion-list">
          ${buildConsultSuggestionCard("search", "提前了解岗位", "查看岗位详情和要求，有助于更有针对性地沟通。")}
          ${buildConsultSuggestionCard("flow", "关注流程进度", "及时跟进面试安排，展现你的积极性与诚意。")}
          ${buildConsultSuggestionCard("smile", "保持礼貌专业", "清晰表达问题、感谢回复，建立良好的沟通体验。")}
        </div>
      </section>
      <section class="panel consult-side-card">
        <div class="panel-header"><div><h2>温馨提示</h2></div></div>
        <p class="consult-side-tip">请在工作时间内沟通，校友通常会在 24 小时内回复。耐心等待，感谢理解与配合。</p>
        ${conversation ? `<div class="consult-side-focus"><span>当前焦点</span><strong>${escapeHtml(conversation.jobTitle)}</strong></div>` : ""}
      </section>
    </aside>
  `;
}

function renderStudentConsultComposerV3(conversation) {
  const disabled = conversation.canSend ? "" : "disabled";
  const resultText = conversation.canSend ? "准备发送" : "当前申请状态不支持继续沟通";

  return `
    <form id="consult-send-form" class="consult-composer-v3 ${conversation.canSend ? "" : "is-disabled"}">
      <input type="hidden" name="jobId" value="${conversation.jobId}">
      <div class="consult-composer-v3-head">
        <span class="meta-tag">${escapeHtml(conversation.alumniName || "对应校友")}</span>
        <a class="btn ghost-btn" href="/job-detail.html?id=${conversation.jobId}">岗位详情</a>
      </div>
      <textarea name="content" placeholder="输入你想咨询的问题，例如岗位要求、流程进度或投递建议" required ${disabled}></textarea>
      <div class="consult-composer-v3-actions">
        <div id="consult-send-result" class="action-result">${resultText}</div>
        <div class="consult-composer-v3-action-row">
          <button type="button" class="consult-round-btn" aria-label="表情">${buildConsultMetricIcon("emoji")}</button>
          <button type="submit" class="btn" ${disabled}>发送消息</button>
        </div>
      </div>
    </form>
  `;
}

function renderConsultHeroPanel(session) {
  const roleName = session.role === "ALUMNI" ? "校友" : "学生";
  const roleSummary = session.role === "ALUMNI" ? "岗位维护与学生协作" : "岗位浏览与投递";
  const title = session.role === "ALUMNI" ? "咨询回复" : "消息中心";
  return `
    <section class="panel consult-editorial-head reveal">
      <div class="consult-editorial-copy">
        <span class="section-eyebrow">${roleName}工作台</span>
        <h1>${title}</h1>
        <p>${roleSummary}</p>
      </div>
      <div class="consult-editorial-chips">
        <span class="workspace-chip">${roleName}</span>
        <span class="workspace-chip workspace-chip-muted">${roleSummary}</span>
        <span class="workspace-chip workspace-chip-muted">${escapeHtml(session.username || "-")}</span>
      </div>
    </section>
  `;
}

function renderStudentChatPaneV3(conversation, session) {
  if (!conversation) {
    return `
      <section class="panel consult-chat-panel">
        <div class="consult-chat-empty">
          <strong>暂无可展示的会话</strong>
          <p>只有有效申请关联的岗位才会出现在这里。</p>
        </div>
      </section>
    `;
  }

  return `
    <section class="panel consult-chat-panel consult-chat-panel-v3">
      <div class="consult-chat-header consult-chat-header-v3">
        <div class="consult-chat-heading">
          <h2>${escapeHtml(conversation.jobTitle)}</h2>
          <p>${escapeHtml(conversation.companyName || "-")} / ${escapeHtml(conversation.alumniName || "对应校友")}</p>
        </div>
        <div class="consult-chat-header-actions">
          <a class="btn ghost-btn" href="/job-detail.html?id=${conversation.jobId}">岗位详情</a>
          <button class="consult-round-btn" type="button" aria-label="更多">${buildConsultMetricIcon("more")}</button>
        </div>
      </div>
      <div class="meta-row consult-chat-tag-row">
          <span class="meta-tag">${escapeHtml(conversation.city || "-")}</span>
          <span class="meta-tag">${escapeHtml(conversation.statusText || "处理中")}</span>
          <span class="meta-tag">${asNumber(conversation.matchScore)}%</span>
      </div>
      <div class="application-note-block subtle consult-progress-note">
        <span>当前申请说明</span>
        <p>${escapeHtml(conversation.processRemark || "暂无补充说明。")}</p>
      </div>
      <div id="consult-chat-stream" class="consult-chat-stream">${renderMessageBubbles(conversation.messages, session)}</div>
      ${renderStudentConsultComposerV3(conversation)}
    </section>
  `;
}

async function mountStudentConsultsV3(state, selectedKey) {
  const allConversations = buildStudentConversations(state.session, state.consultableJobs, state.consults);
  const search = String(state.searchKeyword || "").trim().toLowerCase();
  const onlyUnread = !!state.onlyUnread;
  const conversations = allConversations.filter((item) => {
    if (onlyUnread && !Number(item.unreadCount || 0)) {
      return false;
    }
    if (!search) {
      return true;
    }
    const haystack = `${item.jobTitle || ""} ${item.companyName || ""} ${item.alumniName || ""} ${item.latestPreview || ""}`.toLowerCase();
    return haystack.includes(search);
  });
  const activeKey = selectedKey || state.query.get("jobId") || conversations[0]?.key || null;
  const conversation = conversations.find((item) => item.key === String(activeKey)) || conversations[0] || null;

  if (conversation && !state.onlyUnread) {
    await markConversationRead(conversation, state.session);
  }

  renderAppLayout("consults", "消息中心", "", `
    ${renderConsultHeroPanel(state.session)}
    <section class="consult-workspace-v3">
      <aside class="panel consult-thread-panel consult-thread-panel-v3">
        <div class="consult-thread-header">
          <div>
            <h2>岗位会话</h2>
            <p>只展示仍可继续沟通的有效岗位申请。</p>
          </div>
        </div>
        <div class="consult-thread-toolbar">
          <div class="favorite-search-box consult-thread-search">
            <input id="consult-search-input" placeholder="搜索岗位或校友" value="${escapeHtml(state.searchKeyword || "")}">
            ${buildConsultMetricIcon("search")}
          </div>
          <div class="consult-toolbar-actions">
            <button class="consult-unread-toggle ${state.onlyUnread ? "is-active" : ""}" id="consult-unread-toggle" type="button">未读</button>
            ${state.onlyUnread ? '<button class="consult-unread-back" id="consult-unread-back" type="button">返回全部</button>' : ""}
          </div>
        </div>
        <div class="consult-thread-list">
          ${renderConversationList(conversations, conversation?.key || "", state.session.role)}
        </div>
        <div class="consult-thread-footer">${conversations.length} 条会话</div>
      </aside>
      ${renderStudentChatPaneV3(conversation, state.session)}
      ${renderConsultStatusSidebarV3(conversations, conversation)}
    </section>
  `, { hideDefaultHero: true });

  document.querySelectorAll("[data-thread-key]").forEach((button) => {
    button.addEventListener("click", () => mountStudentConsultsV3(state, button.dataset.threadKey));
  });
  document.getElementById("consult-search-input")?.addEventListener("input", (event) => {
    state.searchKeyword = event.target.value;
    mountStudentConsultsV3(state, conversation?.key || null);
  });
  document.getElementById("consult-unread-toggle")?.addEventListener("click", () => {
    state.onlyUnread = !state.onlyUnread;
    mountStudentConsultsV3(state, conversation?.key || null);
  });
  document.getElementById("consult-unread-back")?.addEventListener("click", () => {
    state.onlyUnread = false;
    mountStudentConsultsV3(state, conversation?.key || null);
  });

  const form = document.getElementById("consult-send-form");
  if (!form || !conversation) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const resultNode = document.getElementById("consult-send-result");
    try {
      await sendStudentMessage(state.session, conversation, form);
      if (resultNode) {
        resultNode.innerText = "发送成功";
      }
      await refreshContext(state);
      await mountStudentConsultsV3(state, conversation.key);
    } catch (error) {
      if (resultNode) {
        resultNode.innerText = error.message || "发送失败，请稍后重试";
      }
    }
  });
}

async function mountConsults(state, selectedKey) {
  const conversations = state.session.role === "ALUMNI"
    ? buildAlumniConversations(state.session, state.jobs, state.applications, state.consults)
    : buildStudentConversations(state.session, state.consultableJobs, state.consults);
  const activeKey = selectedKey || state.query.get("jobId") || conversations[0]?.key || null;
  const conversation = conversations.find((item) => item.key === String(activeKey)) || conversations[0] || null;

  if (conversation) {
    await markConversationRead(conversation, state.session);
  }

  renderAppLayout("consults", state.session.role === "ALUMNI" ? "咨询回复" : "消息中心", "", `
    <section class="consult-shell">
      <aside class="panel consult-thread-panel">
        <div class="consult-thread-header">
          <div>
            <h2>岗位会话</h2>
            <p>${state.session.role === "ALUMNI" ? "按岗位查看学生咨询与回复。" : "只展示仍可继续沟通的有效岗位申请。"}</p>
          </div>
        </div>
        <div class="consult-thread-list">
          ${renderConversationList(conversations, conversation?.key || "", state.session.role)}
        </div>
      </aside>
      ${renderChatPane(state.session.role, conversation, state.session)}
    </section>
  `);

  document.querySelectorAll("[data-thread-key]").forEach((button) => {
    button.addEventListener("click", () => mountConsults(state, button.dataset.threadKey));
  });

  const form = document.getElementById("consult-send-form");
  if (!form || !conversation) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const resultNode = document.getElementById("consult-send-result");
    try {
      if (state.session.role === "ALUMNI") {
        await sendAlumniMessage(state.session, form);
      } else {
        await sendStudentMessage(state.session, conversation, form);
      }

      if (resultNode) {
        resultNode.innerText = "发送成功";
      }

      await refreshContext(state);
      await mountConsults(state, conversation.key);
    } catch (error) {
      if (resultNode) {
        resultNode.innerText = error.message || "发送失败，请稍后重试";
      }
    }
  });
}

async function mountConsultsV2(state, selectedKey) {
  const conversations = state.session.role === "ALUMNI"
    ? buildAlumniConversations(state.session, state.jobs, state.applications, state.consults)
    : buildStudentConversations(state.session, state.consultableJobs, state.consults);
  const activeKey = selectedKey || state.query.get("jobId") || conversations[0]?.key || null;
  const conversation = conversations.find((item) => item.key === String(activeKey)) || conversations[0] || null;

  if (conversation) {
    await markConversationRead(conversation, state.session);
  }

  renderAppLayout("consults", state.session.role === "ALUMNI" ? "消息中心" : "消息中心", "", `
    ${renderConsultHeroPanel(state.session)}
    <section class="application-shell">
      ${renderConsultOverview(conversations, conversation, state.session.role)}
      <section class="consult-shell">
        <aside class="panel consult-thread-panel">
          <div class="consult-thread-header">
            <div>
              <h2>岗位会话</h2>
              <p>${state.session.role === "ALUMNI" ? "按岗位查看学生咨询与回复。" : "只展示仍可继续沟通的有效岗位申请。"}</p>
            </div>
          </div>
          <div class="consult-thread-list">
            ${renderConversationList(conversations, conversation?.key || "", state.session.role)}
          </div>
        </aside>
        ${renderChatPane(state.session.role, conversation, state.session)}
      </section>
    </section>
  `, { hideDefaultHero: true });

  document.querySelectorAll("[data-thread-key]").forEach((button) => {
    button.addEventListener("click", () => mountConsultsV2(state, button.dataset.threadKey));
  });

  const form = document.getElementById("consult-send-form");
  if (!form || !conversation) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const resultNode = document.getElementById("consult-send-result");
    try {
      if (state.session.role === "ALUMNI") {
        await sendAlumniMessage(state.session, form);
      } else {
        await sendStudentMessage(state.session, conversation, form);
      }

      if (resultNode) {
        resultNode.innerText = "发送成功";
      }

      await refreshContext(state);
      await mountConsultsV2(state, conversation.key);
    } catch (error) {
      if (resultNode) {
        resultNode.innerText = error.message || "发送失败，请稍后重试";
      }
    }
  });
}

function renderConversationList(conversations, selectedKey, role) {
  if (!conversations.length) {
    return `
      <div class="consult-empty-list">
        <strong>暂无会话</strong>
        <p>${role === "STUDENT" ? "请先投递有效岗位，撤回申请后不会继续出现在消息中心。" : "当前还没有学生围绕岗位发起咨询。"}</p>
      </div>
    `;
  }

  return conversations.map((item) => {
    const subtitle = role === "STUDENT"
      ? `${item.companyName} / ${item.alumniName || "对应校友"}`
      : `${item.companyName} / ${item.participants.length} 位学生`;
    const peerName = role === "STUDENT"
      ? (item.alumniName || "校友")
      : (item.participants[0]?.displayName || "学生");
    return `
      <button type="button" class="consult-thread-card ${item.key === String(selectedKey) ? "is-active" : ""}" data-thread-key="${item.key}">
        <div class="consult-thread-avatar-wrap">
          ${buildConsultAvatar(peerName, role === "STUDENT" ? "slate" : "gold", role === "STUDENT" ? "校" : "生")}
        </div>
        <div class="consult-thread-main">
          <div class="split-header consult-thread-title-row">
            <div class="consult-thread-job-block">
              <strong class="consult-thread-job-title">${escapeHtml(item.jobTitle)}</strong>
            </div>
            <span class="consult-thread-time">${item.latestTime ? formatDateTime(item.latestTime) : "暂无"}</span>
          </div>
          <div class="consult-thread-subtitle">${escapeHtml(subtitle)}</div>
          <div class="consult-thread-pill-row">
            ${item.city ? `<span class="consult-thread-pill">${escapeHtml(item.city)}</span>` : ""}
            ${role === "STUDENT" && item.statusText ? `<span class="consult-thread-pill">${escapeHtml(item.statusText)}</span>` : ""}
          </div>
          <p class="consult-thread-preview">${escapeHtml(item.latestPreview)}</p>
        </div>
        <div class="consult-thread-side">
          ${role === "STUDENT" && item.matchScore != null ? `<span class="match-badge">${asNumber(item.matchScore)}%</span>` : ""}
          ${item.unreadCount ? `<span class="consult-unread-dot"><img class="consult-unread-dot-icon" src="/alumni-icons/svg/page-message-center/message-unread-dot.svg" alt=""><span>${item.unreadCount}</span></span>` : ""}
          <span class="consult-thread-chevron">${buildConsultAssetIcon("/alumni-icons/svg/page-message-center/message-row-chevron.svg", "展开", "consult-inline-svg-icon")}</span>
        </div>
      </button>
    `;
  }).join("");
}

function renderConsultHeroPanel(session) {
  const roleName = session.role === "ALUMNI" ? "校友" : "学生";
  const roleSummary = session.role === "ALUMNI" ? "岗位维护与学生协作" : "岗位浏览与投递";
  const title = session.role === "ALUMNI" ? "咨询回复" : "消息中心";
  return `
    <section class="panel consult-editorial-head reveal">
      <div class="consult-editorial-copy">
        <span class="section-eyebrow">${roleName}工作台</span>
        <h1>${title}</h1>
        <p>${roleSummary}</p>
      </div>
      <div class="consult-editorial-chips">
        <span class="workspace-chip">${roleName}</span>
        <span class="workspace-chip workspace-chip-muted">${roleSummary}</span>
        <span class="workspace-chip workspace-chip-muted">${escapeHtml(session.username || "-")}</span>
      </div>
    </section>
  `;
}

function renderStudentChatPaneV3(conversation, session) {
  if (!conversation) {
    return `
      <section class="panel consult-chat-panel">
        <div class="consult-chat-empty">
          <strong>暂无可展示的会话</strong>
          <p>只有有效申请关联的岗位才会出现在这里。</p>
        </div>
      </section>
    `;
  }

  return `
    <section class="panel consult-chat-panel consult-chat-panel-v3">
      <div class="consult-chat-header consult-chat-header-v3">
        <div class="consult-chat-heading">
          <h2>${escapeHtml(conversation.jobTitle)}</h2>
          <p>${escapeHtml(conversation.companyName || "-")} / ${escapeHtml(conversation.alumniName || "对应校友")}</p>
        </div>
        <div class="consult-chat-header-actions">
          <a class="btn ghost-btn" href="/job-detail.html?id=${conversation.jobId}">岗位详情</a>
          <button class="consult-round-btn" type="button" aria-label="更多">${buildConsultMetricIcon("more")}</button>
        </div>
      </div>
      <div class="meta-row consult-chat-tag-row">
          <span class="meta-tag">${escapeHtml(conversation.city || "-")}</span>
          <span class="meta-tag">${escapeHtml(conversation.statusText || "处理中")}</span>
          <span class="meta-tag">${asNumber(conversation.matchScore)}%</span>
      </div>
      <div class="application-note-block subtle consult-progress-note">
        <span>当前申请说明</span>
        <p>${escapeHtml(conversation.processRemark || "暂无补充说明。")}</p>
      </div>
      <div id="consult-chat-stream" class="consult-chat-stream">${renderMessageBubbles(conversation.messages, session)}</div>
      ${renderStudentConsultComposerV3(conversation)}
    </section>
  `;
}

async function mountStudentConsultsV3(state, selectedKey) {
  const allConversations = buildStudentConversations(state.session, state.consultableJobs, state.consults);
  const search = String(state.searchKeyword || "").trim().toLowerCase();
  const onlyUnread = !!state.onlyUnread;
  const conversations = allConversations.filter((item) => {
    if (onlyUnread && !Number(item.unreadCount || 0)) {
      return false;
    }
    if (!search) {
      return true;
    }
    const haystack = `${item.jobTitle || ""} ${item.companyName || ""} ${item.alumniName || ""} ${item.latestPreview || ""}`.toLowerCase();
    return haystack.includes(search);
  });
  const activeKey = selectedKey || state.query.get("jobId") || conversations[0]?.key || null;
  const conversation = conversations.find((item) => item.key === String(activeKey)) || conversations[0] || null;

  if (conversation && !state.onlyUnread) {
    await markConversationRead(conversation, state.session);
  }

  renderAppLayout("consults", "消息中心", "", `
    ${renderConsultHeroPanel(state.session)}
    <section class="consult-workspace-v3">
      <aside class="panel consult-thread-panel consult-thread-panel-v3">
        <div class="consult-thread-header">
          <div>
            <h2>岗位会话</h2>
            <p>只展示仍可继续沟通的有效岗位申请。</p>
          </div>
        </div>
        <div class="consult-thread-toolbar">
          <div class="favorite-search-box consult-thread-search">
            <input id="consult-search-input" placeholder="搜索岗位或校友" value="${escapeHtml(state.searchKeyword || "")}">
            ${buildConsultMetricIcon("search")}
          </div>
          <div class="consult-toolbar-actions">
            <button class="consult-unread-toggle ${state.onlyUnread ? "is-active" : ""}" id="consult-unread-toggle" type="button">未读</button>
            ${state.onlyUnread ? '<button class="consult-unread-back" id="consult-unread-back" type="button">返回全部</button>' : ""}
          </div>
        </div>
        <div class="consult-thread-list">
          ${renderConversationList(conversations, conversation?.key || "", state.session.role)}
        </div>
        <div class="consult-thread-footer">${conversations.length} 条会话</div>
      </aside>
      ${renderStudentChatPaneV3(conversation, state.session)}
      ${renderConsultStatusSidebarV3(conversations, conversation)}
    </section>
  `, { hideDefaultHero: true });

  document.querySelectorAll("[data-thread-key]").forEach((button) => {
    button.addEventListener("click", () => mountStudentConsultsV3(state, button.dataset.threadKey));
  });
  document.getElementById("consult-search-input")?.addEventListener("input", (event) => {
    state.searchKeyword = event.target.value;
    mountStudentConsultsV3(state, conversation?.key || null);
  });
  document.getElementById("consult-unread-toggle")?.addEventListener("click", () => {
    state.onlyUnread = !state.onlyUnread;
    mountStudentConsultsV3(state, conversation?.key || null);
  });
  document.getElementById("consult-unread-back")?.addEventListener("click", () => {
    state.onlyUnread = false;
    mountStudentConsultsV3(state, conversation?.key || null);
  });

  const form = document.getElementById("consult-send-form");
  if (!form || !conversation) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const resultNode = document.getElementById("consult-send-result");
    try {
      await sendStudentMessage(state.session, conversation, form);
      if (resultNode) {
        resultNode.innerText = "发送成功";
      }
      await refreshContext(state);
      await mountStudentConsultsV3(state, conversation.key);
    } catch (error) {
      if (resultNode) {
        resultNode.innerText = error.message || "发送失败，请稍后重试";
      }
    }
  });
}

async function bootConsultsPage() {
  const session = ensureLogin();
  const context = await loadConsultContext(session);
  const state = {
    session,
    query: new URLSearchParams(location.search),
    consults: mineOnly(context.consults, session),
    jobs: context.jobs || [],
    applications: context.applications || [],
    consultableJobs: buildStudentConsultableJobs(
      (context.applications || []).filter((item) => Number(item.studentId) === Number(session.profileId)),
      context.jobs || []
    ),
    searchKeyword: "",
    onlyUnread: false
  };

  if (session.role === "STUDENT") {
    await mountStudentConsultsV3(state, state.query.get("jobId"));
    return;
  }

  await mountConsultsV2(state, state.query.get("jobId"));
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    if (typeof globalThis.runPageTask === "function") {
      await globalThis.runPageTask({ pageKey: "consults", title: "消息中心", subtitle: "" }, bootConsultsPage);
      return;
    }
    await bootConsultsPage();
  } catch (error) {
    console.error(error);
  }
});

function resolveConsultBrandAsset(companyName) {
  const text = String(companyName || "").trim();
  if (/华为/.test(text)) return "/uploads/demo/company/huawei.png";
  if (/阿里|阿里云/.test(text)) return "/uploads/demo/company/alibabacloud.png";
  if (/腾讯/.test(text)) return "/uploads/demo/company/tencent.png";
  if (/字节/.test(text)) return "/uploads/demo/company/bytedance.png";
  if (/美团/.test(text)) return "/uploads/demo/company/meituan.png";
  if (/百度/.test(text)) return "/alumni-icons/svg/logos_placeholders/brand-baidu-placeholder.svg";
  return "";
}

function buildConsultCompanyVisual(companyName, logoUrl = "") {
  const assetPath = resolveConsultBrandAsset(companyName);
  const safeLogoUrl = sanitizeAttachmentUrl(assetPath || logoUrl);
  if (safeLogoUrl) {
    return `
      <span class="consult-thread-brand is-image">
        <img class="consult-thread-brand-image" src="${safeLogoUrl}" alt="${escapeHtml(companyName || "企业")} logo">
      </span>
    `;
  }
  if (assetPath) {
    return `
      <span class="consult-thread-brand">
        ${buildConsultAssetIcon(assetPath, `${companyName || "企业"} 图标`, "consult-thread-brand-image is-vector")}
      </span>
    `;
  }
  return `<span class="consult-thread-brand is-fallback">${escapeHtml(String(companyName || "企").slice(0, 1))}</span>`;
}

function buildConsultMetricIcon(type) {
  const icons = {
    chat: buildConsultAssetIcon("/alumni-icons/svg/page-message-center/message-effective-chat.svg", "有效会话", "consult-inline-svg-icon"),
    reply: buildConsultAssetIcon("/alumni-icons/svg/page-message-center/message-pending-reply.svg", "待回复", "consult-inline-svg-icon"),
    chart: buildConsultAssetIcon("/alumni-icons/svg/page-message-center/message-average-match.svg", "平均匹配度", "consult-inline-svg-icon"),
    idea: buildConsultAssetIcon("/alumni-icons/svg/page-message-center/message-advice-title.svg", "沟通建议", "consult-inline-svg-icon"),
    flow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h7"></path><path d="M12 7 9.5 4.5"></path><path d="M12 7 9.5 9.5"></path><path d="M19 17h-7"></path><path d="M12 17 14.5 14.5"></path><path d="M12 17 14.5 19.5"></path></svg>',
    smile: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"></circle><path d="M9 10h.01"></path><path d="M15 10h.01"></path><path d="M8.5 14.5c1 1.2 2.2 1.8 3.5 1.8s2.5-.6 3.5-1.8"></path></svg>',
    search: buildConsultAssetIcon("/alumni-icons/svg/page-message-center/message-search.svg", "搜索", "consult-inline-svg-icon"),
    more: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none"></circle><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"></circle><circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none"></circle></svg>'
  };
  return `<span class="consult-mini-icon consult-mini-icon-${type}">${icons[type] || icons.chat}</span>`;
}

function renderConsultStatusSidebarV3(conversations, conversation) {
  const averageMatch = conversations.length
    ? Math.round(conversations.reduce((sum, item) => sum + asNumber(item.matchScore), 0) / conversations.length)
    : 0;
  const waitingCount = conversations.filter((item) => Number(item.unreadCount || 0) > 0).length;

  return `
    <aside class="consult-side-panel">
      <section class="panel consult-side-card">
        <div class="panel-header"><div><h2>${buildConsultMetricIcon("chat")}沟通状态</h2></div></div>
        <div class="compact-list consult-status-list">
          <div class="consult-side-metric">
            <div class="consult-side-metric-icon tone-blue">${buildConsultMetricIcon("chat")}</div>
            <span>有效会话</span>
            <strong>${conversations.length}</strong>
            <i>查看</i>
          </div>
          <div class="consult-side-metric">
            <div class="consult-side-metric-icon tone-amber">${buildConsultMetricIcon("reply")}</div>
            <span>待回复</span>
            <strong>${waitingCount}</strong>
            <i>提醒</i>
          </div>
          <div class="consult-side-metric">
            <div class="consult-side-metric-icon tone-green">${buildConsultMetricIcon("chart")}</div>
            <span>平均匹配度</span>
            <strong>${averageMatch}%</strong>
            <i>概览</i>
          </div>
        </div>
      </section>
      <section class="panel consult-side-card">
        <div class="panel-header">
          <div><h2>${buildConsultMetricIcon("idea")}沟通建议</h2></div>
          <span class="consult-side-link">更多建议</span>
        </div>
        <div class="consult-suggestion-list">
          ${buildConsultSuggestionCard("search", "提前了解岗位", "查看岗位详情和要求，有助于更有针对性地沟通。")}
          ${buildConsultSuggestionCard("flow", "关注流程进度", "及时跟进面试安排，展现你的积极性与诚意。")}
          ${buildConsultSuggestionCard("smile", "保持礼貌专业", "清晰表达问题、感谢回复，建立良好的沟通体验。")}
        </div>
      </section>
      <section class="panel consult-side-card">
        <div class="panel-header"><div><h2>温馨提示</h2></div></div>
        <p class="consult-side-tip">请在工作时间内沟通，校友通常会在 24 小时内回复。耐心等待，更容易建立稳定、专业的交流节奏。</p>
        ${conversation ? `<div class="consult-side-focus"><span>当前焦点</span><strong>${escapeHtml(conversation.jobTitle)}</strong></div>` : ""}
      </section>
    </aside>
  `;
}

function renderStudentConsultComposerV3(conversation) {
  const disabled = conversation.canSend ? "" : "disabled";
  const resultText = conversation.canSend ? "准备发送" : "当前申请状态不支持继续沟通";

  return `
    <form id="consult-send-form" class="consult-composer-v3 ${conversation.canSend ? "" : "is-disabled"}">
      <input type="hidden" name="jobId" value="${conversation.jobId}">
      <div class="consult-composer-v3-head">
        <span class="meta-tag">${escapeHtml(conversation.alumniName || "对应校友")}</span>
        <a class="btn ghost-btn" href="/job-detail.html?id=${conversation.jobId}">岗位详情</a>
      </div>
      <textarea name="content" placeholder="输入你想咨询的问题，例如岗位要求、流程进度或投递建议" required ${disabled}></textarea>
      <div class="consult-composer-v3-actions">
        <div id="consult-send-result" class="action-result">${resultText}</div>
        <div class="consult-composer-v3-action-row">
          <button type="submit" class="btn consult-send-btn" ${disabled}>
            ${buildConsultAssetIcon("/alumni-icons/svg/page-message-center/message-send-button.svg", "发送", "consult-send-button-icon")}
            <span>发送消息</span>
          </button>
        </div>
      </div>
    </form>
  `;
}
