async function fetchStudentDashboardBundle(session) {
  const [overview, jobs, applications, consults] = await Promise.all([
    apiRequest("/referral/dashboard/overview"),
    apiRequest("/referral/job-info/match-list"),
    apiRequest("/referral/referral-application/list"),
    apiRequest("/referral/consult-message/list")
  ]);
  return {
    overview: overview.data,
    jobs: jobs.data.list || [],
    applications: (applications.data.list || []).filter((item) => item.studentId === session.profileId),
    consults: (consults.data.list || []).filter((item) => item.senderUserId === session.userId || item.receiverUserId === session.userId)
  };
}

async function fetchAlumniDashboardBundle(session) {
  const [overview, jobs, applications, consults] = await Promise.all([
    apiRequest("/referral/dashboard/overview"),
    apiRequest("/referral/job-info/list"),
    apiRequest("/referral/referral-application/list"),
    apiRequest("/referral/consult-message/list")
  ]);
  return {
    overview: overview.data,
    jobs: jobs.data.list || [],
    applications: applications.data.list || [],
    consults: (consults.data.list || []).filter((item) => item.senderUserId === session.userId || item.receiverUserId === session.userId)
  };
}

function buildRecommendedJobs(jobs) {
  return jobs
    .filter((item) => ["上海", "杭州", "北京", "深圳"].includes(item.city))
    .sort((first, second) => (second.id || 0) - (first.id || 0))
    .slice(0, 3);
}

function renderStudentDashboard(session, bundle, favoriteIds) {
  const myApplications = bundle.applications;
  const myConsults = bundle.consults.slice(0, 5);
  const interviewReady = myApplications.filter((item) => item.applyStatus === 2 || item.applyStatus === 4).length;
  const recommendedJobs = buildRecommendedJobs(bundle.jobs);

  renderAppLayout("dashboard", "求职首页", "集中查看推荐职位、投递进度和最近消息。", `
    <section class="job-search-hero">
      <div class="hero-panel reveal">
        <span class="hero-badge">Career Feed</span>
        <h2>今天值得优先查看的校友内推职位</h2>
        <p>从推荐岗位直接进入详情、收藏和申请，形成完整的求职操作链路。</p>
        <div class="search-bar">
          <input id="student-keyword" placeholder="搜索职位、公司或技能关键词">
          <select id="student-city">
            <option value="">城市不限</option>
            <option value="上海">上海</option>
            <option value="杭州">杭州</option>
            <option value="北京">北京</option>
            <option value="深圳">深圳</option>
          </select>
          <select id="student-industry">
            <option value="">行业不限</option>
            <option value="互联网">互联网</option>
            <option value="人工智能">人工智能</option>
            <option value="金融科技">金融科技</option>
          </select>
          <button class="btn" id="go-jobs">去找职位</button>
        </div>
        <div class="insight-bar">
          <span class="insight-pill">真实校友岗位</span>
          <span class="insight-pill">申请状态可追踪</span>
          <span class="insight-pill">可直接联系校友</span>
        </div>
        <div id="dashboard-summary" class="market-marquee"></div>
      </div>
      <div class="panel floating-panel reveal reveal-delay-1">
        <div class="section-eyebrow">My Pipeline</div>
        <div class="panel-header">
          <div>
            <h2>我的求职节奏</h2>
            <p>把收藏、投递、处理进度和消息提醒放在同一视图里。</p>
          </div>
        </div>
        <div class="cards">
          <div class="card"><div class="card-label">在招职位</div><div class="card-value">${bundle.jobs.length}</div><div class="card-sub">当前全部可投递岗位</div></div>
          <div class="card"><div class="card-label">我的申请</div><div class="card-value">${myApplications.length}</div><div class="card-sub">已经提交的内推申请</div></div>
          <div class="card"><div class="card-label">已处理</div><div class="card-value">${myApplications.filter((item) => item.applyStatus !== 0).length}</div><div class="card-sub">校友已查看或已推进</div></div>
          <div class="card"><div class="card-label">消息提醒</div><div class="card-value">${myConsults.length}</div><div class="card-sub">最近相关沟通消息</div></div>
        </div>
      </div>
    </section>
    <section class="panel reveal reveal-delay-1">
      <div class="section-eyebrow">Recommended</div>
      <div class="panel-header">
        <div>
          <h2>推荐职位</h2>
          <p>优先展示适合快速浏览和进入详情的岗位卡片。</p>
        </div>
      </div>
      <div id="recommended-job-list" class="job-card-list"></div>
    </section>
    <section class="feature-grid reveal reveal-delay-2">
      <div class="feature-card"><span class="section-eyebrow">Feature 01</span><strong>职位收藏</strong><p>先保存感兴趣的岗位，再统一比较和投递。</p></div>
      <div class="feature-card"><span class="section-eyebrow">Feature 02</span><strong>进度跟踪</strong><p>每条申请都能看到状态变化和处理备注。</p></div>
      <div class="feature-card"><span class="section-eyebrow">Feature 03</span><strong>校友沟通</strong><p>围绕具体岗位直接咨询校友，更贴近真实产品。</p></div>
    </section>
    <section class="grid-2 reveal reveal-delay-3">
      <div class="panel">
        <div class="panel-header"><div><h2>我的申请</h2><p>最近投递状态变化。</p></div></div>
        <div class="timeline">
          ${myApplications.slice(0, 4).map((item) => {
            const badge = statusBadge(item.applyStatus);
            return `
              <div class="timeline-item">
                <div class="split-header">
                  <div><strong>${item.jobTitle}</strong><div class="job-card-company">${item.alumniName}</div></div>
                  <span class="status-badge ${badge.cls}">${badge.text}</span>
                </div>
                <div class="meta-row"><span class="meta-tag">${item.processRemark || "等待处理"}</span></div>
              </div>
            `;
          }).join("") || `<div class="timeline-item">还没有投递记录，先去职位页看看。</div>`}
        </div>
      </div>
      <div class="panel">
        <div class="panel-header"><div><h2>消息提醒</h2><p>最近收到的校友回复。</p></div></div>
        <div class="compact-list">
          ${myConsults.map((item) => `
            <div class="compact-item">
              <strong>职位 ${item.jobId}</strong>
              <div class="job-card-company">${item.content}</div>
            </div>
          `).join("") || `<div class="compact-item">暂时没有消息。</div>`}
        </div>
      </div>
    </section>
  `);

  document.getElementById("dashboard-summary").innerHTML = `
    <div class="mini-stat"><span>在招职位</span><strong>${bundle.jobs.length}</strong></div>
    <div class="mini-stat"><span>已收藏</span><strong>${favoriteIds.length}</strong></div>
    <div class="mini-stat"><span>消息提醒</span><strong>${myConsults.length}</strong></div>
    <div class="mini-stat"><span>推进阶段</span><strong>${interviewReady}</strong></div>
  `;

  const recommendedNode = document.getElementById("recommended-job-list");
  recommendedNode.innerHTML = recommendedJobs.map((job) => {
    const favorited = isFavoriteJob(session.profileId, job.id);
    return `
      <article class="job-card">
        <div class="job-card-top">
          <div>
            <span class="job-card-company">${job.companyName || "校友企业"}</span>
            <h3>${job.jobTitle}</h3>
          </div>
          <span class="match-badge">${job.city || "城市待定"}</span>
        </div>
        <p class="job-card-desc">${job.jobDesc || "该岗位支持校友内推，适合学生端快速浏览和申请。"}</p>
        <div class="meta-row">
          <span class="meta-tag">${job.industry || "行业不限"}</span>
          <span class="meta-tag">${job.educationRequirement || "学历不限"}</span>
          <span class="meta-tag">${job.salaryRange || "薪资面议"}</span>
        </div>
        <div class="action-group top-gap">
          <a class="btn" href="/job-detail.html?id=${job.id}">查看详情</a>
          <button class="btn ghost-btn favorite-btn ${favorited ? "active-favorite" : ""}" data-job-id="${job.id}">
            ${favorited ? "已收藏" : "收藏职位"}
          </button>
        </div>
      </article>
    `;
  }).join("") || `<div class="empty-state">当前没有可展示的推荐职位。</div>`;

  document.querySelectorAll(".favorite-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        const favorited = await toggleFavoriteJob(session.profileId, button.dataset.jobId);
        setFavoriteButtonState(button, favorited, "已收藏", "收藏职位");
      } finally {
        button.disabled = false;
      }
    });
  });

  document.getElementById("go-jobs").addEventListener("click", () => {
    const keyword = encodeURIComponent(document.getElementById("student-keyword").value || "");
    const city = encodeURIComponent(document.getElementById("student-city").value || "");
    const industry = encodeURIComponent(document.getElementById("student-industry").value || "");
    location.href = `/jobs.html?keyword=${keyword}&city=${city}&industry=${industry}`;
  });
}

function renderAlumniDashboard(bundle) {
  const recommendedCount = bundle.applications.filter((item) => item.applyStatus === 2 || item.applyStatus === 4).length;
  const pendingCount = bundle.applications.filter((item) => item.applyStatus === 0 || item.applyStatus === 1).length;
  const unreadConsults = bundle.consults.filter((item) => item.readStatus !== 1).length;

  renderAppLayout("dashboard", "校友工作台", "从岗位发布、学生申请和消息沟通三个方向查看当前内推工作。", `
    <section class="panel reveal">
      <div class="panel-header">
        <div>
          <h2>我的工作面板</h2>
          <p>这部分适合演示校友如何从岗位发布走到申请处理和沟通反馈。</p>
        </div>
      </div>
      <div class="cards">
        <div class="card"><div class="card-label">我的岗位</div><div class="card-value">${bundle.jobs.length}</div><div class="card-sub">已录入的内推岗位</div></div>
        <div class="card"><div class="card-label">收到申请</div><div class="card-value">${bundle.applications.length}</div><div class="card-sub">学生投递到我岗位上的申请</div></div>
        <div class="card"><div class="card-label">已推进</div><div class="card-value">${recommendedCount}</div><div class="card-sub">已进入推荐或完成阶段</div></div>
        <div class="card"><div class="card-label">待处理</div><div class="card-value">${pendingCount}</div><div class="card-sub">需要尽快查看和回复</div></div>
      </div>
    </section>
    <section class="grid-2 reveal reveal-delay-1">
      <div class="panel">
        <div class="panel-header"><div><h2>最近岗位</h2><p>可以从这里继续查看审核状态和发布进度。</p></div></div>
        <div class="compact-list">
          ${bundle.jobs.slice(0, 5).map((item) => {
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
          ${bundle.consults.slice(0, 6).map((item) => `
            <div class="compact-item">
              <strong>岗位 ${item.jobId}</strong>
              <p>${item.content}</p>
            </div>
          `).join("") || `<div class="compact-item">当前没有新的沟通消息。</div>`}
        </div>
      </div>
    </section>
    <section class="feature-grid reveal reveal-delay-2">
      <div class="feature-card"><span class="section-eyebrow">岗位治理</span><strong>发岗待审</strong><p>编辑岗位后会重新回到待审核状态，保证内容变更可追踪。</p></div>
      <div class="feature-card"><span class="section-eyebrow">申请处理</span><strong>状态闭环</strong><p>收到申请后可查看附件、填写处理意见并推进状态。</p></div>
      <div class="feature-card"><span class="section-eyebrow">消息跟进</span><strong>线程回复</strong><p>消息只围绕已发生投递的岗位展开，避免错发到无关对象。</p></div>
    </section>
    <section class="panel reveal reveal-delay-3">
      <div class="page-action-bar">
        <div class="page-action-note">当前未读消息 ${unreadConsults} 条，建议优先处理待审核岗位与待跟进申请。</div>
        <div class="action-group">
          <a class="btn" href="/jobs.html">去管理岗位</a>
          <a class="btn ghost-btn" href="/applications.html">去处理申请</a>
        </div>
      </div>
    </section>
  `);
}

document.addEventListener("DOMContentLoaded", async () => {
  const session = ensureLogin();
  if (session.role === "ALUMNI") {
    const bundle = await fetchAlumniDashboardBundle(session);
    renderAlumniDashboard(bundle);
    return;
  }

  await fetchFavoriteJobIds(session.profileId);
  const bundle = await fetchStudentDashboardBundle(session);
  renderStudentDashboard(session, bundle, getFavoriteJobIds(session.profileId));
});
