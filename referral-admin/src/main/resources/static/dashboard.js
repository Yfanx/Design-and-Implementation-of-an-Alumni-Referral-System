async function fetchAdminOverviewBundle() {
  const [overview, industry, city, hotJobs, trend, jobs, applications, consults, alumni] = await Promise.all([
    apiRequest("/referral/dashboard/overview"),
    apiRequest("/referral/dashboard/industry-distribution"),
    apiRequest("/referral/dashboard/city-distribution"),
    apiRequest("/referral/dashboard/hot-jobs"),
    apiRequest("/referral/dashboard/application-trend"),
    apiRequest("/referral/job-info/list"),
    apiRequest("/referral/referral-application/list"),
    apiRequest("/referral/consult-message/list"),
    apiRequest("/referral/alumni-info/list")
  ]);
  return {
    overview: overview.data,
    industry: industry.data,
    city: city.data,
    hotJobs: hotJobs.data,
    trend: trend.data,
    jobs: jobs.data.list || [],
    applications: applications.data.list || [],
    consults: consults.data.list || [],
    alumni: alumni.data.list || []
  };
}

async function fetchAlumniOverviewBundle(session) {
  const [overview, jobs, applications, consults] = await Promise.all([
    apiRequest("/referral/dashboard/overview"),
    apiRequest(`/referral/job-info/list?alumniId=${session.profileId}`),
    apiRequest(`/referral/referral-application/list?alumniId=${session.profileId}`),
    apiRequest("/referral/consult-message/list")
  ]);
  return {
    overview: overview.data,
    jobs: jobs.data.list || [],
    applications: applications.data.list || [],
    consults: consults.data.list || []
  };
}

function renderAdminDashboard(bundle) {
  const pendingJobs = bundle.jobs.filter((item) => item.auditStatus === 0).length;
  const pendingAlumni = bundle.alumni.filter((item) => item.verifyStatus !== 1).length;
  const waitingApplications = bundle.applications.filter((item) => item.applyStatus === 0 || item.applyStatus === 1).length;
  const repliedConsults = bundle.consults.filter((item) => item.readStatus === 1).length;

  renderAppLayout("dashboard", "平台概览", "从关键指标、待办任务和分布统计三个层面查看系统当前状态。", `
    <section class="panel reveal">
      <div class="panel-header">
        <div>
          <h2>核心指标</h2>
          <p>适合汇报时先说明平台规模、用户数量和业务闭环完成度。</p>
        </div>
      </div>
      <div class="cards" id="overview-cards"></div>
    </section>
    <section class="grid-2 reveal reveal-delay-1">
      <div class="panel">
        <div class="panel-header">
          <div>
            <h2>当前待办</h2>
            <p>管理员优先关注岗位审核、校友核验和申请推进情况。</p>
          </div>
        </div>
        <div class="cards">
          <div class="card"><div class="card-label">待审岗位</div><div class="card-value">${pendingJobs}</div><div class="card-sub">需要管理员处理</div></div>
          <div class="card"><div class="card-label">待核验校友</div><div class="card-value">${pendingAlumni}</div><div class="card-sub">影响岗位可信度</div></div>
          <div class="card"><div class="card-label">待跟进申请</div><div class="card-value">${waitingApplications}</div><div class="card-sub">尚未进入推荐结果</div></div>
          <div class="card"><div class="card-label">已回消息</div><div class="card-value">${repliedConsults}</div><div class="card-sub">沟通链路保持活跃</div></div>
        </div>
        <div class="action-group top-gap">
          <a class="btn" href="/audit-center.html">进入审核工作台</a>
          <a class="btn ghost-btn" href="/applications.html">查看申请总览</a>
        </div>
      </div>
      <div class="panel floating-panel">
        <div class="panel-header">
          <div>
            <h2>汇报建议</h2>
            <p>这一页适合重点说明系统的管理价值和可视化能力。</p>
          </div>
        </div>
        <div class="compact-list">
          <div class="compact-item"><strong>第一步：</strong><p>先展示平台用户规模，以及岗位、申请总量。</p></div>
          <div class="compact-item"><strong>第二步：</strong><p>再讲审核工作台如何集中处理待办任务。</p></div>
          <div class="compact-item"><strong>第三步：</strong><p>最后结合行业、城市、热门岗位说明统计分析能力。</p></div>
        </div>
      </div>
    </section>
    <section class="grid-2 reveal reveal-delay-2">
      <div class="sub-panel"><h3>行业分布</h3><div id="industry-list" class="metric-list"></div></div>
      <div class="sub-panel"><h3>城市分布</h3><div id="city-list" class="metric-list"></div></div>
      <div class="sub-panel"><h3>热门岗位</h3><div id="hot-jobs-list" class="metric-list"></div></div>
      <div class="sub-panel"><h3>申请趋势</h3><div id="trend-list" class="metric-list"></div></div>
    </section>
  `);

  const cards = [
    ["校友人数", bundle.overview.totalAlumni],
    ["学生人数", bundle.overview.totalStudents],
    ["企业数量", bundle.overview.totalCompanies],
    ["岗位数量", bundle.overview.totalJobs],
    ["申请数量", bundle.overview.totalApplications],
    ["已处理申请", bundle.overview.processedApplications]
  ];
  document.getElementById("overview-cards").innerHTML = cards.map(([label, value]) => `
    <div class="card"><div class="card-label">${label}</div><div class="card-value">${value}</div></div>
  `).join("");

  renderMetricList("industry-list", bundle.industry);
  renderMetricList("city-list", bundle.city);
  renderMetricList("hot-jobs-list", bundle.hotJobs, "jobTitle", "count");
  renderMetricList("trend-list", bundle.trend, "label", "count");
}

function renderAlumniDashboard(session, bundle) {
  const myJobs = bundle.jobs;
  const myApplications = bundle.applications;
  const myConsults = bundle.consults
    .filter((item) => item.senderUserId === session.userId || item.receiverUserId === session.userId)
    .slice(0, 6);
  const recommendedCount = myApplications.filter((item) => item.applyStatus === 2 || item.applyStatus === 4).length;
  const pendingCount = myApplications.filter((item) => item.applyStatus === 0 || item.applyStatus === 1).length;

  renderAppLayout("dashboard", "我的概览", "从岗位发布、学生申请和消息沟通三个方向查看当前内推工作。", `
    <section class="panel reveal">
      <div class="panel-header">
        <div>
          <h2>我的工作面板</h2>
          <p>这部分适合演示校友如何从岗位发布走到申请处理和沟通反馈。</p>
        </div>
      </div>
      <div class="cards">
        <div class="card"><div class="card-label">我的岗位</div><div class="card-value">${myJobs.length}</div><div class="card-sub">已录入的内推岗位</div></div>
        <div class="card"><div class="card-label">收到申请</div><div class="card-value">${myApplications.length}</div><div class="card-sub">学生投递到我岗位上的申请</div></div>
        <div class="card"><div class="card-label">已推荐</div><div class="card-value">${recommendedCount}</div><div class="card-sub">已进入推荐或完成阶段</div></div>
        <div class="card"><div class="card-label">待处理</div><div class="card-value">${pendingCount}</div><div class="card-sub">需要我尽快查看和回复</div></div>
      </div>
    </section>
    <section class="grid-2 reveal reveal-delay-1">
      <div class="panel">
        <div class="panel-header"><div><h2>最近岗位</h2><p>可以从这里继续查看审核状态和发布进度。</p></div></div>
        <div class="compact-list">
          ${myJobs.slice(0, 5).map((item) => {
            const badge = jobAuditBadge(item.auditStatus);
            return `
              <div class="compact-item">
                <div class="split-header">
                  <strong>${item.jobTitle}</strong>
                  <span class="status-badge ${badge.cls}">${badge.text}</span>
                </div>
                <p>${item.companyName || "未绑定企业"} / ${item.city || "城市待定"}</p>
              </div>
            `;
          }).join("") || `<div class="compact-item">当前还没有岗位记录。</div>`}
        </div>
      </div>
      <div class="panel">
        <div class="panel-header"><div><h2>最近消息</h2><p>展示围绕岗位的最新沟通内容。</p></div></div>
        <div class="compact-list">
          ${myConsults.map((item) => `
            <div class="compact-item">
              <strong>岗位 ${item.jobId}</strong>
              <p>${item.content}</p>
            </div>
          `).join("") || `<div class="compact-item">当前没有新的沟通消息。</div>`}
        </div>
      </div>
    </section>
  `);
}

document.addEventListener("DOMContentLoaded", async () => {
  const session = ensureLogin();
  if (session.role === "ADMIN") {
    renderAdminDashboard(await fetchAdminOverviewBundle());
    return;
  }
  renderAlumniDashboard(session, await fetchAlumniOverviewBundle(session));
});
