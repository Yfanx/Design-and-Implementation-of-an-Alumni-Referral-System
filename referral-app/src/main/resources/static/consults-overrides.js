function renderConversationList(conversations, selectedKey, role) {
  if (!conversations.length) {
    return `
      <div class="consult-empty-list">
        <strong>暂无会话</strong>
        <p>${role === "STUDENT" ? "先投递有效岗位申请，之后就可以在这里继续沟通。" : "当前还没有围绕岗位发起的学生咨询。"}</p>
      </div>
    `;
  }

  return conversations.map((item) => {
    const subtitle = role === "STUDENT"
      ? [item.companyName, item.alumniName || "对应校友"].filter(Boolean).join(" / ")
      : [item.companyName, `${item.participants.length} 位学生`].filter(Boolean).join(" / ");
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
              <strong class="consult-thread-job-title">${escapeHtml(item.jobTitle || "岗位会话")}</strong>
            </div>
            <span class="consult-thread-time">${item.latestTime ? formatDateTime(item.latestTime) : "暂无"}</span>
          </div>
          <div class="consult-thread-subtitle">${escapeHtml(subtitle || "消息等待同步")}</div>
          <p class="consult-thread-preview">${escapeHtml(item.latestPreview || "最新消息待查看")}</p>
        </div>
        <div class="consult-thread-side">
          ${item.unreadCount ? `<span class="consult-unread-dot"><img class="consult-unread-dot-icon" src="/alumni-icons/svg/page-message-center/message-unread-dot.svg" alt=""><span>${item.unreadCount}</span></span>` : ""}
        </div>
      </button>
    `;
  }).join("");
}

function renderConsultHeroPanel(session) {
  const isAlumni = session.role === "ALUMNI";
  const roleName = isAlumni ? "校友工作台" : "学生求职工作台";
  const roleSummary = isAlumni ? "处理学生咨询与岗位沟通" : "跟进岗位申请与消息沟通";
  const title = isAlumni ? "咨询回复" : "消息中心";
  return `
    <section class="panel consult-editorial-head reveal">
      <div class="consult-editorial-copy">
        <span class="section-eyebrow">${roleName}</span>
        <h1>${title}</h1>
        <p>${roleSummary}</p>
      </div>
      <div class="consult-editorial-chips">
        <span class="workspace-chip">${isAlumni ? "校友" : "学生"}</span>
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
          <p>仅保留仍可沟通的有效岗位申请，筛选条件变化后会自动刷新。</p>
        </div>
      </section>
    `;
  }

  return `
    <section class="panel consult-chat-panel consult-chat-panel-v3">
      <div class="consult-chat-header consult-chat-header-v3">
        <div class="consult-chat-heading">
          <h2>${escapeHtml(conversation.jobTitle || "岗位会话")}</h2>
          <p>${escapeHtml(conversation.companyName || "-")} / ${escapeHtml(conversation.alumniName || "对应校友")}</p>
        </div>
        <div class="consult-chat-header-actions">
          <a class="btn ghost-btn" href="/job-detail.html?id=${conversation.jobId}">岗位详情</a>
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
            <p>仅展示仍可继续沟通的有效申请</p>
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
        resultNode.innerText = error.message || "发送失败，请稍后重试。";
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
