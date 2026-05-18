async function safeApi(url, fallback) {
  try {
    const result = await apiRequest(url);
    return result.data ?? fallback;
  } catch (error) {
    console.warn(`Dashboard request failed: ${url}`, error);
    return fallback;
  }
}

async function fetchStudentDashboardBundle(session) {
  const [overview, jobsData, applicationData, consultData, mapData, keywordData] = await Promise.all([
    safeApi("/referral/dashboard/overview", {}),
    safeApi("/referral/job-info/match-list", { list: [] }),
    safeApi("/referral/referral-application/list", { list: [] }),
    safeApi("/referral/consult-message/list", { list: [] }),
    safeApi("/referral/dashboard/map-distribution", []),
    safeApi("/referral/dashboard/keyword-cloud", [])
  ]);

  return {
    overview,
    jobs: jobsData.list || [],
    applications: (applicationData.list || []).filter((item) => Number(item.studentId) === Number(session.profileId)),
    consults: (consultData.list || []).filter((item) =>
      Number(item.senderUserId) === Number(session.userId) || Number(item.receiverUserId) === Number(session.userId)
    ),
    mapDistribution: mapData || [],
    keywordCloud: keywordData || []
  };
}

async function fetchAlumniDashboardBundle(session) {
  const [overview, jobsData, applicationData, consultData, trendData] = await Promise.all([
    safeApi("/referral/dashboard/overview", {}),
    safeApi("/referral/job-info/list", { list: [] }),
    safeApi("/referral/referral-application/list", { list: [] }),
    safeApi("/referral/consult-message/list", { list: [] }),
    safeApi("/referral/dashboard/alumni-processing-trend?days=7", [])
  ]);

  return {
    overview,
    jobs: jobsData.list || [],
    applications: applicationData.list || [],
    consults: (consultData.list || []).filter((item) =>
      Number(item.senderUserId) === Number(session.userId) || Number(item.receiverUserId) === Number(session.userId)
    ),
    trend: trendData || []
  };
}

function sortByMatchScore(jobs) {
  return (jobs || []).slice().sort((left, right) => asNumber(right.matchScore) - asNumber(left.matchScore));
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

function buildRecentConversations(consults, jobs, applications, session) {
  const jobMap = new Map((jobs || []).map((item) => [Number(item.id), item]));
  const applicationMap = new Map((applications || []).map((item) => [Number(item.jobId), item]));
  const latestByJob = new Map();

  (consults || []).forEach((item) => {
    const jobId = Number(item.jobId);
    if (!jobId) {
      return;
    }
    const current = latestByJob.get(jobId);
    if (!current || Number(item.id || 0) > Number(current.id || 0)) {
      latestByJob.set(jobId, item);
    }
  });

  return Array.from(latestByJob.values())
    .sort((left, right) => Number(right.id || 0) - Number(left.id || 0))
    .slice(0, 4)
    .map((item) => {
      const jobId = Number(item.jobId);
      const job = jobMap.get(jobId) || {};
      const application = applicationMap.get(jobId) || {};
      const outgoing = Number(item.senderUserId) === Number(session.userId);
      return {
        jobId,
        jobTitle: job.jobTitle || application.jobTitle || `岗位 ${jobId}`,
        companyName: job.companyName || application.companyName || "校友企业",
        peerName: outgoing
          ? (item.receiverDisplayName || application.alumniName || "对方")
          : (item.senderDisplayName || application.studentName || "对方"),
        content: item.content || "",
        sendTime: item.sendTime
      };
    });
}

function buildRadarProfile(jobs) {
  const topJobs = sortByMatchScore(jobs).slice(0, 6);
  const categories = [
    { label: "后端研发", keys: ["java", "后端", "服务端", "software", "engineer", "开发工程师"] },
    { label: "前端体验", keys: ["前端", "web", "react", "vue", "javascript", "客户端"] },
    { label: "数据智能", keys: ["数据", "算法", "推荐", "python", "ai", "machine learning"] },
    { label: "产品运营", keys: ["产品", "运营", "增长", "product", "operation"] },
    { label: "金融商务", keys: ["金融", "财务", "风控", "finance", "business", "strategy"] },
    { label: "咨询方案", keys: ["咨询", "解决方案", "顾问", "consult", "solution"] }
  ];

  return categories.map((category) => {
    const hits = topJobs.filter((job) => {
      const text = `${job.jobTitle || ""} ${job.jobType || ""} ${job.industry || ""} ${job.skillRequirement || ""}`.toLowerCase();
      return category.keys.some((keyword) => text.includes(keyword.toLowerCase()));
    });
    const average = hits.length
      ? hits.reduce((sum, item) => sum + asNumber(item.matchScore), 0) / hits.length
      : 42;
    return {
      label: category.label,
      score: Math.round(Math.max(24, Math.min(96, average)))
    };
  });
}

function buildFallbackProgress(application) {
  const status = Number(application?.applyStatus ?? 0);
  const statusIndex = {
    0: 1,
    1: 2,
    2: 3,
    3: 3,
    4: 4,
    5: 4
  }[status] || 1;

  return [
    {
      title: "提交申请",
      description: application?.applyTime ? `已于 ${formatDateTime(application.applyTime)} 提交` : "申请信息已进入系统",
      state: "done"
    },
    {
      title: "校友查看",
      description: statusIndex >= 2 ? "校友已查看资料，正在安排下一步" : "等待校友查看你的申请",
      state: statusIndex >= 2 ? "done" : "active"
    },
    {
      title: status === 3 ? "申请反馈" : "内推进展",
      description: status === 3
        ? (application?.processRemark || "本次申请暂未通过，可继续投递其他岗位")
        : (statusIndex >= 3 ? (application?.processRemark || "校友已推进当前岗位申请") : "等待校友处理结果"),
      state: status === 3 ? "done" : (statusIndex >= 3 ? "active" : "pending")
    },
    {
      title: status === 4 ? "流程完成" : "结果确认",
      description: status === 4
        ? (application?.processRemark || "当前岗位流程已完成")
        : (status === 5 ? "申请已撤回" : "持续关注后续面试或 offer 结果"),
      state: status >= 4 ? "done" : "pending"
    }
  ];
}

function renderShowcaseRadarChart(targetId, profile) {
  const chart = getChartInstance(targetId);
  if (!chart) {
    return;
  }

  chart.setOption({
    animationDuration: 500,
    radar: {
      center: ["50%", "54%"],
      radius: "73%",
      splitNumber: 5,
      indicator: profile.map((item) => ({ name: item.label, max: 100 })),
      axisName: {
        color: "#3c3b36",
        fontSize: 12
      },
      splitLine: {
        lineStyle: {
          color: ["rgba(59, 59, 54, 0.12)"]
        }
      },
      splitArea: {
        areaStyle: {
          color: ["rgba(255,255,255,0.72)", "rgba(255,248,233,0.42)"]
        }
      },
      axisLine: {
        lineStyle: {
          color: "rgba(59, 59, 54, 0.12)"
        }
      }
    },
    series: [
      {
        type: "radar",
        data: [
          {
            value: profile.map((item) => item.score),
            areaStyle: {
              color: "rgba(20, 34, 62, 0.10)"
            },
            lineStyle: {
              color: "#17233b",
              width: 2
            },
            itemStyle: {
              color: "#17233b"
            },
            symbolSize: 6
          }
        ]
      }
    ]
  });
}

function renderShowcaseStatus(application) {
  const steps = application?.progressSteps?.length ? application.progressSteps : buildFallbackProgress(application);

  return `
    <div class="showcase-status-line">
      ${steps.map((step, index) => `
        <div class="showcase-status-step is-${step.state || "pending"}">
          <div class="showcase-status-dot">${index + 1}</div>
          <strong>${escapeHtml(step.title || "")}</strong>
          <span>${escapeHtml(step.description || step.time || "")}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function renderShowcaseTopJobs(session, jobs) {
  return jobs.map((job) => {
    const favorited = isFavoriteJob(session.profileId, job.id);
    const tags = [
      job.industry || "行业方向",
      job.city || "城市",
      job.skillRequirement || "技能要求"
    ].filter(Boolean).slice(0, 3);

    return `
      <article class="showcase-job-card">
        <div class="showcase-job-title">
          <strong>${escapeHtml(job.jobTitle || "-")}</strong>
          <span>${asNumber(job.matchScore)}% 匹配</span>
        </div>
        <div class="showcase-job-company">${escapeHtml(job.companyName || "-")}</div>
        <div class="showcase-job-tags">
          ${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
        </div>
        <div class="showcase-job-actions">
          <a class="showcase-job-link" href="/job-detail.html?id=${job.id}">查看详情</a>
          <button class="showcase-mini-fav ${favorited ? "is-active" : ""}" data-job-id="${job.id}" type="button">
            ${favorited ? "已收藏" : "收藏"}
          </button>
        </div>
      </article>
    `;
  }).join("") || '<div class="empty-state">暂未生成匹配岗位，请稍后刷新查看。</div>';
}

function renderShowcaseCityStats(items) {
  const topCities = (items || [])
    .slice()
    .sort((left, right) => {
      const leftScore = asNumber(left.jobCount) + asNumber(left.applicationCount) + asNumber(left.companyCount);
      const rightScore = asNumber(right.jobCount) + asNumber(right.applicationCount) + asNumber(right.companyCount);
      return rightScore - leftScore;
    })
    .slice(0, 3);

  return topCities.map((item) => `
    <div class="showcase-city-item">
      <strong>${escapeHtml(item.city || "-")}</strong>
      <span>开放岗位 ${asNumber(item.jobCount)}</span>
      <span>关联企业 ${asNumber(item.companyCount)}</span>
      <span>申请记录 ${asNumber(item.applicationCount)}</span>
    </div>
  `).join("") || '<div class="empty-state">暂无城市分布数据。</div>';
}

function bindShowcaseSearch() {
  document.getElementById("showcase-search-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const keyword = (document.getElementById("showcase-search-input")?.value || "").trim();
    location.href = keyword ? `/jobs.html?keyword=${encodeURIComponent(keyword)}` : "/jobs.html";
  });
}

function bindShowcaseFavoriteButtons(session) {
  document.querySelectorAll(".showcase-mini-fav").forEach((button) => {
    button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        const favorited = await toggleFavoriteJob(session.profileId, button.dataset.jobId);
        button.classList.toggle("is-active", favorited);
        button.textContent = favorited ? "已收藏" : "收藏";
      } finally {
        button.disabled = false;
      }
    });
  });
}

function renderStudentShowcaseLayout(session, content) {
  document.body.classList.add("dashboard-showcase-page");
  document.title = "求职首页 - 校友内推平台";
  document.getElementById("app").innerHTML = `
    <div class="showcase-shell">
      <header class="showcase-topbar">
        <div class="showcase-topbar-inner">
          <div class="showcase-brand">校友内推平台</div>
          <nav class="showcase-nav">
            <a class="active" href="/dashboard.html">求职首页</a>
            <a href="/jobs.html">职位广场</a>
            <a href="/favorites.html">岗位收藏</a>
            <a href="/companies.html">企业总览</a>
            <a href="/applications.html">我的申请</a>
            <a href="/consults.html">消息中心</a>
            <a href="/profile.html">我的资料</a>
          </nav>
          <div class="showcase-top-actions">
            <span class="showcase-user">${escapeHtml(session.displayName || "学生")}</span>
            <button class="btn" type="button" onclick="logout()">退出登录</button>
          </div>
        </div>
      </header>
      <main class="showcase-main">
        ${content}
        <footer class="showcase-footer">高校校友内推信息管理与对接系统 · 学生求职工作台。</footer>
      </main>
    </div>
  `;
}

function renderStudentDashboard(session, bundle) {
  const jobs = sortByMatchScore(bundle.jobs);
  const topJobs = jobs.slice(0, 4);
  const radarProfile = buildRadarProfile(jobs);
  const latestApplication = (bundle.applications || []).slice().sort((left, right) =>
    String(right.applyTime || "").localeCompare(String(left.applyTime || ""))
  )[0];
  const recentMessages = buildRecentConversations(bundle.consults, bundle.jobs, bundle.applications, session);

  renderStudentShowcaseLayout(session, `
    <section class="showcase-page-grid">
      <div class="showcase-column">
        <section class="showcase-hero-card">
          <div class="showcase-hero-copy">
            <span class="section-eyebrow">学生工作台</span>
            <h1 class="showcase-title-nowrap">学生求职工作台</h1>
            <p>集中查看匹配岗位、城市分布、申请进度和最近沟通，把校友内推主链路收在一个首页里。</p>
            <form id="showcase-search-form" class="showcase-search-bar">
              <input id="showcase-search-input" placeholder="搜索岗位、企业、技能关键词">
              <button type="submit">搜索岗位</button>
            </form>
          </div>
          <div id="showcase-radar-chart" class="showcase-radar"></div>
        </section>

        <section class="showcase-panel">
          <div class="showcase-panel-head">
            <h2>高匹配岗位</h2>
          </div>
          <div class="showcase-job-grid">
            ${renderShowcaseTopJobs(session, topJobs)}
          </div>
        </section>

        <section class="showcase-panel">
          <div class="showcase-panel-head">
            <h2>最近沟通</h2>
          </div>
          <div class="showcase-message-list">
            ${recentMessages.map((item) => `
              <a class="showcase-message-item" href="/consults.html?jobId=${item.jobId}">
                <strong>${escapeHtml(item.jobTitle)}</strong>
                <span>${escapeHtml(item.companyName)} / ${escapeHtml(item.peerName)}</span>
                <p>${escapeHtml(item.content || "点击继续查看沟通内容。")}</p>
              </a>
            `).join("") || '<div class="empty-state">暂无沟通消息，投递岗位后即可与校友继续交流。</div>'}
          </div>
        </section>
      </div>

      <div class="showcase-column">
        <section class="showcase-panel">
          <div class="showcase-panel-head">
            <h2>城市岗位分布</h2>
          </div>
          <div class="showcase-map-layout">
            <div id="showcase-map-chart-main" class="showcase-map-chart"></div>
            <div class="showcase-city-list">
              ${renderShowcaseCityStats(bundle.mapDistribution || [])}
            </div>
          </div>
        </section>

        <section class="showcase-panel">
          <div class="showcase-panel-head">
            <h2>岗位关键词</h2>
          </div>
          <div id="showcase-keyword-cloud" class="showcase-keyword-cloud"></div>
        </section>

        <section class="showcase-panel">
          <div class="showcase-panel-head">
            <h2>申请进度</h2>
          </div>
          ${renderShowcaseStatus(latestApplication)}
        </section>
      </div>
    </section>
  `);

  bindShowcaseSearch();
  bindShowcaseFavoriteButtons(session);
  renderShowcaseRadarChart("showcase-radar-chart", radarProfile);
  renderChinaDistributionChart("showcase-map-chart-main", bundle.mapDistribution || []);
  renderKeywordCloud("showcase-keyword-cloud", bundle.keywordCloud || []);
}

function renderAlumniDashboard(bundle) {
  document.body.classList.remove("dashboard-showcase-page");
  const applications = bundle.applications || [];
  const pendingCount = applications.filter((item) => [0, 1].includes(Number(item.applyStatus))).length;
  const referredCount = applications.filter((item) => [2, 4].includes(Number(item.applyStatus))).length;
  const unreadCount = (bundle.consults || []).filter((item) => Number(item.readStatus) !== 1).length;
  const latestApplications = applications.slice(0, 5);
  const latestJobs = (bundle.jobs || []).slice(0, 5);
  const latestConsults = (bundle.consults || []).slice(0, 6);

  renderAppLayout("dashboard", "校友工作台", "集中查看岗位发布、申请处理与学生沟通节奏。", `
    <section class="panel reveal">
      <div class="cards">
        <div class="card"><div class="card-label">当前岗位</div><div class="card-value">${bundle.jobs.length}</div></div>
        <div class="card"><div class="card-label">收到申请</div><div class="card-value">${applications.length}</div></div>
        <div class="card"><div class="card-label">已推进内推</div><div class="card-value">${referredCount}</div></div>
        <div class="card"><div class="card-label">未读消息</div><div class="card-value">${unreadCount}</div></div>
      </div>
    </section>
    <section class="grid-2 reveal reveal-delay-1">
      <div class="panel">
        <div class="panel-header"><div><h2>处理趋势</h2><p>近 7 天申请接收、查看与推进情况。</p></div></div>
        <div id="alumni-trend-chart" class="chart-surface chart-line"></div>
      </div>
      <div class="panel">
        <div class="panel-header"><div><h2>待处理申请</h2><p>优先推进仍处于等待阶段的学生申请。</p></div><span class="meta-tag">${pendingCount} 条</span></div>
        <div class="compact-list">
          ${latestApplications.map((item) => {
            const badge = statusBadge(Number(item.applyStatus));
            return `
              <a class="compact-item compact-link-card" href="/applications.html">
                <div class="split-header">
                  <strong>${escapeHtml(item.studentName || "-")}</strong>
                  <span class="status-badge ${badge.cls}">${badge.text}</span>
                </div>
                <p>${escapeHtml(item.jobTitle || "-")} / ${escapeHtml(item.processRemark || "等待校友处理")}</p>
              </a>
            `;
          }).join("") || '<div class="compact-item">暂无待处理申请。</div>'}
        </div>
      </div>
    </section>
    <section class="grid-2 reveal reveal-delay-2">
      <div class="panel">
        <div class="panel-header"><div><h2>最近岗位</h2><p>快速返回岗位管理继续编辑与查看审核状态。</p></div></div>
        <div class="compact-list">
          ${latestJobs.map((item) => {
            const badge = jobAuditBadge(Number(item.auditStatus));
            return `
              <a class="compact-item compact-link-card" href="/jobs.html">
                <div class="split-header">
                  <strong>${escapeHtml(item.jobTitle || "-")}</strong>
                  <span class="status-badge ${badge.cls}">${badge.text}</span>
                </div>
                <p>${escapeHtml(item.companyName || "-")} / ${escapeHtml(item.city || "-")}</p>
              </a>
            `;
          }).join("") || '<div class="compact-item">暂无岗位记录。</div>'}
        </div>
      </div>
      <div class="panel">
        <div class="panel-header"><div><h2>最近消息</h2><p>查看学生最新提问并回到消息中心继续回复。</p></div></div>
        <div class="compact-list">
          ${latestConsults.map((item) => `
            <a class="compact-item compact-link-card" href="/consults.html?jobId=${item.jobId}">
              <strong>${escapeHtml(item.senderDisplayName || item.receiverDisplayName || "站内消息")}</strong>
              <p>${escapeHtml(item.content || "-")}</p>
            </a>
          `).join("") || '<div class="compact-item">暂无沟通消息。</div>'}
        </div>
      </div>
    </section>
  `);

  renderTrendLineChart(
    "alumni-trend-chart",
    (bundle.trend || []).map((item) => item.label),
    [
      { name: "收到申请", color: "#347bfa", area: "rgba(52,123,250,0.12)", data: (bundle.trend || []).map((item) => asNumber(item.receivedCount)) },
      { name: "已查看", color: "#19a974", data: (bundle.trend || []).map((item) => asNumber(item.viewedCount)) },
      { name: "已内推", color: "#ff7b54", data: (bundle.trend || []).map((item) => asNumber(item.referredCount)) },
      { name: "已完成", color: "#7a5af8", data: (bundle.trend || []).map((item) => asNumber(item.finishedCount)) }
    ]
  );
}

function renderDashboardSummaryCards(bundle) {
  const applications = bundle.applications || [];
  const activeCount = applications.filter((item) => [0, 1].includes(Number(item.applyStatus))).length;
  const latestMessages = bundle.consults || [];
  const unreadCount = latestMessages.filter((item) => Number(item.readStatus) !== 1).length;

  return `
    <div class="dashboard-summary-strip">
      <div class="dashboard-summary-card">
        <span>匹配岗位</span>
        <strong>${(bundle.jobs || []).length}</strong>
      </div>
      <div class="dashboard-summary-card">
        <span>处理中申请</span>
        <strong>${activeCount}</strong>
      </div>
      <div class="dashboard-summary-card">
        <span>最近沟通</span>
        <strong>${latestMessages.length}</strong>
      </div>
      <div class="dashboard-summary-card">
        <span>未读消息</span>
        <strong>${unreadCount}</strong>
      </div>
    </div>
  `;
}

function renderStudentDashboardV2(session, bundle) {
  const jobs = sortByMatchScore(bundle.jobs);
  const topJobs = jobs.slice(0, 4);
  const radarProfile = buildRadarProfile(jobs);
  const latestApplication = (bundle.applications || []).slice().sort((left, right) =>
    String(right.applyTime || "").localeCompare(String(left.applyTime || ""))
  )[0];
  const recentMessages = buildRecentConversations(bundle.consults, bundle.jobs, bundle.applications, session);
  const cityCards = renderShowcaseCityStats(bundle.mapDistribution || []);

  renderStudentShowcaseLayout(session, `
    <section class="showcase-page-grid dashboard-editorial-grid">
      <div class="showcase-column">
        <section class="showcase-hero-card showcase-hero-card-refined">
          <div class="showcase-hero-copy">
            <span class="section-eyebrow">学生工作台</span>
            <h1 class="showcase-title-nowrap">学生求职工作台</h1>
            <p>保留首页作为总控台：左侧做搜索和能力画像，右侧做城市与机会分布，下方继续承接匹配岗位、进度和消息。</p>
            <form id="showcase-search-form" class="showcase-search-bar">
              <input id="showcase-search-input" placeholder="搜索岗位、企业、技能关键词">
              <button type="submit">搜索岗位</button>
            </form>
            ${renderDashboardSummaryCards(bundle)}
          </div>
          <div class="showcase-hero-aside">
            <section class="showcase-mini-panel">
              <div class="showcase-panel-head">
                <h2>能力画像</h2>
              </div>
              <div id="showcase-radar-chart" class="showcase-radar"></div>
            </section>
            <section class="showcase-mini-panel">
              <div class="showcase-panel-head">
                <h2>最近申请</h2>
              </div>
              <div class="showcase-application-spotlight">
                <strong>${escapeHtml(latestApplication?.jobTitle || "暂无申请记录")}</strong>
                <p>${escapeHtml(latestApplication ? `${latestApplication.companyName || "-"} / ${applicationStageText(latestApplication.applyStatus)}` : "可以从职位广场开始新的投递。")}</p>
                <a class="showcase-job-link" href="/applications.html">查看申请</a>
              </div>
            </section>
          </div>
        </section>

        <section class="showcase-panel">
          <div class="showcase-panel-head">
            <h2>高匹配岗位</h2>
          </div>
          <div class="showcase-job-grid">
            ${renderShowcaseTopJobs(session, topJobs)}
          </div>
        </section>

        <section class="showcase-panel">
          <div class="showcase-panel-head">
            <h2>最近沟通</h2>
          </div>
          <div class="showcase-message-list">
            ${recentMessages.map((item) => `
              <a class="showcase-message-item" href="/consults.html?jobId=${item.jobId}">
                <strong>${escapeHtml(item.jobTitle)}</strong>
                <span>${escapeHtml(item.companyName)} / ${escapeHtml(item.peerName)}</span>
                <p>${escapeHtml(item.content || "点击继续查看沟通内容。")}</p>
              </a>
            `).join("") || '<div class="empty-state">暂无沟通消息，投递岗位后即可继续和校友交流。</div>'}
          </div>
        </section>
      </div>

      <div class="showcase-column showcase-side-stack">
        <section class="showcase-panel">
          <div class="showcase-panel-head">
            <h2>城市机会分布</h2>
          </div>
          <div class="showcase-map-layout">
            <div id="showcase-map-chart-main" class="showcase-map-chart"></div>
            <div class="showcase-city-list">${cityCards}</div>
          </div>
        </section>

        <section class="showcase-panel">
          <div class="showcase-panel-head">
            <h2>岗位关键词</h2>
          </div>
          <div id="showcase-keyword-cloud" class="showcase-keyword-cloud"></div>
        </section>

        <section class="showcase-panel">
          <div class="showcase-panel-head">
            <h2>申请进度</h2>
          </div>
          ${renderShowcaseStatus(latestApplication)}
        </section>
      </div>
    </section>
  `);

  bindShowcaseSearch();
  bindShowcaseFavoriteButtons(session);
  renderShowcaseRadarChart("showcase-radar-chart", radarProfile);
  renderChinaDistributionChart("showcase-map-chart-main", bundle.mapDistribution || []);
  renderKeywordCloud("showcase-keyword-cloud", bundle.keywordCloud || []);
}

async function bootDashboardPage() {
  const session = ensureLogin();
  if (typeof ensurePageAccess === "function") {
    ensurePageAccess("dashboard", session);
  }

  if (session.role === "ALUMNI") {
    renderAlumniDashboard(await fetchAlumniDashboardBundle(session));
    return;
  }

  await fetchFavoriteJobIds(session.profileId);
  const bundle = await fetchStudentDashboardBundle(session);
  renderStudentDashboardV2(session, bundle);
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    if (typeof globalThis.runPageTask === "function") {
      await globalThis.runPageTask({ pageKey: "dashboard", title: "求职首页", subtitle: "" }, bootDashboardPage);
      return;
    }
    await bootDashboardPage();
  } catch (error) {
    console.error(error);
  }
});
