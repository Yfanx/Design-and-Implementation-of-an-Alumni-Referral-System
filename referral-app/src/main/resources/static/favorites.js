async function loadFavoriteContext(session) {
  const [jobResult, favoriteResult, applicationResult] = await Promise.all([
    apiRequest("/referral/job-info/match-list"),
    apiRequest(`/referral/job-favorite/list?studentId=${session.profileId}`),
    apiRequest("/referral/referral-application/list")
  ]);

  return {
    jobs: jobResult.data?.list || [],
    favoriteIds: (favoriteResult.data?.list || []).map((item) => Number(item.jobId)),
    applications: applicationResult.data?.list || []
  };
}

function buildCompanyVisual(companyName, logoUrl = "") {
  const safeLogoUrl = sanitizeAttachmentUrl(logoUrl);
  if (safeLogoUrl) {
    return `
      <span class="company-logo-badge is-image">
        <img class="company-logo-image" src="${safeLogoUrl}" alt="${escapeHtml(companyName || "企业")} logo">
      </span>
    `;
  }
  const text = String(companyName || "").trim();
  const brand = /华为/.test(text)
    ? "huawei"
    : /阿里|阿里云/.test(text)
      ? "aliyun"
      : /腾讯/.test(text)
        ? "tencent"
        : /字节/.test(text)
          ? "bytedance"
          : /美团/.test(text)
            ? "meituan"
            : /百度/.test(text)
              ? "baidu"
              : "default";
  const iconMap = {
    huawei: '<svg viewBox="0 0 48 48" aria-hidden="true"><g fill="currentColor"><path d="M24 7c2 4 2 8 0 13-2-5-2-9 0-13Z"/><path d="M16 10c3 3 4 7 4 11-4-2-7-5-8-9l4-2Z"/><path d="M32 10l4 2c-1 4-4 7-8 9 0-4 1-8 4-11Z"/><path d="M11 18c4 0 8 2 11 5-5 1-9 0-13-2l2-3Z"/><path d="M37 18l2 3c-4 2-8 3-13 2 3-3 7-5 11-5Z"/><path d="M12 28c5-1 9 0 12 2-4 2-8 3-12 3l0-5Z"/><path d="M36 28v5c-4 0-8-1-12-3 3-2 7-3 12-2Z"/><path d="M18 36c3-1 5-1 6 0-2 2-4 3-6 5-2-2-4-3-6-5 2-1 4-1 6 0Z"/><path d="M30 36c2-1 4-1 6 0-2 2-4 3-6 5-2-2-4-3-6-5 2-1 4-1 6 0Z"/></g></svg>',
    aliyun: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M10 14h8v20h-8l6-6V20l-6-6Zm28 0h-8l6 6v8l-6 6h8V14Z" fill="currentColor"/></svg>',
    tencent: '<svg viewBox="0 0 48 48" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="3.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 29c2-7 7-11 14-11 8 0 13 4 14 11"/><path d="M13 29c-1 6 4 10 11 10 7 0 12-4 11-10"/><path d="M18 18c1-3 3-5 6-5s5 2 6 5"/></g></svg>',
    bytedance: '<svg viewBox="0 0 48 48" aria-hidden="true"><g fill="currentColor"><rect x="12" y="11" width="7" height="21" rx="3.5"/><rect x="21" y="7" width="7" height="27" rx="3.5" opacity=".82"/><rect x="30" y="14" width="7" height="18" rx="3.5" opacity=".64"/></g></svg>',
    meituan: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M10 31V15h5l9 11 9-11h5v16h-5V22l-9 10-9-10v9h-5Z" fill="currentColor"/></svg>',
    baidu: '<svg viewBox="0 0 48 48" aria-hidden="true"><g fill="currentColor"><circle cx="16" cy="17" r="4"/><circle cx="24" cy="13" r="4"/><circle cx="32" cy="17" r="4"/><circle cx="20" cy="23" r="4"/><path d="M24 27c-6 0-10 4-10 8 0 3 3 6 10 6s10-3 10-6c0-4-4-8-10-8Z"/></g></svg>',
    default: `<span class="company-logo-fallback">${escapeHtml(text.slice(0, 1) || "企")}</span>`
  };
  return `<span class="company-logo-badge is-${brand}">${iconMap[brand] || iconMap.default}</span>`;
}

function buildFavoriteIcon(iconType) {
  const icons = {
    bookmark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5h10a1 1 0 0 1 1 1V20l-6-3.7L6 20V5.5a1 1 0 0 1 1-1Z"/></svg>',
    send: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 11.5 19 4l-4 16-4.5-5-6-1.5Z"/><path d="m10 14 5-5"/></svg>',
    eye: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="3.2"/></svg>',
    clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.8v4.7l3.3 1.9"/></svg>'
  };
  return `<span class="favorite-icon favorite-icon-${iconType}">${icons[iconType] || icons.bookmark}</span>`;
}

function favoriteDayValue(index) {
  return Math.min(28, 4 + index * 6);
}

function renderFavoriteSummaryCards(jobs, applications) {
  const appliedIds = new Set(
    (applications || [])
      .filter((item) => Number(item.applyStatus) !== 5)
      .map((item) => Number(item.jobId))
  );
  const averageScore = jobs.length
    ? Math.round(jobs.reduce((sum, item) => sum + asNumber(item.matchScore), 0) / jobs.length)
    : 0;
  const latestDate = jobs.length
    ? `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(favoriteDayValue(0)).padStart(2, "0")}`
    : "--";

  return `
    <div class="favorite-summary-grid favorite-summary-grid-rich">
      <div class="favorite-summary-card">
        ${buildFavoriteIcon("bookmark")}
        <span>收藏岗位</span>
        <strong>${jobs.length}个</strong>
      </div>
      <div class="favorite-summary-card">
        ${buildFavoriteIcon("send")}
        <span>已投递</span>
        <strong>${jobs.filter((item) => appliedIds.has(Number(item.id))).length}个</strong>
      </div>
      <div class="favorite-summary-card">
        ${buildFavoriteIcon("eye")}
        <span>平均匹配度</span>
        <strong>${averageScore}%</strong>
      </div>
      <div class="favorite-summary-card">
        ${buildFavoriteIcon("clock")}
        <span>最近收藏</span>
        <strong>${latestDate}</strong>
      </div>
    </div>
  `;
}

function renderFavoriteDistribution(jobs) {
  const buckets = [
    { label: "80%以上", match: (score) => score >= 80, tone: "is-high" },
    { label: "60%-80%", match: (score) => score >= 60 && score < 80, tone: "is-mid" },
    { label: "40%-60%", match: (score) => score >= 40 && score < 60, tone: "is-warm" },
    { label: "40%以下", match: (score) => score < 40, tone: "is-low" }
  ];
  const total = Math.max(1, jobs.length);

  return `
    <div class="favorite-distribution-list">
      ${buckets.map((bucket) => {
        const count = jobs.filter((item) => bucket.match(asNumber(item.matchScore))).length;
        const percent = Math.round(count / total * 100);
        return `
          <div class="favorite-distribution-row">
            <span>${bucket.label}</span>
            <div class="favorite-distribution-track">
              <div class="favorite-distribution-fill ${bucket.tone}" style="width:${count ? Math.max(8, percent) : 0}%"></div>
            </div>
            <strong>${count}个</strong>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderFavoriteCalendarCard(jobs) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const marks = new Set((jobs || []).slice(0, 4).map((_, index) => favoriteDayValue(index)));
  const cells = [];

  for (let index = 0; index < firstDay; index += 1) {
    cells.push('<span class="favorite-calendar-day is-empty"></span>');
  }
  for (let day = 1; day <= totalDays; day += 1) {
    const cls = marks.has(day) ? "favorite-calendar-day is-marked" : "favorite-calendar-day";
    cells.push(`<span class="${cls}">${day}</span>`);
  }

  return `
    <section class="panel favorite-calendar-panel">
      <div class="panel-header">
        <div>
          <h2>最近收藏日历</h2>
          <p>把近期重点关注的岗位节点压缩在一个月视图里。</p>
        </div>
      </div>
      <div class="favorite-calendar-head">
        <button type="button" class="favorite-calendar-nav" disabled>‹</button>
        <strong>${year}年${month + 1}月</strong>
        <button type="button" class="favorite-calendar-nav" disabled>›</button>
      </div>
      <div class="favorite-calendar-weekdays">
        <span>日</span><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span>
      </div>
      <div class="favorite-calendar-grid">${cells.join("")}</div>
      <div class="favorite-calendar-legend">
        <span><i class="is-marked"></i>有收藏</span>
        <span><i></i>无收藏</span>
      </div>
    </section>
  `;
}

function buildFavoriteFeatureCard(job, applied) {
  return `
    <article class="favorite-feature-card">
      <div class="favorite-feature-brand">${buildCompanyVisual(job.companyName, job.companyLogoUrl)}</div>
      <div class="favorite-feature-copy">
        <div class="split-header">
          <div>
            <strong>${escapeHtml(job.companyName || "-")}</strong>
            <span>${escapeHtml(job.jobTitle || "-")}</span>
          </div>
          <div class="favorite-feature-side">
            <strong class="favorite-feature-salary">${escapeHtml(job.salaryRange || "薪资面议")}</strong>
            <span class="status-badge ${applied ? "status-approved" : "status-pending"}">${applied ? "已投递" : "未投递"}</span>
          </div>
        </div>
        <h3>${escapeHtml(job.jobTitle || "-")}</h3>
        <div class="meta-row">
          <span class="meta-tag">${escapeHtml(job.industry || "行业不限")}</span>
          <span class="meta-tag">${escapeHtml(job.city || "-")}</span>
          <span class="meta-tag">${escapeHtml(job.educationRequirement || "学历不限")}</span>
          <span class="meta-tag jobs-match-tag">匹配 ${asNumber(job.matchScore)}%</span>
        </div>
        <p>${escapeHtml(job.jobDesc || "暂无岗位说明。")}</p>
        <div class="favorite-feature-foot">
          <span>收藏时间：2025-05-15</span>
          <div class="action-group">
            <button class="btn ghost-btn remove-favorite-btn" data-id="${job.id}">移出收藏</button>
            <a class="btn ghost-btn" href="/job-detail.html?id=${job.id}">查看详情</a>
            <a class="btn" href="/applications.html?jobId=${job.id}">${applied ? "查看申请" : "立即投递"}</a>
          </div>
        </div>
      </div>
    </article>
  `;
}

function buildFavoriteRecommendationCards(recommendations) {
  return recommendations.map((job) => `
    <article class="favorite-mini-card">
      <div class="split-header favorite-mini-head">
        <div class="favorite-mini-brand">
          ${buildCompanyVisual(job.companyName, job.companyLogoUrl)}
          <div>
            <strong>${escapeHtml(job.companyName || "-")}</strong>
            <span>${asNumber(job.matchScore)}% 匹配</span>
          </div>
        </div>
        <span class="favorite-mini-salary">${escapeHtml(job.salaryRange || "优先推荐")}</span>
      </div>
      <h3>${escapeHtml(job.jobTitle || "-")}</h3>
      <div class="meta-row">
        <span class="meta-tag">${escapeHtml(job.city || "-")}</span>
        <span class="meta-tag">${escapeHtml(job.educationRequirement || "学历不限")}</span>
        <span class="meta-tag jobs-match-tag">${asNumber(job.matchScore)}% 匹配</span>
      </div>
      <p>${escapeHtml(job.jobDesc || "继续比较后再决定是否补充进收藏池。")}</p>
      <button class="btn ghost-btn recommend-favorite-btn" type="button" data-job-id="${job.id}">收藏</button>
    </article>
  `).join("") || '<div class="empty-state">暂无可推荐的新岗位。</div>';
}

function renderFavoriteToolbar(counts) {
  return `
    <section class="panel favorite-toolbar-panel">
      <div class="favorite-toolbar-tabs">
        <button class="favorite-filter-tab is-active" type="button" data-filter="all">全部 (${counts.all})</button>
        <button class="favorite-filter-tab" type="button" data-filter="pending">未投递 (${counts.pending})</button>
        <button class="favorite-filter-tab" type="button" data-filter="applied">已投递 (${counts.applied})</button>
      </div>
      <div class="favorite-toolbar-actions">
        <label class="favorite-sort-shell" for="favorite-sort-select">
          <select id="favorite-sort-select">
            <option value="match-desc">匹配度高到低</option>
            <option value="match-asc">匹配度低到高</option>
          </select>
          <span class="favorite-sort-chevron" aria-hidden="true"></span>
        </label>
        <div class="favorite-search-box">
          <input id="favorite-search-input" placeholder="搜索职位/公司/关键词">
          <span class="favorite-search-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"></circle><path d="m16 16 4 4"></path></svg></span>
        </div>
        <button class="btn ghost-btn favorite-batch-btn" type="button" disabled>批量管理</button>
      </div>
    </section>
  `;
}

function bindFavoriteRemoveActions(session, rerender) {
  document.querySelectorAll(".remove-favorite-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        await toggleFavoriteJob(session.profileId, button.dataset.id);
        rerender();
      } finally {
        button.disabled = false;
      }
    });
  });
}

function renderFavoritesPage(session, context) {
  favoriteCache[session.profileId] = context.favoriteIds;
  const appliedIds = new Set(
    (context.applications || [])
      .filter((item) => Number(item.applyStatus) !== 5)
      .map((item) => Number(item.jobId))
  );
  const favoriteJobs = context.jobs
    .filter((item) => context.favoriteIds.includes(Number(item.id)))
    .sort((left, right) => asNumber(right.matchScore) - asNumber(left.matchScore));
  const recommendations = context.jobs
    .filter((item) => !context.favoriteIds.includes(Number(item.id)))
    .sort((left, right) => asNumber(right.matchScore) - asNumber(left.matchScore))
    .slice(0, 4);
  const counts = {
    all: favoriteJobs.length,
    pending: favoriteJobs.filter((item) => !appliedIds.has(Number(item.id))).length,
    applied: favoriteJobs.filter((item) => appliedIds.has(Number(item.id))).length
  };

  renderAppLayout("favorites", "岗位收藏", "", `
    ${renderWorkspaceEditorialHeader(session, { title: "岗位收藏", subtitle: "收藏你感兴趣的岗位，随时查看与投递。" })}
    <section class="favorite-overview-layout reveal">
      <section class="panel favorite-overview-panel">
        <div class="panel-header">
          <div>
            <h2>收藏概览</h2>
            <p>收藏你感兴趣的岗位，随时查看与投递。</p>
          </div>
        </div>
        ${renderFavoriteSummaryCards(favoriteJobs, context.applications)}
        <div class="favorite-distribution-block">
          <h3>匹配度分布</h3>
          ${renderFavoriteDistribution(favoriteJobs)}
        </div>
      </section>
      ${renderFavoriteCalendarCard(favoriteJobs)}
    </section>

    ${renderFavoriteToolbar(counts)}

    <section class="panel reveal reveal-delay-1">
      <div class="panel-header">
        <div>
          <h2>收藏岗位列表</h2>
          <p>支持继续查看、投递和移出收藏。</p>
        </div>
        <span class="meta-tag" id="favorite-summary-count">${favoriteJobs.length} 个岗位</span>
      </div>
      <div id="favorite-job-list" class="favorite-feature-list"></div>
    </section>

    <section class="panel reveal reveal-delay-2">
      <div class="panel-header">
        <div>
          <h2>为你推荐</h2>
          <p>从未收藏岗位里补足更高匹配的机会。</p>
        </div>
        <button class="btn ghost-btn" type="button" disabled>换一批</button>
      </div>
      <div class="favorite-mini-grid">${buildFavoriteRecommendationCards(recommendations)}</div>
    </section>
  `, { hideDefaultHero: true });

  const listNode = document.getElementById("favorite-job-list");
  const summaryNode = document.getElementById("favorite-summary-count");
  const searchInput = document.getElementById("favorite-search-input");
  const sortSelect = document.getElementById("favorite-sort-select");
  const tabs = Array.from(document.querySelectorAll(".favorite-filter-tab"));
  let activeFilter = "all";

  const sortJobs = (items) => {
    const cloned = items.slice();
    if (sortSelect?.value === "match-asc") {
      return cloned.sort((left, right) => asNumber(left.matchScore) - asNumber(right.matchScore));
    }
    return cloned.sort((left, right) => asNumber(right.matchScore) - asNumber(left.matchScore));
  };

  const renderList = () => {
    const currentIds = getFavoriteJobIds(session.profileId);
    const keyword = String(searchInput?.value || "").trim().toLowerCase();
    const currentJobs = sortJobs(context.jobs
      .filter((item) => currentIds.includes(Number(item.id)))
      .filter((item) => {
        if (activeFilter === "pending" && appliedIds.has(Number(item.id))) {
          return false;
        }
        if (activeFilter === "applied" && !appliedIds.has(Number(item.id))) {
          return false;
        }
        if (!keyword) {
          return true;
        }
        const haystack = `${item.jobTitle || ""} ${item.companyName || ""} ${item.city || ""} ${item.industry || ""}`.toLowerCase();
        return haystack.includes(keyword);
      }));

    summaryNode.textContent = `${currentJobs.length} 个岗位`;
    listNode.innerHTML = currentJobs.map((job) => (
      buildFavoriteFeatureCard(job, appliedIds.has(Number(job.id)))
    )).join("") || '<div class="empty-state">当前没有符合筛选条件的收藏岗位。</div>';
    bindFavoriteRemoveActions(session, renderList);
  };

  tabs.forEach((button) => {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.filter;
      tabs.forEach((item) => item.classList.toggle("is-active", item === button));
      renderList();
    });
  });
  searchInput?.addEventListener("input", renderList);
  sortSelect?.addEventListener("change", renderList);
  document.querySelectorAll(".recommend-favorite-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        await toggleFavoriteJob(session.profileId, button.dataset.jobId);
        location.reload();
      } finally {
        button.disabled = false;
      }
    });
  });

  renderList();
}

async function bootFavoritesPage() {
  const session = ensureLogin();
  if (session.role !== "STUDENT") {
    renderAppLayout("favorites", "岗位收藏", "", `
      <section class="panel">
        <div class="empty-state">岗位收藏页面仅对学生端开放。</div>
      </section>
    `);
    return;
  }

  const context = await loadFavoriteContext(session);
  renderFavoritesPage(session, context);
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    if (typeof globalThis.runPageTask === "function") {
      await globalThis.runPageTask({ pageKey: "favorites", title: "岗位收藏", subtitle: "" }, bootFavoritesPage);
      return;
    }
    await bootFavoritesPage();
  } catch (error) {
    console.error(error);
  }
});

function resolveCompanyAsset(companyName = "") {
  const text = String(companyName || "").trim();
  if (/华为/.test(text)) return "/assets/company/huawei.png";
  if (/阿里|阿里云/.test(text)) return "/assets/company/alibabacloud.png";
  if (/腾讯/.test(text)) return "/assets/company/tencent.png";
  if (/字节/.test(text)) return "/assets/company/bytedance.png";
  if (/美团/.test(text)) return "/assets/company/meituan.png";
  if (/百度/.test(text)) return "/alumni-icons/svg/logos_placeholders/brand-baidu-placeholder.svg";
  return "";
}

function buildCompanyVisual(companyName, logoUrl = "") {
  const assetPath = resolveCompanyAsset(companyName);
  const safeLogoUrl = sanitizeAttachmentUrl(assetPath || logoUrl);
  if (safeLogoUrl) {
    return `
      <span class="company-logo-badge is-image">
        <img
          class="company-logo-image"
          src="${safeLogoUrl}"
          alt="${escapeHtml(companyName || "企业")} logo"
          loading="lazy"
          ${assetPath ? `onerror="this.onerror=null;this.src='${assetPath}'"` : ""}>
      </span>
    `;
  }
  if (assetPath) {
    return `
      <span class="company-logo-badge is-default">
        <img class="company-logo-image" src="${assetPath}" alt="${escapeHtml(companyName || "企业")} 图标" loading="lazy">
      </span>
    `;
  }
  return `<span class="company-logo-badge is-default"><span class="company-logo-fallback">${escapeHtml(String(companyName || "企").slice(0, 1))}</span></span>`;
}
