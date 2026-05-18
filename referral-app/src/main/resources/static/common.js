const STORAGE_KEY = "referral_app_user";
let toastTimer = null;
let favoriteCache = {};
let attachmentPreviewBlobUrl = "";
let attachmentPreviewRequestSeq = 0;
let pdfPreviewInitScheduled = false;
let pdfJsModulePromise = null;

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
  } catch {
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
    const message = resolveMessage(result, "登录状态已失效，请重新登录");
    showToast(message);
    setTimeout(() => logout(), 1200);
    throw new Error(message);
  }

  if (!response.ok || resultCode !== 0) {
    const message = resolveMessage(result, "请求失败，请稍后重试");
    showToast(message);
    throw new Error(message);
  }

  return result;
}

function getRoleConfig(role) {
  const studentMenus = [
    { key: "dashboard", group: "总览", label: "求职首页", shortLabel: "首页", desc: "岗位推荐与求职节奏", href: "/dashboard.html" },
    { key: "jobs", group: "求职流程", label: "职位广场", shortLabel: "职位", desc: "筛选并查看内推岗位", href: "/jobs.html" },
    { key: "favorites", group: "求职流程", label: "岗位收藏", shortLabel: "收藏", desc: "集中管理意向岗位", href: "/favorites.html" },
    { key: "companies", group: "求职流程", label: "企业总览", shortLabel: "企业", desc: "查看企业与开放岗位", href: "/companies.html" },
    { key: "applications", group: "求职流程", label: "我的申请", shortLabel: "申请", desc: "跟踪投递与处理状态", href: "/applications.html" },
    { key: "consults", group: "协同沟通", label: "消息中心", shortLabel: "消息", desc: "围绕岗位继续沟通", href: "/consults.html" },
    { key: "profile", group: "个人中心", label: "我的资料", shortLabel: "资料", desc: "维护简历和个人信息", href: "/profile.html" }
  ];
  const alumniMenus = [
    { key: "dashboard", group: "总览", label: "校友工作台", shortLabel: "工作", desc: "岗位与申请概览", href: "/dashboard.html" },
    { key: "companies", group: "岗位协同", label: "内推企业", shortLabel: "企业", desc: "查看和维护关联企业", href: "/companies.html" },
    { key: "jobs", group: "岗位协同", label: "岗位管理", shortLabel: "岗位", desc: "发布并维护内推岗位", href: "/jobs.html" },
    { key: "applications", group: "岗位协同", label: "申请处理", shortLabel: "申请", desc: "推进学生投递流程", href: "/applications.html" },
    { key: "consults", group: "协同沟通", label: "咨询回复", shortLabel: "消息", desc: "回复学生岗位咨询", href: "/consults.html" },
    { key: "profile", group: "个人中心", label: "我的资料", shortLabel: "资料", desc: "维护校友档案与附件", href: "/profile.html" }
  ];
  const configs = {
    ADMIN: {
      title: "校友内推平台",
      subtitle: "管理端",
      menus: [
        { key: "jobs", group: "审核治理", label: "岗位审核", shortLabel: "岗位", desc: "审核校友发布岗位", href: "/jobs.html" },
        { key: "applications", group: "审核治理", label: "申请记录", shortLabel: "申请", desc: "查看申请全局流转", href: "/applications.html" },
        { key: "students", group: "主体管理", label: "学生管理", shortLabel: "学生", desc: "查看学生求职资料", href: "/students.html" },
        { key: "alumni", group: "主体管理", label: "校友管理", shortLabel: "校友", desc: "维护校友档案状态", href: "/alumni.html" },
        { key: "companies", group: "主体管理", label: "企业管理", shortLabel: "企业", desc: "查看企业与岗位来源", href: "/companies.html" }
      ]
    },
    STUDENT: { title: "校友内推平台", subtitle: "学生端", menus: studentMenus },
    ALUMNI: { title: "校友内推平台", subtitle: "校友端", menus: alumniMenus }
  };
  return configs[role] || configs.STUDENT;
}

function roleText(role) {
  return { ADMIN: "管理员", STUDENT: "学生", ALUMNI: "校友" }[role] || role;
}

function workspaceRoleSummary(role) {
  return {
    STUDENT: "岗位浏览与投递",
    ALUMNI: "岗位维护与学生协作",
    ADMIN: "审核治理与数据总览"
  }[role] || "平台工作台";
}

function renderWorkspaceEditorialHeader(session, {
  eyebrow,
  title,
  subtitle,
  roleName,
  roleSummary,
  username
} = {}) {
  const resolvedRoleName = roleName || roleText(session?.role);
  const resolvedRoleSummary = roleSummary || workspaceRoleSummary(session?.role);
  return `
    <section class="panel workspace-editorial-head reveal">
      <div class="workspace-editorial-copy">
        <span class="section-eyebrow">${escapeHtml(eyebrow || `${resolvedRoleName}工作台`)}</span>
        <h1>${escapeHtml(title || "工作台")}</h1>
        <p>${escapeHtml(subtitle || resolvedRoleSummary)}</p>
      </div>
      <div class="workspace-editorial-chips">
        <span class="workspace-chip">${escapeHtml(resolvedRoleName)}</span>
        <span class="workspace-chip workspace-chip-muted">${escapeHtml(resolvedRoleSummary)}</span>
        <span class="workspace-chip workspace-chip-muted">${escapeHtml(username || session?.username || "-")}</span>
      </div>
    </section>
  `;
}

function ensurePageAccess(pageKey, session) {
  if (!session.menus || !session.menus.includes(pageKey)) {
    location.href = session.landingPage || "/dashboard.html";
    throw new Error(`Access denied for page ${pageKey}`);
  }
}

function getSidebarCollapsed() {
  return false;
}

function saveSidebarCollapsed() {
  return;
}

function applySidebarCollapsedState() {
  return;
}

window.__toggleSidebar = function __toggleSidebar() {
  applySidebarCollapsedState();
};

function bindSidebarToggle() {
  return;
}

function renderAppLayout(pageKey, title, subtitle, mainContent, options = {}) {
  const session = ensureLogin();
  ensurePageAccess(pageKey, session);
  const roleConfig = getRoleConfig(session.role);
  const menus = roleConfig.menus.filter((item) => session.menus.includes(item.key));
  const roleName = roleText(session.role);
  const roleSummary = {
    STUDENT: "岗位浏览与投递",
    ALUMNI: "内推岗位与申请处理",
    ADMIN: "审核治理与数据总览"
  }[session.role] || "平台工作台";
  const primaryMenus = menus.slice(0, 7);
  const secondaryMenus = menus.slice(7);
  const summaryLabel = {
    STUDENT: "学生工作台",
    ALUMNI: "校友工作台",
    ADMIN: "管理工作台"
  }[session.role] || "平台工作台";
  const hideDefaultHero = Boolean(options.hideDefaultHero);
  const shellExtraClass = options.shellClassName ? ` ${options.shellClassName}` : "";
  const contentExtraClass = options.contentClassName ? ` ${options.contentClassName}` : "";

  document.title = `${title} - 校友内推平台`;
  document.body.classList.remove("dashboard-showcase-page");
  document.body.classList.add("workspace-unified-page");
  document.getElementById("app").innerHTML = `
    <div class="showcase-shell workspace-shell${hideDefaultHero ? " workspace-shell-no-hero" : ""}${shellExtraClass}" data-page-key="${pageKey}">
      <header class="showcase-topbar workspace-topbar-shell">
        <div class="showcase-topbar-inner workspace-topbar-inner">
          <div class="showcase-brand workspace-brand">校友内推平台</div>
          <nav class="showcase-nav workspace-nav">
            ${primaryMenus.map((item) => `
              <a class="${item.key === pageKey ? "active" : ""}" href="${item.href}" title="${item.label}">${item.label}</a>
            `).join("")}
          </nav>
          <div class="showcase-top-actions workspace-top-actions">
            <span class="showcase-user workspace-user">${session.displayName}</span>
            <button class="btn" type="button" onclick="logout()">退出登录</button>
          </div>
        </div>
      </header>
      <main class="showcase-main workspace-main" data-page-key="${pageKey}">
        ${hideDefaultHero ? "" : `
          <section class="showcase-panel workspace-hero-panel">
            <div class="workspace-hero-copy">
              <span class="section-eyebrow">${summaryLabel}</span>
              <h1>${title}</h1>
              ${subtitle ? `<p>${subtitle}</p>` : `<p>${roleSummary}</p>`}
            </div>
            <div class="workspace-hero-meta">
              <span class="workspace-chip">${roleName}</span>
              <span class="workspace-chip workspace-chip-muted">${roleSummary}</span>
              <span class="workspace-chip workspace-chip-muted">${session.username}</span>
            </div>
          </section>
        `}
        ${secondaryMenus.length ? `
          <section class="showcase-panel workspace-subnav-panel">
            <div class="workspace-subnav">
              ${secondaryMenus.map((item) => `
                <a class="${item.key === pageKey ? "active" : ""}" href="${item.href}" title="${item.label}">
                  <strong>${item.label}</strong>
                  <span>${item.desc || ""}</span>
                </a>
              `).join("")}
            </div>
          </section>
        ` : ""}
        <div class="workspace-page-content${contentExtraClass}">
          ${mainContent}
        </div>
      </main>
    </div>
  `;
  bindSidebarToggle();
  applySidebarCollapsedState();
}

function renderPageLoadFailure(pageKey, title, subtitle, error) {
  const session = getSession();
  if (!session) {
    location.href = "/login.html";
    return;
  }
  if (pageKey && (!session.menus || !session.menus.includes(pageKey))) {
    location.href = session.landingPage || "/dashboard.html";
    return;
  }

  const message = escapeHtml(error?.message || "页面加载失败，请稍后重试。");
  renderAppLayout(pageKey, title, subtitle, `
    <section class="panel">
      <div class="empty-state">
        <strong>页面暂时不可用</strong>
        <p>${message}</p>
        <div class="top-gap">
          <button class="btn" type="button" onclick="location.reload()">重新加载</button>
        </div>
      </div>
    </section>
  `);
}

async function runPageTask(options, task) {
  try {
    await task();
  } catch (error) {
    const message = String(error?.message || "");
    if (message === "Not logged in" || message.startsWith("Access denied for page")) {
      return;
    }
    console.error(error);
    if (document.getElementById("app")?.children?.length) {
      return;
    }
    renderPageLoadFailure(options.pageKey, options.title, options.subtitle, error);
  }
}

globalThis.renderAppLayout = renderAppLayout;
globalThis.renderWorkspaceEditorialHeader = renderWorkspaceEditorialHeader;
globalThis.runPageTask = runPageTask;
globalThis.openPageModal = openPageModal;
globalThis.closePageModal = closePageModal;

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
  return { root, close: closePageModal };
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

function jobAuditBadge(status) {
  const mapping = {
    0: { text: "待审核", cls: "warn" },
    1: { text: "已通过", cls: "success" },
    2: { text: "已驳回", cls: "danger" }
  };
  return mapping[status] || { text: `状态 ${status}`, cls: "" };
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }
  return String(value).replace("T", " ").slice(0, 16);
}

function asNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function setElementHtml(targetId, html) {
  const node = typeof targetId === "string" ? document.getElementById(targetId) : targetId;
  if (node) {
    node.innerHTML = html;
  }
  return node;
}

function getChartInstance(targetId) {
  const node = typeof targetId === "string" ? document.getElementById(targetId) : targetId;
  if (!node || typeof echarts === "undefined") {
    return null;
  }
  const existing = echarts.getInstanceByDom(node);
  if (existing) {
    existing.dispose();
  }
  return echarts.init(node);
}

const CITY_COORDINATES = {
  北京: [116.40, 39.90],
  上海: [121.47, 31.23],
  杭州: [120.15, 30.28],
  深圳: [114.05, 22.55],
  广州: [113.27, 23.13],
  成都: [104.06, 30.67],
  武汉: [114.31, 30.52],
  南京: [118.80, 32.06],
  西安: [108.94, 34.34],
  苏州: [120.58, 31.30]
};

function renderChinaDistributionChart(targetId, items = []) {
  const chart = getChartInstance(targetId);
  if (!chart) {
    return;
  }
  const points = (items || [])
    .filter((item) => CITY_COORDINATES[item.city])
    .map((item) => ({
      name: item.city,
      value: [
        ...CITY_COORDINATES[item.city],
        asNumber(item.jobCount) * 3 + asNumber(item.applicationCount) * 2 + asNumber(item.companyCount),
        asNumber(item.jobCount),
        asNumber(item.companyCount),
        asNumber(item.applicationCount)
      ]
    }));
  chart.setOption({
    backgroundColor: "transparent",
    tooltip: {
      trigger: "item",
      formatter(params) {
        const value = params.value || [];
        return `${params.name}<br>岗位数：${value[3] || 0}<br>企业数：${value[4] || 0}<br>投递数：${value[5] || 0}`;
      }
    },
    geo: {
      map: "china",
      roam: false,
      zoom: 1.08,
      itemStyle: {
        areaColor: "#eef4ff",
        borderColor: "#8ba7d8",
        borderWidth: 1
      },
      emphasis: {
        itemStyle: {
          areaColor: "#d7e6ff"
        }
      }
    },
    series: [
      {
        type: "effectScatter",
        coordinateSystem: "geo",
        data: points,
        symbolSize(value) {
          return 10 + Math.min(26, Math.max(0, (value?.[2] || 0) * 2));
        },
        rippleEffect: {
          brushType: "stroke",
          scale: 3
        },
        itemStyle: {
          color: "#ff7b54",
          shadowBlur: 20,
          shadowColor: "rgba(255,123,84,0.35)"
        },
        label: {
          show: true,
          formatter: "{b}",
          position: "right",
          color: "#1e3357",
          fontSize: 12
        }
      }
    ]
  });
  window.addEventListener("resize", () => chart.resize(), { passive: true });
}

function renderMatchOrbitChart(targetId, jobs = []) {
  const chart = getChartInstance(targetId);
  if (!chart) {
    return;
  }
  const safeJobs = (jobs || [])
    .slice()
    .sort((left, right) => asNumber(right.matchScore) - asNumber(left.matchScore))
    .slice(0, 12);

  const orbitNodes = safeJobs.map((job, index) => {
    const score = Math.max(0, Math.min(100, asNumber(job.matchScore)));
    const distance = 18 + ((100 - score) / 100) * 70;
    const angle = index * 2.399963229728653;
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;
    return {
      id: job.id,
      jobTitle: job.jobTitle || `岗位 ${job.id || "-"}`,
      companyName: job.companyName || "校友企业",
      matchScore: score,
      matchSummary: job.matchSummary || "",
      value: [x, y, score],
      symbolSize: 22 + score * 0.28,
      label: {
        show: index < 6,
        formatter: job.jobTitle || `岗位 ${job.id || "-"}`,
        color: "#1c3558",
        fontSize: 11,
        width: 90,
        overflow: "truncate",
        position: y < 0 ? "top" : "bottom"
      }
    };
  });

  chart.setOption({
    animationDuration: 600,
    tooltip: {
      trigger: "item",
      formatter(params) {
        if (params.seriesName === "当前学生") {
          return "当前学生画像中心";
        }
        const data = params.data || {};
        return [
          `<strong>${escapeHtml(data.jobTitle || params.name || "岗位")}</strong>`,
          `${escapeHtml(data.companyName || "校友企业")}`,
          `匹配度：${asNumber(data.matchScore)}%`,
          data.matchSummary ? escapeHtml(data.matchSummary) : "匹配度越高，代表越符合当前学生画像"
        ].join("<br>");
      }
    },
    grid: {
      left: 10,
      right: 10,
      top: 10,
      bottom: 10
    },
    xAxis: {
      min: -100,
      max: 100,
      show: false
    },
    yAxis: {
      min: -100,
      max: 100,
      show: false
    },
    graphic: [
      {
        type: "circle",
        left: "center",
        top: "center",
        shape: { r: 56 },
        style: {
          stroke: "#d8e4f7",
          fill: "rgba(255,255,255,0.18)",
          lineWidth: 1
        }
      },
      {
        type: "circle",
        left: "center",
        top: "center",
        shape: { r: 98 },
        style: {
          stroke: "#d8e4f7",
          fill: "rgba(255,255,255,0.08)",
          lineWidth: 1
        }
      },
      {
        type: "circle",
        left: "center",
        top: "center",
        shape: { r: 140 },
        style: {
          stroke: "#d8e4f7",
          fill: "transparent",
          lineWidth: 1
        }
      },
      {
        type: "text",
        left: "center",
        top: "46%",
        style: {
          text: "我",
          fill: "#ffffff",
          font: "700 20px 'Segoe UI', 'PingFang SC', sans-serif",
          textAlign: "center"
        }
      },
      {
        type: "text",
        left: "center",
        top: "55%",
        style: {
          text: "当前学生",
          fill: "rgba(255,255,255,0.82)",
          font: "600 11px 'Segoe UI', 'PingFang SC', sans-serif",
          textAlign: "center"
        }
      }
    ],
    series: [
      {
        name: "当前学生",
        type: "scatter",
        data: [{ value: [0, 0] }],
        symbolSize: 68,
        itemStyle: {
          color: "#122746",
          shadowBlur: 24,
          shadowColor: "rgba(18,39,70,0.22)"
        },
        emphasis: {
          disabled: true
        }
      },
      {
        name: "岗位匹配",
        type: "scatter",
        data: orbitNodes,
        itemStyle: {
          color: "#ff7b54",
          borderColor: "#ffffff",
          borderWidth: 2,
          shadowBlur: 18,
          shadowColor: "rgba(255,123,84,0.22)"
        },
        emphasis: {
          scale: 1.08,
          itemStyle: {
            color: "#347bfa"
          }
        }
      }
    ]
  });

  chart.off("click");
  chart.on("click", (params) => {
    const jobId = params?.data?.id;
    if (jobId) {
      location.href = `/job-detail.html?id=${jobId}`;
    }
  });
  window.addEventListener("resize", () => chart.resize(), { passive: true });
}

function renderRadarChart(targetId, breakdown = [], title = "五维匹配") {
  const chart = getChartInstance(targetId);
  if (!chart) {
    return;
  }
  const indicators = (breakdown || []).map((item) => ({
    name: item.label,
    max: 100
  }));
  const values = (breakdown || []).map((item) => asNumber(item.score));
  chart.setOption({
    title: {
      text: title,
      left: "center",
      top: 6,
      textStyle: {
        color: "#1f355c",
        fontSize: 14,
        fontWeight: 600
      }
    },
    tooltip: {
      trigger: "item"
    },
    radar: {
      center: ["50%", "56%"],
      radius: "62%",
      splitNumber: 4,
      indicator: indicators,
      axisName: {
        color: "#38527d"
      },
      splitLine: {
        lineStyle: {
          color: ["#dfe9fb"]
        }
      },
      splitArea: {
        areaStyle: {
          color: ["rgba(238,244,255,0.45)", "rgba(238,244,255,0.15)"]
        }
      },
      axisLine: {
        lineStyle: {
          color: "#c8d7f0"
        }
      }
    },
    series: [
      {
        type: "radar",
        data: [
          {
            value: values,
            name: title,
            areaStyle: {
              color: "rgba(52,123,250,0.24)"
            },
            lineStyle: {
              color: "#347bfa",
              width: 2
            },
            itemStyle: {
              color: "#347bfa"
            }
          }
        ]
      }
    ]
  });
  window.addEventListener("resize", () => chart.resize(), { passive: true });
}

function renderTrendLineChart(targetId, labels = [], series = []) {
  const chart = getChartInstance(targetId);
  if (!chart) {
    return;
  }
  chart.setOption({
    tooltip: {
      trigger: "axis"
    },
    legend: {
      top: 6,
      textStyle: {
        color: "#3b4f75"
      }
    },
    grid: {
      left: 32,
      right: 18,
      top: 48,
      bottom: 28
    },
    xAxis: {
      type: "category",
      data: labels,
      axisLine: {
        lineStyle: {
          color: "#c8d7f0"
        }
      },
      axisLabel: {
        color: "#566b92"
      }
    },
    yAxis: {
      type: "value",
      splitLine: {
        lineStyle: {
          color: "#edf2fb"
        }
      },
      axisLabel: {
        color: "#566b92"
      }
    },
    series: (series || []).map((item) => ({
      name: item.name,
      type: "line",
      smooth: true,
      symbol: "circle",
      symbolSize: 8,
      lineStyle: {
        width: 3,
        color: item.color
      },
      itemStyle: {
        color: item.color
      },
      areaStyle: item.area ? { color: item.area } : undefined,
      data: item.data
    }))
  });
  window.addEventListener("resize", () => chart.resize(), { passive: true });
}

function renderKeywordCloud(targetId, items = []) {
  const node = setElementHtml(targetId, "");
  if (!node) {
    return;
  }
  const safeItems = (items || []).slice(0, 24);
  if (!safeItems.length) {
    node.innerHTML = '<div class="empty-state">暂无关键词数据。</div>';
    return;
  }
  const max = Math.max(...safeItems.map((item) => asNumber(item.value, 1)), 1);
  node.className = `${node.className} keyword-cloud`.trim();
  node.innerHTML = safeItems.map((item, index) => {
    const size = 14 + Math.round(asNumber(item.value, 1) / max * 20);
    const rotate = index % 4 === 0 ? "-6deg" : (index % 3 === 0 ? "5deg" : "0deg");
    const hue = ["#21446d", "#ff7b54", "#347bfa", "#3b8f5d", "#7a56d8"][index % 5];
    return `
      <span class="keyword-pill" style="font-size:${size}px;color:${hue};transform:rotate(${rotate})">
        ${escapeHtml(item.name)}
        <small>${asNumber(item.value)}</small>
      </span>
    `;
  }).join("");
}

function renderProgressSteps(steps = []) {
  return `
    <div class="progress-rail">
      ${(steps || []).map((step) => `
        <div class="progress-step is-${step.state || "pending"}">
          <div class="progress-dot">${asNumber(step.step)}</div>
          <div class="progress-copy">
            <strong>${escapeHtml(step.title || "")}</strong>
            <p>${escapeHtml(step.description || "")}</p>
            ${step.time ? `<span>${escapeHtml(step.time)}</span>` : ""}
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

async function fetchFavoriteJobIds(studentId) {
  try {
    const result = await apiRequest(`/referral/job-favorite/list?studentId=${studentId}`);
    const ids = (result.data?.list || []).map((item) => Number(item.jobId));
    favoriteCache[studentId] = ids;
    return ids;
  } catch (error) {
    favoriteCache[studentId] = [];
    console.warn("Failed to load favorite jobs:", error);
    return [];
  }
}

function getFavoriteJobIds(studentId) {
  return favoriteCache[studentId] || [];
}

function isFavoriteJob(studentId, jobId) {
  return getFavoriteJobIds(studentId).includes(Number(jobId));
}

function setFavoriteButtonState(button, favorited, activeText = "已收藏", inactiveText = "收藏岗位") {
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
    body: JSON.stringify({ studentId, jobId: Number(jobId) })
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
  } catch {
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
  return dotIndex === -1 ? "" : filename.slice(dotIndex + 1).toLowerCase();
}

function getAttachmentFilename(url = "") {
  const safeUrl = sanitizeAttachmentUrl(url);
  if (!safeUrl) {
    return "";
  }
  const pathname = new URL(safeUrl).pathname;
  const filename = pathname.split("/").pop() || "";
  try {
    return decodeURIComponent(filename);
  } catch {
    return filename;
  }
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
  const response = await apiRequest(`/referral/file/preview-content?url=${encodedUrl}`, { method: "GET" });
  return response.data || null;
}

function buildAttachmentOpenUrl(url = "") {
  const safeUrl = sanitizeAttachmentUrl(url);
  if (!safeUrl) {
    return "#";
  }
  if (isPdfUrl(safeUrl) || isImageUrl(safeUrl)) {
    return `/attachment-viewer.html?url=${encodeURIComponent(safeUrl)}&name=${encodeURIComponent(getAttachmentFilename(safeUrl))}`;
  }
  return safeUrl;
}

function canUseDirectAttachmentSource(url = "") {
  const safeUrl = sanitizeAttachmentUrl(url);
  if (!safeUrl || (!isPdfUrl(safeUrl) && !isImageUrl(safeUrl))) {
    return false;
  }
  try {
    const resolved = new URL(safeUrl, window.location.origin);
    return resolved.origin === window.location.origin && resolved.pathname.startsWith("/uploads/");
  } catch (error) {
    return safeUrl.startsWith("/uploads/");
  }
}

async function buildAttachmentPreviewBlobUrl(url) {
  const safeUrl = sanitizeAttachmentUrl(url);
  if (!safeUrl) {
    return "";
  }
  if (canUseDirectAttachmentSource(safeUrl) && isImageUrl(safeUrl)) {
    try {
      return new URL(safeUrl, window.location.origin).href;
    } catch (error) {
      return safeUrl;
    }
  }
  const previewPayload = await fetchAttachmentPreviewPayload(safeUrl);
  const base64Content = previewPayload?.base64Content;
  if (!base64Content) {
    return safeUrl;
  }
  const bytes = decodeBase64ToUint8Array(base64Content);
  const contentType = previewPayload.contentType || (isPdfUrl(safeUrl) ? "application/pdf" : "application/octet-stream");
  clearAttachmentPreviewBlobUrl();
  attachmentPreviewBlobUrl = URL.createObjectURL(new Blob([bytes], { type: contentType }));
  return attachmentPreviewBlobUrl;
}

async function loadPdfJsModule() {
  if (!pdfJsModulePromise) {
    pdfJsModulePromise = import("/vendor/pdfjs/pdf.mjs")
      .then((module) => {
        const pdfjs = module?.default || module;
        if (pdfjs?.GlobalWorkerOptions) {
          pdfjs.GlobalWorkerOptions.workerSrc = "/vendor/pdfjs/pdf.worker.mjs";
        }
        return pdfjs;
      })
      .catch((error) => {
        pdfJsModulePromise = null;
        throw error;
      });
  }
  return pdfJsModulePromise;
}

function renderPdfPreviewStageMessage(stage, className, message) {
  stage.innerHTML = `<div class="${className}">${escapeHtml(message)}</div>`;
}

async function renderInlinePdfPreview(stage) {
  if (!stage || stage.dataset.pdfRendering === "1" || stage.dataset.pdfRendered === "1") {
    return;
  }
  const safeUrl = sanitizeAttachmentUrl(stage.dataset.pdfPreviewUrl || "");
  if (!safeUrl) {
    renderPdfPreviewStageMessage(stage, "attachment-pdf-error", "附件地址无效");
    return;
  }

  stage.dataset.pdfRendering = "1";
  renderPdfPreviewStageMessage(stage, "attachment-pdf-loading", "正在加载 PDF 预览...");

  try {
    const pdfjs = await loadPdfJsModule();
    const pdfBlobUrl = await buildAttachmentPreviewBlobUrl(safeUrl);
    const pdf = await pdfjs.getDocument(pdfBlobUrl || safeUrl).promise;
    const pages = document.createElement("div");
    const stageWidth = Math.max(stage.clientWidth || 0, 720);
    const preferredPreviewWidth = Math.max(360, stageWidth - 24);

    pages.className = "attachment-pdf-pages";
    stage.dataset.pdfPageCount = String(pdf.numPages || 0);
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const baseViewport = page.getViewport({ scale: 1 });
      const cssScale = Math.min(2, Math.max(0.35, preferredPreviewWidth / baseViewport.width));
      const outputScale = window.devicePixelRatio || 1;
      const renderViewport = page.getViewport({ scale: cssScale * outputScale });
      const displayViewport = page.getViewport({ scale: cssScale });
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d", { alpha: false });

      canvas.className = "attachment-pdf-canvas";
      canvas.width = Math.max(1, Math.floor(renderViewport.width));
      canvas.height = Math.max(1, Math.floor(renderViewport.height));
      canvas.style.width = `${displayViewport.width}px`;
      canvas.style.height = `${displayViewport.height}px`;

      await page.render({
        canvasContext: context,
        viewport: renderViewport
      }).promise;

      const pageShell = document.createElement("div");
      pageShell.className = "attachment-pdf-page";
      pageShell.appendChild(canvas);
      pages.appendChild(pageShell);
    }

    stage.innerHTML = "";
    stage.appendChild(pages);
    stage.dataset.pdfRendered = "1";
  } catch (error) {
    console.warn("Failed to render inline PDF preview", error);
    renderPdfPreviewStageMessage(stage, "attachment-pdf-error", "PDF 预览加载失败，请使用下方按钮查看。");
  } finally {
    delete stage.dataset.pdfRendering;
  }
}

function scheduleInlinePdfPreviews() {
  if (pdfPreviewInitScheduled) {
    return;
  }
  pdfPreviewInitScheduled = true;
  queueMicrotask(async () => {
    pdfPreviewInitScheduled = false;
    const stages = Array.from(document.querySelectorAll(".attachment-pdf-stage[data-pdf-preview-url]"))
      .filter((stage) => stage.dataset.pdfRendered !== "1");
    for (const stage of stages) {
      // Serial rendering keeps memory usage stable when multiple previews exist.
      // eslint-disable-next-line no-await-in-loop
      await renderInlinePdfPreview(stage);
    }
  });
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
    showToast("该附件暂不支持预览");
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
  content.innerHTML = '<div class="attachment-preview-fallback">正在加载预览...</div>';

  if (isImageUrl(safeUrl)) {
    const imageBlobUrl = await buildAttachmentPreviewBlobUrl(safeUrl);
    if (requestSeq !== attachmentPreviewRequestSeq) {
      return;
    }
    content.innerHTML = `<img class="attachment-preview-image" src="${imageBlobUrl || safeUrl}" alt="Attachment preview">`;
  } else if (isPdfUrl(safeUrl)) {
    const pdfBlobUrl = await buildAttachmentPreviewBlobUrl(safeUrl);
    if (requestSeq !== attachmentPreviewRequestSeq) {
      return;
    }
    content.innerHTML = `<iframe class="attachment-preview-frame" src="${pdfBlobUrl || buildAttachmentOpenUrl(safeUrl)}"></iframe>`;
  } else {
    content.innerHTML = `<div class="attachment-preview-fallback">该文件类型暂不支持站内预览，请使用新窗口打开。</div>`;
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
  if (nextHref && nextHref !== currentHref) {
    anchor.setAttribute("href", nextHref);
  }
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

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", scheduleInlinePdfPreviews, { once: true });
} else {
  scheduleInlinePdfPreviews();
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

  const pdfPreviewObserver = new MutationObserver(() => {
    scheduleInlinePdfPreviews();
  });
  if (document.body) {
    pdfPreviewObserver.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      pdfPreviewObserver.observe(document.body, { childList: true, subtree: true });
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
          <span class="attachment-action-icon">看</span>
          <span>${label}</span>
        </button>
        <a class="attachment-action attachment-action-secondary" href="${openUrl}" target="_blank" rel="noreferrer">
          <span class="attachment-action-icon">开</span>
          <span>新窗口打开</span>
        </a>
      </span>
    `;
  }
  return `
    <span class="attachment-actions attachment-action-group">
      <a class="attachment-action attachment-action-secondary" href="${openUrl}" target="_blank" rel="noreferrer">
        <span class="attachment-action-icon">开</span>
        <span>${label}</span>
      </a>
    </span>
  `;
}

function renderAttachmentPreview(url) {
  const safeUrl = sanitizeAttachmentUrl(url);
  if (!safeUrl) {
    return `<div class="attachment-empty">附件暂不可用</div>`;
  }
  if (isImageUrl(safeUrl)) {
    return `<div class="attachment-preview-card"><img class="attachment-image" src="${safeUrl}" alt="Attachment preview"></div>`;
  }
  if (isPdfUrl(safeUrl)) {
    return `
      <div class="attachment-preview-card attachment-preview-document">
        <div class="attachment-preview-head">
          <div>
            <strong>PDF 预览</strong>
            <div class="document-caption">当前页直接查看，保留新窗口独立打开入口。</div>
          </div>
          <span class="document-metric">PDF</span>
        </div>
        <div class="attachment-pdf-stage" data-pdf-preview-url="${escapeHtml(safeUrl)}">
          <div class="attachment-pdf-loading">正在加载 PDF 预览...</div>
        </div>
        <div class="document-actions">${renderAttachmentLink(safeUrl, "查看 PDF")}</div>
      </div>
    `;
  }
  return `<div class="attachment-preview-card attachment-generic">${renderAttachmentLink(safeUrl, "下载附件")}</div>`;
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
    throw new Error(resolveMessage(result, "文件上传失败"));
  }
  return result.data;
}
