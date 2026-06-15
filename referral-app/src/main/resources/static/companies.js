function companyJobCount(jobs, companyId) {
  return (jobs || []).filter((job) => Number(job.companyId) === Number(companyId)).length;
}

function companyJobKeywords(jobs, companyId) {
  return (jobs || [])
    .filter((job) => Number(job.companyId) === Number(companyId))
    .slice(0, 3)
    .map((job) => job.jobTitle)
    .filter(Boolean);
}

async function loadCompaniesContext(session) {
  const [companyResult, jobResult] = await Promise.all([
    apiRequest("/referral/company-info/list"),
    apiRequest(session.role === "ALUMNI" ? "/referral/job-info/list" : "/referral/job-info/match-list")
  ]);
  return {
    companies: companyResult.data?.list || [],
    jobs: jobResult.data?.list || []
  };
}

function buildCompanyMark(companyName) {
  return escapeHtml((companyName || "?").slice(0, 2));
}

function buildCompanyStatIcon(type) {
  const icons = {
    company: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 21V6.5a1 1 0 0 1 1-1h6v15.5"></path><path d="M12 21V3.5a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1V21"></path><path d="M8 10h1M8 13h1M8 16h1M15 8h1M15 11h1M15 14h1"></path></svg>',
    job: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 8.5h17v10a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1z"></path><path d="M8 8V6a1.5 1.5 0 0 1 1.5-1.5h5A1.5 1.5 0 0 1 16 6v2"></path></svg>',
    city: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s6-5 6-10a6 6 0 1 0-12 0c0 5 6 10 6 10Z"></path><circle cx="12" cy="10" r="2.4"></circle></svg>',
    industry: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v18"></path><path d="M5 12h14"></path><path d="M7.5 7.5 12 12l4.5-4.5"></path></svg>'
  };
  return `<span class="company-stat-icon company-stat-icon-${type}">${icons[type] || icons.company}</span>`;
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
    default: `<span class="company-logo-fallback">${buildCompanyMark(companyName)}</span>`
  };
  return `<span class="company-logo-badge is-${brand}">${iconMap[brand] || iconMap.default}</span>`;
}

function renderCompanyStats(context) {
  const cityCount = new Set((context.companies || []).map((item) => item.city).filter(Boolean)).size;
  const industryCountMap = new Map();
  (context.companies || []).forEach((item) => {
    const key = item.industry || "其他";
    industryCountMap.set(key, Number(industryCountMap.get(key) || 0) + 1);
  });
  const topIndustry = Array.from(industryCountMap.entries()).sort((left, right) => right[1] - left[1])[0]?.[0] || "暂无";

  return `
    <div class="company-stat-grid">
      <div class="company-stat-card">${buildCompanyStatIcon("company")}<span>企业数量</span><strong>${context.companies.length}</strong><p>较上月保持稳定</p></div>
      <div class="company-stat-card">${buildCompanyStatIcon("job")}<span>开放岗位</span><strong>${context.jobs.length}</strong><p>校友持续补充新机会</p></div>
      <div class="company-stat-card">${buildCompanyStatIcon("city")}<span>覆盖城市</span><strong>${cityCount}</strong><p>优先城市一屏可览</p></div>
      <div class="company-stat-card">${buildCompanyStatIcon("industry")}<span>热门行业</span><strong>${escapeHtml(topIndustry)}</strong><p>当前关注度最高的企业方向</p></div>
    </div>
  `;
}

function renderCompanyCityChart(context) {
  const cityEntries = Array.from((context.companies || []).reduce((map, item) => {
    const key = item.city || "未知";
    map.set(key, Number(map.get(key) || 0) + 1);
    return map;
  }, new Map()).entries()).sort((left, right) => right[1] - left[1]).slice(0, 4);
  const max = Math.max(1, ...cityEntries.map((item) => item[1]));

  return `
    <section class="company-chart-card">
      <div class="split-header">
        <strong>城市分布</strong>
        <span>共 ${cityEntries.length} 城市</span>
      </div>
      <div class="company-bar-chart">
        ${cityEntries.map(([city, count]) => `
          <div class="company-bar-item">
            <div class="company-bar-visual"><i style="height:${Math.round(count / max * 100)}%"></i></div>
            <strong>${count}</strong>
            <span>${escapeHtml(city)}</span>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function renderCompanyIndustryChart(context) {
  const entries = Array.from((context.companies || []).reduce((map, item) => {
    const key = item.industry || "其他";
    map.set(key, Number(map.get(key) || 0) + 1);
    return map;
  }, new Map()).entries()).sort((left, right) => right[1] - left[1]).slice(0, 3);
  const total = Math.max(1, entries.reduce((sum, item) => sum + item[1], 0));
  let start = 0;
  const tones = ["#5478c6", "#b8c8ef", "#e7c98f"];
  const stops = entries.map((item, index) => {
    const end = start + item[1] / total * 360;
    const stop = `${tones[index] || tones[0]} ${start}deg ${end}deg`;
    start = end;
    return stop;
  }).join(", ");

  return `
    <section class="company-chart-card">
      <div class="split-header">
        <strong>行业分布</strong>
        <span>${context.companies.length} 家企业</span>
      </div>
      <div class="company-donut-layout">
        <div class="company-donut-ring" style="background:conic-gradient(${stops || "#5478c6 0deg 360deg"})">
          <div class="company-donut-inner">
            <strong>${context.companies.length}</strong>
            <span>企业总数</span>
          </div>
        </div>
        <div class="company-donut-legend">
          ${entries.map((item, index) => `
            <div>
              <i style="background:${tones[index] || tones[0]}"></i>
              <span>${escapeHtml(item[0])}</span>
              <strong>${Math.round(item[1] / total * 100)}%</strong>
            </div>
          `).join("")}
        </div>
      </div>
    </section>
  `;
}

function buildCompanyQuickEntry(company) {
  return `
    <a class="company-quick-card" href="/jobs.html?company=${encodeURIComponent(company.companyName || "")}">
      <div class="company-quick-mark">${buildCompanyVisual(company.companyName, company.logoUrl)}</div>
      <div class="company-quick-copy">
        <strong>${escapeHtml(company.companyName || "-")}</strong>
        <p>${escapeHtml(company.city || "-")} / ${escapeHtml(company.industry || "-")}</p>
      </div>
      <span class="company-quick-arrow">›</span>
    </a>
  `;
}

function buildCompanyGridCard(company, jobs) {
  const count = companyJobCount(jobs, company.id);
  const keywords = companyJobKeywords(jobs, company.id);
  return `
    <article class="company-editorial-card">
      <div class="company-editorial-head">
        <div class="company-editorial-mark">${buildCompanyVisual(company.companyName, company.logoUrl)}</div>
        <div>
          <h3>${escapeHtml(company.companyName || "-")}</h3>
          <p>${escapeHtml(company.city || "-")} / ${escapeHtml(company.industry || "-")}</p>
        </div>
        <strong class="company-open-count">${count} 个岗位</strong>
      </div>
      <div class="meta-row">
        <span class="meta-tag">${escapeHtml(company.companySize || "规模待补充")}</span>
        <span class="meta-tag">${escapeHtml(company.address || "地址待补充")}</span>
      </div>
      <p>${escapeHtml(company.companyDesc || "暂无企业介绍。")}</p>
      <div class="company-job-chip-row">
        ${keywords.length ? keywords.map((keyword) => `<span class="meta-tag">${escapeHtml(keyword)}</span>`).join("") : '<span class="meta-tag">暂无开放岗位</span>'}
      </div>
      <div class="action-group">
        <a class="btn" href="/jobs.html?company=${encodeURIComponent(company.companyName || "")}">查看岗位</a>
        ${company.officialWebsite
          ? `<a class="btn ghost-btn" href="${escapeHtml(company.officialWebsite)}" target="_blank" rel="noreferrer">企业官网</a>`
          : '<button class="btn ghost-btn" type="button" disabled>企业官网</button>'}
      </div>
    </article>
  `;
}

function renderCompaniesPage(session, context) {
  renderAppLayout("companies", "企业总览", "", `
    ${renderWorkspaceEditorialHeader(session, { title: "企业总览", subtitle: "岗位浏览与投递" })}
    <section class="company-overview-layout reveal">
      <section class="panel company-overview-panel">
        <div class="panel-header">
          <div>
            <h2>查看平台内的校友企业与开放岗位</h2>
            <p>你可以从企业查看岗位入口，也可以回到职位广场继续筛选。</p>
          </div>
        </div>
        ${renderCompanyStats(context)}
        <div class="company-chart-grid">
          ${renderCompanyCityChart(context)}
          ${renderCompanyIndustryChart(context)}
        </div>
        <div class="company-banner-tip">平台持续邀请优质校友企业入驻，更多岗位机会将陆续上线，敬请期待。</div>
      </section>
      <section class="panel company-quick-panel">
        <div class="panel-header">
          <div>
            <h2>快速入口</h2>
            <p>从优质校友企业快速进入，探索热门机会。</p>
          </div>
        </div>
        <div class="company-quick-list">
          ${(context.companies || []).slice(0, 3).map(buildCompanyQuickEntry).join("") || '<div class="empty-state">暂无企业数据。</div>'}
        </div>
        <a class="btn company-all-link" href="#company-card-list">查看全部企业</a>
      </section>
    </section>

    <section class="panel reveal reveal-delay-1">
      <div class="panel-header">
        <div>
          <h2>企业列表</h2>
          <p>每个企业卡片会展示开放岗位数量与代表岗位。</p>
        </div>
        <span class="meta-tag">共 ${context.companies.length} 家企业</span>
      </div>
      <div id="company-card-list" class="company-editorial-grid">
        ${context.companies.map((company) => buildCompanyGridCard(company, context.jobs)).join("") || '<div class="empty-state">暂无企业数据。</div>'}
      </div>
    </section>
  `, { hideDefaultHero: true });
}

async function bootCompaniesPage() {
  const session = ensureLogin();
  const context = await loadCompaniesContext(session);
  renderCompaniesPage(session, context);
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    if (typeof globalThis.runPageTask === "function") {
      await globalThis.runPageTask({ pageKey: "companies", title: "企业总览", subtitle: "" }, bootCompaniesPage);
      return;
    }
    await bootCompaniesPage();
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
  return `<span class="company-logo-badge is-default"><span class="company-logo-fallback">${buildCompanyMark(companyName)}</span></span>`;
}
