const STORAGE_KEY = "referral_app_user";
const SIDEBAR_STATE_KEY = "referral_app_sidebar_collapsed";
let toastTimer = null;
let favoriteCache = {};
let attachmentPreviewBlobUrl = "";
let attachmentPreviewRequestSeq = 0;

function showToast(message, duration = 4000) {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }
  const toast = document.createElement("div");
  toast.className = "toast toast-error";
  toast.textContent = message;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("is-visible"));
  if (toastTimer) {
    clearTimeout(toastTimer);
  }
  toastTimer = setTimeout(() => {
    toast.classList.remove("is-visible");
    toast.addEventListener("transitionend", () => toast.remove(), { once: true });
  }, duration);
}

function getSession() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

function saveSession(session) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

function logout() {
  localStorage.removeItem(STORAGE_KEY);
  location.href = "/login.html";
}

function ensureLogin() {
  const session = getSession();
  if (!session) {
    location.href = "/login.html";
    throw new Error("Not logged in");
  }
  return session;
}

function buildAuthHeaders() {
  const session = getSession();
  if (!session) {
    return {};
  }
  return {
    "X-Referral-Token": session.token || "",
    "X-Referral-Role": session.role || "",
    "X-Referral-User-Id": String(session.userId || ""),
    "X-Referral-Profile-Id": String(session.profileId || "")
  };
}

async function parseResponseBody(response) {
  const text = await response.text();
  if (!text) {
    return {};
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    return { code: response.ok ? 0 : response.status, message: text };
  }
}

function resolveMessage(result, fallback) {
  return result.msg || result.message || fallback;
}

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...buildAuthHeaders(),
      ...(options.headers || {})
    }
  });
  const result = await parseResponseBody(response);
  const resultCode = Number(result.code ?? (response.ok ? 0 : response.status));

  if (response.status === 401 || response.status === 403 || resultCode === 401 || resultCode === 403) {
    const message = resolveMessage(result, "登录已过期，请重新登录。");
    showToast(message);
    setTimeout(() => logout(), 1200);
    throw new Error(message);
  }

  if (!response.ok || resultCode !== 0) {
    const message = resolveMessage(result, "请求失败，请稍后重试。");
    showToast(message);
    throw new Error(message);
  }

  return result;
}

function getRoleConfig(role) {
  const configs = {
    STUDENT: {
      title: "Referral App",
      subtitle: "高校校友内推学生端",
      menus: [
        { key: "dashboard", label: "首页", shortLabel: "首页", desc: "推荐岗位与最新动态", href: "/dashboard.html" },
        { key: "jobs", label: "岗位", shortLabel: "岗位", desc: "搜索和筛选内推职位", href: "/jobs.html" },
        { key: "favorites", label: "收藏", shortLabel: "收藏", desc: "保存待投递岗位", href: "/favorites.html" },
        { key: "companies", label: "企业", shortLabel: "企业", desc: "查看企业信息和开放职位", href: "/companies.html" },
        { key: "applications", label: "申请", shortLabel: "申请", desc: "跟踪内推申请进度", href: "/applications.html" },
        { key: "consults", label: "消息", shortLabel: "消息", desc: "围绕岗位继续沟通", href: "/consults.html" },
        { key: "profile", label: "资料", shortLabel: "资料", desc: "维护个人档案和简历", href: "/profile.html" }
      ]
    },
    ALUMNI: {
      title: "Referral App",
      subtitle: "高校校友内推校友端",
      menus: [
        { key: "dashboard", label: "工作台", shortLabel: "工作台", desc: "查看岗位、申请与沟通进度", href: "/dashboard.html" },
        { key: "companies", label: "企业", shortLabel: "企业", desc: "查看合作企业和关联岗位", href: "/companies.html" },
        { key: "jobs", label: "我的岗位", shortLabel: "岗位", desc: "发布并维护自己的岗位", href: "/jobs.html" },
        { key: "applications", label: "学生申请", shortLabel: "申请", desc: "处理投递到我岗位的申请", href: "/applications.html" },
        { key: "consults", label: "消息", shortLabel: "消息", desc: "回复学生咨询并持续跟进", href: "/consults.html" },
        { key: "profile", label: "资料", shortLabel: "资料", desc: "维护校友档案与权限", href: "/profile.html" }
      ]
    }
  };
  return configs[role] || configs.STUDENT;
}

function roleText(role) {
  return {
    STUDENT: "学生",
    ALUMNI: "校友"
  }[role] || role;
}

function ensurePageAccess(pageKey, session) {
  if (!session.menus || !session.menus.includes(pageKey)) {
    location.href = session.landingPage || "/dashboard.html";
    throw new Error(`Access denied for page ${pageKey}`);
  }
}

function getSidebarCollapsed() {
  return localStorage.getItem(SIDEBAR_STATE_KEY) === "1";
}

function saveSidebarCollapsed(collapsed) {
  localStorage.setItem(SIDEBAR_STATE_KEY, collapsed ? "1" : "0");
}

function applySidebarCollapsedState() {
  const shell = document.querySelector(".app-shell");
  const toggle = document.getElementById("sidebar-toggle");
  const collapsed = getSidebarCollapsed();
  if (!shell || !toggle) {
    return;
  }
  shell.classList.toggle("sidebar-collapsed", collapsed);
  toggle.textContent = collapsed ? "展开菜单" : "收起菜单";
  toggle.dataset.collapsed = collapsed ? "1" : "0";
  toggle.setAttribute("aria-expanded", String(!collapsed));
}

function bindSidebarToggle() {
  const toggle = document.getElementById("sidebar-toggle");
  if (!toggle) {
    return;
  }
  toggle.onclick = null;
  toggle.addEventListener("click", () => {
    saveSidebarCollapsed(!getSidebarCollapsed());
    applySidebarCollapsedState();
  });
}

function renderAppLayout(pageKey, title, subtitle, mainContent) {
  const session = ensureLogin();
  ensurePageAccess(pageKey, session);
  const roleConfig = getRoleConfig(session.role);
  const menus = roleConfig.menus.filter((item) => session.menus.includes(item.key));

  document.title = `${title} - 高校校友内推平台`;
  document.getElementById("app").innerHTML = `
    <div class="app-shell ${getSidebarCollapsed() ? "sidebar-collapsed" : ""}">
      <aside class="sidebar">
        <div class="sidebar-inner">
          <div class="sidebar-top">
            <div class="brand-wrap">
              <div class="brand">${roleConfig.title}</div>
              <div class="brand-subtitle">${roleConfig.subtitle}</div>
            </div>
            <button id="sidebar-toggle" class="sidebar-toggle" type="button" aria-expanded="true">收起菜单</button>
          </div>
          <div class="user-card">
            <div class="name">${session.displayName}</div>
            <div class="meta">${roleText(session.role)} / ${session.username}</div>
          </div>
          <nav class="menu">
            ${menus.map((item) => `
              <a class="${item.key === pageKey ? "active" : ""}" href="${item.href}" title="${item.label}">
                <span class="menu-short">${item.shortLabel}</span>
                <span class="menu-copy">
                  <span class="menu-label">${item.label}</span>
                  <small>${item.desc}</small>
                </span>
              </a>
            `).join("")}
          </nav>
          <button class="btn logout-btn" onclick="logout()">退出登录</button>
        </div>
      </aside>
      <main class="content">
        <div class="page-title">
          <h1>${title}</h1>
          <p>${subtitle}</p>
        </div>
        ${mainContent}
      </main>
    </div>
  `;
  bindSidebarToggle();
  applySidebarCollapsedState();
}

document.addEventListener("click", (event) => {
  const toggle = event.target.closest("#sidebar-toggle");
  if (!toggle) {
    return;
  }
  event.preventDefault();
  saveSidebarCollapsed(!getSidebarCollapsed());
  applySidebarCollapsedState();
});
function closePageModal() {
  const modal = document.getElementById("page-modal-root");
  if (!modal) {
    return;
  }
  modal.remove();
  document.body.classList.remove("page-modal-open");
}

function openPageModal({ title, subtitle = "", body = "", size = "default", onReady }) {
  closePageModal();
  const root = document.createElement("div");
  root.id = "page-modal-root";
  root.className = "page-modal-root";
  root.innerHTML = `
    <div class="page-modal-mask" data-close="1"></div>
    <div class="page-modal-card ${size === "wide" ? "page-modal-wide" : ""}" role="dialog" aria-modal="true" aria-label="${title}">
      <div class="page-modal-header">
        <div>
          <h2>${title}</h2>
          ${subtitle ? `<p>${subtitle}</p>` : ""}
        </div>
        <button type="button" class="page-modal-close" data-close="1">关闭</button>
      </div>
      <div class="page-modal-body">${body}</div>
    </div>
  `;
  root.addEventListener("click", (event) => {
    if (event.target?.dataset?.close === "1") {
      closePageModal();
    }
  });
  document.body.appendChild(root);
  document.body.classList.add("page-modal-open");
  if (typeof onReady === "function") {
    onReady(root.querySelector(".page-modal-body"), root);
  }
  return {
    root,
    close: closePageModal
  };
}

function renderMetricList(targetId, items, keyName = "name", valueName = "value") {
  const target = document.getElementById(targetId);
  target.innerHTML = items.map((item) => `
    <div class="metric-item">
      <span>${item[keyName]}</span>
      <strong>${item[valueName]}</strong>
    </div>
  `).join("");
}

function renderTable(targetId, headers, rows) {
  const target = document.getElementById(targetId);
  const head = headers.map((item) => `<th>${item}</th>`).join("");
  const body = rows.map((row) => `<tr>${row.map((cell) => `<td>${cell ?? "-"}</td>`).join("")}</tr>`).join("");
  target.innerHTML = `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function formPayload(form) {
  const payload = Object.fromEntries(new FormData(form).entries());
  Object.keys(payload).forEach((key) => {
    if (payload[key] === "") {
      payload[key] = null;
    } else if (/^-?\d+$/.test(payload[key])) {
      payload[key] = Number(payload[key]);
    }
  });
  return payload;
}

function statusBadge(status) {
  const mapping = {
    0: { text: "待处理", cls: "warn" },
    1: { text: "已查看", cls: "success" },
    2: { text: "已内推", cls: "success" },
    3: { text: "已拒绝", cls: "danger" },
    4: { text: "已完成", cls: "success" },
    5: { text: "已取消", cls: "danger" }
  };
  return mapping[status] || { text: `状态 ${status}`, cls: "" };
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }
  return String(value).replace("T", " ").slice(0, 16);
}

async function fetchFavoriteJobIds(studentId) {
  const result = await apiRequest(`/referral/job-favorite/list?studentId=${studentId}`);
  const ids = (result.data?.list || []).map((item) => Number(item.jobId));
  favoriteCache[studentId] = ids;
  return ids;
}

function getFavoriteJobIds(studentId) {
  return favoriteCache[studentId] || [];
}

function isFavoriteJob(studentId, jobId) {
  return getFavoriteJobIds(studentId).includes(Number(jobId));
}

function setFavoriteButtonState(button, favorited, activeText = "已收藏", inactiveText = "收藏") {
  if (!button) {
    return;
  }
  button.classList.toggle("active-favorite", favorited);
  button.dataset.favorited = favorited ? "1" : "0";
  button.textContent = favorited ? activeText : inactiveText;
}

function updateFavoriteCache(studentId, jobId, favorited) {
  const normalizedId = Number(jobId);
  const current = new Set(getFavoriteJobIds(studentId));
  if (favorited) {
    current.add(normalizedId);
  } else {
    current.delete(normalizedId);
  }
  favoriteCache[studentId] = Array.from(current);
  return favoriteCache[studentId];
}

async function toggleFavoriteJob(studentId, jobId) {
  const result = await apiRequest("/referral/job-favorite/toggle", {
    method: "POST",
    body: JSON.stringify({
      studentId,
      jobId: Number(jobId)
    })
  });
  const favorited = !!result.data?.favorited;
  updateFavoriteCache(studentId, jobId, favorited);
  return favorited;
}

function sanitizeAttachmentUrl(url = "") {
  const raw = String(url || "").trim();
  if (!raw) {
    return "";
  }
  try {
    const parsed = new URL(raw, window.location.origin);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return "";
    }
    return parsed.href;
  } catch (error) {
    return "";
  }
}

function getAttachmentExtension(url = "") {
  const safeUrl = sanitizeAttachmentUrl(url);
  if (!safeUrl) {
    return "";
  }
  const pathname = new URL(safeUrl).pathname;
  const filename = pathname.split("/").pop() || "";
  const dotIndex = filename.lastIndexOf(".");
  if (dotIndex === -1) {
    return "";
  }
  return filename.slice(dotIndex + 1).toLowerCase();
}

function isImageUrl(url = "") {
  return ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(getAttachmentExtension(url));
}

function isPdfUrl(url = "") {
  return getAttachmentExtension(url) === "pdf";
}

function clearAttachmentPreviewBlobUrl() {
  if (attachmentPreviewBlobUrl) {
    URL.revokeObjectURL(attachmentPreviewBlobUrl);
    attachmentPreviewBlobUrl = "";
  }
}

window.addEventListener("beforeunload", clearAttachmentPreviewBlobUrl);

function decodeBase64ToUint8Array(base64Content) {
  const binary = atob(base64Content);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function fetchAttachmentPreviewPayload(url) {
  const safeUrl = sanitizeAttachmentUrl(url);
  if (!safeUrl) {
    throw new Error("invalid-url");
  }
  const encodedUrl = encodeURIComponent(safeUrl);
  const response = await apiRequest(`/referral/file/preview-content?url=${encodedUrl}`, {
    method: "GET"
  });
  return response.data || null;
}

function buildAttachmentOpenUrl(url = "") {
  const safeUrl = sanitizeAttachmentUrl(url);
  if (!safeUrl) {
    return "#";
  }
  if (isImageUrl(safeUrl) || isPdfUrl(safeUrl)) {
    return `/attachment-viewer.html?url=${encodeURIComponent(safeUrl)}`;
  }
  return safeUrl;
}

async function buildAttachmentPreviewBlobUrl(url) {
  const safeUrl = sanitizeAttachmentUrl(url);
  if (!safeUrl) {
    throw new Error("invalid-url");
  }
  const previewPayload = await fetchAttachmentPreviewPayload(safeUrl);
  const base64Content = previewPayload?.base64Content;
  if (!base64Content) {
    throw new Error("empty-content");
  }
  const bytes = decodeBase64ToUint8Array(base64Content);
  const contentType = previewPayload.contentType || (isPdfUrl(safeUrl) ? "application/pdf" : "application/octet-stream");
  const blob = new Blob([bytes], { type: contentType });
  clearAttachmentPreviewBlobUrl();
  attachmentPreviewBlobUrl = URL.createObjectURL(blob);
  return attachmentPreviewBlobUrl;
}

function ensureAttachmentPreviewModal() {
  const existing = document.getElementById("attachment-preview-modal");
  if (existing) {
    existing.remove();
  }
  const modal = document.createElement("div");
  modal.id = "attachment-preview-modal";
  modal.className = "attachment-preview-modal";
  modal.innerHTML = `
    <div class="attachment-preview-mask" data-close="true"></div>
    <div class="attachment-preview-dialog" role="dialog" aria-modal="true" aria-label="附件预览">
      <div class="attachment-preview-toolbar">
        <strong>附件预览</strong>
        <div class="action-group">
          <a id="attachment-preview-open-link" class="btn ghost-btn" href="#" target="_blank" rel="noreferrer">新窗口打开</a>
          <button type="button" class="btn" data-close="true">关闭</button>
        </div>
      </div>
      <div id="attachment-preview-content" class="attachment-preview-content"></div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.addEventListener("click", (event) => {
    if (event.target?.dataset?.close === "true") {
      modal.classList.remove("is-open");
      document.body.classList.remove("attachment-preview-open");
      clearAttachmentPreviewBlobUrl();
    }
  });
}

async function openAttachmentPreview(url) {
  const safeUrl = sanitizeAttachmentUrl(url);
  if (!safeUrl) {
    showToast("附件地址无效，无法预览。");
    return;
  }
  const requestSeq = ++attachmentPreviewRequestSeq;
  ensureAttachmentPreviewModal();
  const modal = document.getElementById("attachment-preview-modal");
  const content = document.getElementById("attachment-preview-content");
  const openLink = document.getElementById("attachment-preview-open-link");
  if (!modal || !content || !openLink) {
    return;
  }

  openLink.href = buildAttachmentOpenUrl(safeUrl);
  content.innerHTML = `<div class="attachment-preview-fallback">正在加载附件预览...</div>`;

  if (isImageUrl(safeUrl)) {
    try {
      const imageBlobUrl = await buildAttachmentPreviewBlobUrl(safeUrl);
      if (requestSeq !== attachmentPreviewRequestSeq) {
        return;
      }
      content.innerHTML = `<img class="attachment-preview-image" src="${imageBlobUrl}" alt="附件图片预览">`;
    } catch (error) {
      content.innerHTML = `<div class="attachment-preview-fallback">图片预览加载失败，请使用“新窗口打开”。</div>`;
    }
  } else if (isPdfUrl(safeUrl)) {
    try {
      const pdfBlobUrl = await buildAttachmentPreviewBlobUrl(safeUrl);
      if (requestSeq !== attachmentPreviewRequestSeq) {
        return;
      }
      content.innerHTML = `
        <object class="attachment-preview-pdf" data="${pdfBlobUrl}#toolbar=0&navpanes=0&scrollbar=1" type="application/pdf">
          <div class="attachment-preview-fallback">PDF 预览加载失败，请使用“新窗口打开”。</div>
        </object>
      `;
    } catch (error) {
      content.innerHTML = `<div class="attachment-preview-fallback">PDF 预览加载失败，请使用“新窗口打开”。</div>`;
    }
  } else {
    content.innerHTML = `<div class="attachment-preview-fallback">该文件类型暂不支持内嵌预览，请使用“新窗口打开”。</div>`;
  }

  modal.classList.add("is-open");
  document.body.classList.add("attachment-preview-open");
}

document.addEventListener("click", (event) => {
  const trigger = event.target.closest(".attachment-preview-trigger");
  if (!trigger) {
    return;
  }
  event.preventDefault();
  openAttachmentPreview(trigger.dataset.url);
});

document.addEventListener("click", (event) => {
  const openAnchor = event.target.closest(".attachment-action-secondary");
  if (!openAnchor) {
    return;
  }
  const currentHref = openAnchor.getAttribute("href") || "";
  const nextHref = buildAttachmentOpenUrl(currentHref);
  if (!nextHref || nextHref === currentHref) {
    return;
  }
  event.preventDefault();
  window.open(nextHref, "_blank", "noopener,noreferrer");
});

function normalizeAttachmentOpenAnchor(anchor) {
  if (!anchor) {
    return;
  }
  const currentHref = anchor.getAttribute("href") || "";
  const nextHref = buildAttachmentOpenUrl(currentHref);
  if (!nextHref || nextHref === currentHref) {
    return;
  }
  anchor.setAttribute("href", nextHref);
}

function normalizeAllAttachmentOpenAnchors() {
  document.querySelectorAll(".attachment-action-secondary").forEach((anchor) => {
    normalizeAttachmentOpenAnchor(anchor);
  });
}

document.addEventListener("mouseover", (event) => {
  normalizeAttachmentOpenAnchor(event.target.closest(".attachment-action-secondary"));
});

document.addEventListener("contextmenu", (event) => {
  normalizeAttachmentOpenAnchor(event.target.closest(".attachment-action-secondary"));
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", normalizeAllAttachmentOpenAnchors, { once: true });
} else {
  normalizeAllAttachmentOpenAnchors();
}

if (typeof MutationObserver !== "undefined") {
  const attachmentOpenLinkObserver = new MutationObserver(() => {
    normalizeAllAttachmentOpenAnchors();
  });
  if (document.body) {
    attachmentOpenLinkObserver.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      attachmentOpenLinkObserver.observe(document.body, { childList: true, subtree: true });
    }, { once: true });
  }
}

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") {
    return;
  }
  const modal = document.getElementById("attachment-preview-modal");
  if (!modal || !modal.classList.contains("is-open")) {
    return;
  }
  modal.classList.remove("is-open");
  document.body.classList.remove("attachment-preview-open");
  clearAttachmentPreviewBlobUrl();
});

function renderAttachmentLink(url, label = "查看附件") {
  const safeUrl = sanitizeAttachmentUrl(url);
  if (!safeUrl) {
    return "-";
  }
  const openUrl = buildAttachmentOpenUrl(safeUrl);
  if (isPdfUrl(safeUrl) || isImageUrl(safeUrl)) {
    return `
      <span class="attachment-actions attachment-action-group">
        <button type="button" class="attachment-action attachment-preview-trigger" data-url="${safeUrl}">
          <span class="attachment-action-icon">预览</span>
          <span>${label}</span>
        </button>
        <a class="attachment-action attachment-action-secondary" href="${openUrl}" target="_blank" rel="noreferrer">
          <span class="attachment-action-icon">打开</span>
          <span>新窗口打开</span>
        </a>
      </span>
    `;
  }
  return `
    <span class="attachment-actions attachment-action-group">
      <a class="attachment-action attachment-action-secondary" href="${openUrl}" target="_blank" rel="noreferrer">
        <span class="attachment-action-icon">文件</span>
        <span>${label}</span>
      </a>
    </span>
  `;
}

function renderAttachmentPreview(url) {
  const safeUrl = sanitizeAttachmentUrl(url);
  if (!safeUrl) {
    return `<div class="attachment-empty">暂无附件</div>`;
  }
  if (isImageUrl(safeUrl)) {
    return `<div class="attachment-preview-card"><img class="attachment-image" src="${safeUrl}" alt="附件预览"></div>`;
  }
  if (isPdfUrl(safeUrl)) {
    return `<div class="attachment-preview-card attachment-generic">${renderAttachmentLink(safeUrl, "预览 PDF")}</div>`;
  }
  return `<div class="attachment-preview-card attachment-generic">${renderAttachmentLink(safeUrl, "打开附件")}</div>`;
}

async function uploadReferralFile(file, category = "general") {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("category", category);

  const response = await fetch("/referral/file/upload", {
    method: "POST",
    headers: buildAuthHeaders(),
    body: formData
  });
  const result = await parseResponseBody(response);
  const resultCode = Number(result.code ?? (response.ok ? 0 : response.status));
  if (!response.ok || resultCode !== 0) {
    throw new Error(resolveMessage(result, "文件上传失败，请稍后重试。"));
  }
  return result.data;
}
