const STORAGE_KEY = "referral_admin_user";
let toastTimer = null;

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
    const message = resolveMessage(result, "当前账号没有访问权限，请重新登录。");
    showToast(message);
    setTimeout(() => logout(), 1500);
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
  const roleConfig = {
    ADMIN: {
      title: "Referral Admin",
      subtitle: "校友内推管理后台",
      menus: [
        { key: "dashboard", label: "平台概览", desc: "查看关键指标和系统运行状态", href: "/dashboard.html" },
        { key: "auditCenter", label: "审核工作台", desc: "集中处理待审岗位和待办事项", href: "/audit-center.html" },
        { key: "alumni", label: "校友管理", desc: "维护校友档案和核验状态", href: "/alumni.html" },
        { key: "students", label: "学生管理", desc: "查看学生画像和求职意向", href: "/students.html" },
        { key: "companies", label: "企业管理", desc: "维护合作企业和岗位来源", href: "/companies.html" },
        { key: "jobs", label: "岗位管理", desc: "审核岗位并跟踪发布状态", href: "/jobs.html" },
        { key: "applications", label: "申请总览", desc: "查看内推申请流转和处理结果", href: "/applications.html" },
        { key: "consults", label: "咨询记录", desc: "查看学生与校友之间的沟通记录", href: "/consults.html" },
        { key: "profile", label: "我的资料", desc: "查看当前后台账号信息", href: "/profile.html" }
      ]
    },
    ALUMNI: {
      title: "Referral Console",
      subtitle: "校友内推工作台",
      menus: [
        { key: "dashboard", label: "我的概览", desc: "查看岗位、申请和近期沟通", href: "/dashboard.html" },
        { key: "companies", label: "企业信息", desc: "确认岗位所属企业和公司背景", href: "/companies.html" },
        { key: "jobs", label: "我的岗位", desc: "发布岗位并查看审核状态", href: "/jobs.html" },
        { key: "applications", label: "学生申请", desc: "处理投递到我岗位上的申请", href: "/applications.html" },
        { key: "consults", label: "沟通消息", desc: "回复学生围绕岗位发起的咨询", href: "/consults.html" },
        { key: "profile", label: "我的资料", desc: "维护校友档案和内推权限", href: "/profile.html" }
      ]
    }
  };
  return roleConfig[role] || roleConfig.ADMIN;
}

function roleText(role) {
  return {
    ADMIN: "管理员",
    ALUMNI: "校友"
  }[role] || role;
}

function ensurePageAccess(pageKey, session) {
  if (!session.menus || !session.menus.includes(pageKey)) {
    location.href = session.landingPage || "/dashboard.html";
    throw new Error(`Access denied for page ${pageKey}`);
  }
}

function renderAppLayout(pageKey, title, subtitle, mainContent) {
  const session = ensureLogin();
  ensurePageAccess(pageKey, session);
  const roleConfig = getRoleConfig(session.role);
  const menus = roleConfig.menus.filter((item) => session.menus.includes(item.key));

  document.title = `${title} - ${roleConfig.subtitle}`;
  document.getElementById("app").innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand">${roleConfig.title}</div>
        <div class="brand-subtitle">${roleConfig.subtitle}</div>
        <div class="user-card">
          <div class="name">${session.displayName}</div>
          <div class="meta">${roleText(session.role)} / ${session.username}</div>
        </div>
        <nav class="menu">
          ${menus.map((item) => `
            <a class="${item.key === pageKey ? "active" : ""}" href="${item.href}">
              ${item.label}
              <small>${item.desc}</small>
            </a>
          `).join("")}
        </nav>
        <button class="btn logout-btn" onclick="logout()">退出登录</button>
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
    2: { text: "已推荐", cls: "success" },
    3: { text: "已拒绝", cls: "danger" },
    4: { text: "已完成", cls: "success" },
    5: { text: "已撤回", cls: "danger" }
  };
  return mapping[status] || { text: `状态 ${status}`, cls: "" };
}

function jobAuditBadge(status) {
  const mapping = {
    0: { text: "待审核", cls: "warn" },
    1: { text: "审核通过", cls: "success" },
    2: { text: "已驳回", cls: "danger" }
  };
  return mapping[status] || { text: `审核 ${status}`, cls: "" };
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }
  return String(value).replace("T", " ").slice(0, 16);
}

function normalizeAttachmentUrl(url = "") {
  try {
    const parsed = new URL(url);
    return parsed.pathname.toLowerCase();
  } catch {
    return String(url).split("?")[0].split("#")[0].toLowerCase();
  }
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

function getExtensionFromFilename(filename = "") {
  const parts = filename.split(".");
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    if (parts[i].length > 0) {
      return parts[i].toLowerCase();
    }
  }
  return "";
}

function isImageUrl(url = "") {
  const raw = String(url || "").trim();
  if (!raw) {
    return false;
  }
  let filename;
  try {
    filename = new URL(raw).pathname.split("/").pop();
  } catch {
    filename = raw.split("?")[0].split("/").pop();
  }
  const ext = getExtensionFromFilename(filename);
  return ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext);
}

function isPdfUrl(url = "") {
  const raw = String(url || "").trim();
  if (!raw) {
    return false;
  }
  let filename;
  try {
    filename = new URL(raw).pathname.split("/").pop();
  } catch {
    filename = raw.split("?")[0].split("/").pop();
  }
  const ext = getExtensionFromFilename(filename);
  return ext === "pdf";
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

let attachmentPreviewBlobUrl = "";
let attachmentPreviewRequestSeq = 0;
let pdfJsModulePromise = null;

function clearAttachmentPreviewBlobUrl() {
  if (attachmentPreviewBlobUrl) {
    URL.revokeObjectURL(attachmentPreviewBlobUrl);
    attachmentPreviewBlobUrl = "";
  }
}

window.addEventListener("beforeunload", clearAttachmentPreviewBlobUrl);

async function getPdfJsModule() {
  if (!pdfJsModulePromise) {
    pdfJsModulePromise = import("/vendor/pdfjs/pdf.min.mjs").then((module) => {
      const pdfjsLib = module.default || module;
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/vendor/pdfjs/pdf.worker.min.mjs";
      return pdfjsLib;
    });
  }
  return pdfJsModulePromise;
}

async function buildAttachmentPreviewSource(url) {
  const safeUrl = sanitizeAttachmentUrl(url);
  if (!safeUrl) {
    return "";
  }
  if (!isImageUrl(safeUrl)) {
    return safeUrl;
  }
  try {
    const response = await fetch(safeUrl);
    if (!response.ok) {
      return safeUrl;
    }
    const blob = await response.blob();
    clearAttachmentPreviewBlobUrl();
    attachmentPreviewBlobUrl = URL.createObjectURL(blob);
    return attachmentPreviewBlobUrl;
  } catch (error) {
    return safeUrl;
  }
}

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

async function renderPdfPreview(url, container, requestSeq) {
  const safeUrl = sanitizeAttachmentUrl(url);
  if (!safeUrl) {
    container.innerHTML = '<div class="attachment-preview-fallback">附件地址无效，无法预览。</div>';
    return;
  }

  try {
    const previewPayload = await fetchAttachmentPreviewPayload(safeUrl);
    const base64Content = previewPayload?.base64Content;
    if (!base64Content) {
      throw new Error("empty-content");
    }
    const bytes = decodeBase64ToUint8Array(base64Content);
    if (requestSeq !== attachmentPreviewRequestSeq) {
      return;
    }

    const pdfjsLib = await getPdfJsModule();
    const loadingTask = pdfjsLib.getDocument({ data: bytes });
    const pdf = await loadingTask.promise;
    if (requestSeq !== attachmentPreviewRequestSeq) {
      return;
    }

    const wrapper = document.createElement("div");
    wrapper.className = "attachment-preview-pdf-pages";

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      if (requestSeq !== attachmentPreviewRequestSeq) {
        return;
      }
      const viewport = page.getViewport({ scale: 1.25 });
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      canvas.className = "attachment-preview-pdf-canvas";
      await page.render({ canvasContext: context, viewport }).promise;
      wrapper.appendChild(canvas);
    }

    if (requestSeq !== attachmentPreviewRequestSeq) {
      return;
    }

    container.innerHTML = "";
    container.appendChild(wrapper);
  } catch (error) {
    container.innerHTML = `
      <div class="attachment-preview-fallback">
        PDF 预览加载失败，请使用上方“新窗口打开”查看。
      </div>
    `;
  }
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
  content.innerHTML = '<div class="attachment-preview-fallback">正在加载附件预览...</div>';

  if (isImageUrl(safeUrl)) {
    const previewSource = await buildAttachmentPreviewSource(safeUrl);
    if (requestSeq !== attachmentPreviewRequestSeq) {
      return;
    }
    content.innerHTML = `<img class="attachment-preview-image" src="${previewSource}" alt="附件图片预览">`;
  } else if (isPdfUrl(safeUrl)) {
    await renderPdfPreview(safeUrl, content, requestSeq);
  } else {
    content.innerHTML = `
      <div class="attachment-preview-fallback">
        该附件类型暂不支持内嵌预览，请使用上方“新窗口打开”查看。
      </div>
    `;
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
  if (isImageUrl(safeUrl) || isPdfUrl(safeUrl)) {
    return `<span class="attachment-actions attachment-action-group"><button type="button" class="attachment-action attachment-preview-trigger" data-url="${safeUrl}"><span class="attachment-action-icon">预览</span><span>${label}</span></button><a class="attachment-action attachment-action-secondary" href="${safeUrl}" target="_blank" rel="noreferrer"><span class="attachment-action-icon">跳转</span><span>新窗口打开</span></a></span>`;
  }
  return `<span class="attachment-actions attachment-action-group"><a class="attachment-action attachment-action-secondary" href="${safeUrl}" target="_blank" rel="noreferrer"><span class="attachment-action-icon">文件</span><span>${label}</span></a></span>`;
}

function getRoleConfig(role) {
  const adminMenus = [
    { key: "dashboard", group: "总览", label: "管理首页", shortLabel: "首页", desc: "查看审核与治理概况", href: "/dashboard.html" },
    { key: "auditCenter", group: "审核治理", label: "审核工作台", shortLabel: "审核", desc: "集中处理待审与推进事项", href: "/audit-center.html" },
    { key: "jobs", group: "审核治理", label: "岗位审核", shortLabel: "岗位", desc: "审核校友发布岗位", href: "/jobs.html" },
    { key: "applications", group: "审核治理", label: "申请记录", shortLabel: "申请", desc: "查看投递流转记录", href: "/applications.html" },
    { key: "consults", group: "审核治理", label: "咨询记录", shortLabel: "咨询", desc: "查看前台沟通记录", href: "/consults.html" },
    { key: "students", group: "主体管理", label: "学生管理", shortLabel: "学生", desc: "管理学生资料与状态", href: "/students.html" },
    { key: "alumni", group: "主体管理", label: "校友管理", shortLabel: "校友", desc: "管理校友档案与企业关系", href: "/alumni.html" },
    { key: "companies", group: "主体管理", label: "企业管理", shortLabel: "企业", desc: "查看企业及岗位来源", href: "/companies.html" },
    { key: "profile", group: "账户中心", label: "我的资料", shortLabel: "资料", desc: "查看当前管理员资料", href: "/profile.html" }
  ];

  return {
    title: "校友内推平台",
    subtitle: "管理端",
    menus: adminMenus
  };
}

function roleText(role) {
  return { ADMIN: "管理员", STUDENT: "学生", ALUMNI: "校友" }[role] || role;
}

function renderAppLayout(pageKey, title, subtitle, mainContent) {
  const session = ensureLogin();
  ensurePageAccess(pageKey, session);
  const roleConfig = getRoleConfig(session.role);
  const menus = roleConfig.menus.filter((item) => session.menus.includes(item.key));
  const roleName = roleText(session.role);
  const roleSummary = "审核治理与数据总览";
  const groupOrder = [...new Set(menus.map((item) => item.group || "功能"))];
  const groupedMenus = groupOrder.map((group) => ({
    group,
    items: menus.filter((item) => (item.group || "功能") === group)
  }));

  document.title = `${title} - 校友内推平台`;
  document.getElementById("app").innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="sidebar-inner">
          <div class="sidebar-top modern-sidebar-top">
            <div class="brand-wrap">
              <div class="brand-mark">校</div>
              <div class="brand-copy">
                <div class="brand">校友内推平台</div>
                <div class="brand-sub">${roleConfig.subtitle}</div>
              </div>
            </div>
          </div>
          <div class="user-card modern-user-card">
            <div class="name">${session.displayName}</div>
            <div class="meta">${roleName}账号</div>
            <div class="meta subtle">${session.username}</div>
          </div>
          <nav class="menu">
            ${groupedMenus.map((section) => `
              <div class="menu-group">
                ${section.items.map((item) => `
                  <a class="${item.key === pageKey ? "active" : ""}" href="${item.href}" title="${item.label}">
                    <span class="menu-short">${item.shortLabel}</span>
                    <span class="menu-copy">
                      <span class="menu-label">${item.label}</span>
                    </span>
                  </a>
                `).join("")}
              </div>
            `).join("")}
          </nav>
          <button class="btn logout-btn" type="button" onclick="logout()">退出登录</button>
        </div>
      </aside>
      <main class="content">
        <div class="workspace-topbar">
          <div class="workspace-meta">
            <span class="workspace-chip">${roleName}</span>
            <span class="workspace-chip workspace-chip-muted">${roleSummary}</span>
            <span class="workspace-avatar">${String(session.displayName || "?").slice(0, 1)}</span>
          </div>
        </div>
        <div class="page-title modern-page-title">
          <div>
            <h1>${title}</h1>
            ${subtitle ? `<p>${subtitle}</p>` : ""}
          </div>
          <div class="page-title-side">
            <div class="pill">${session.displayName}</div>
          </div>
        </div>
        ${mainContent}
      </main>
    </div>
  `;
}
