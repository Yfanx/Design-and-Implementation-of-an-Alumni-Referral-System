async function loadStudentJobs() {
  const result = await apiRequest("/referral/job-info/match-list");
  return result.data?.list || [];
}

async function loadApplications() {
  const result = await apiRequest("/referral/referral-application/list");
  return result.data?.list || [];
}

async function loadAlumniJobs() {
  const result = await apiRequest("/referral/job-info/list");
  return result.data?.list || [];
}

async function loadCurrentAlumniProfile(session) {
  const result = await apiRequest(`/referral/alumni-info/get?id=${session.profileId}`);
  return result.data || {};
}

function uniqueValues(list, selector) {
  return Array.from(new Set((list || []).map(selector).filter(Boolean)))
    .sort((left, right) => left.localeCompare(right, "zh-CN"));
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function getJobFilters() {
  const query = new URLSearchParams(location.search);
  return {
    keyword: query.get("keyword") || "",
    company: query.get("company") || "",
    city: query.get("city") || "",
    industry: query.get("industry") || ""
  };
}

function buildJobFilterQuery() {
  const params = new URLSearchParams({
    keyword: document.getElementById("job-keyword")?.value || "",
    company: document.getElementById("job-company")?.value || "",
    city: document.getElementById("job-city")?.value || "",
    industry: document.getElementById("job-industry")?.value || ""
  });
  location.href = `/jobs.html?${params.toString()}`;
}

function renderSelectOptions(values, selected, emptyLabel) {
  return `
    <option value="">${emptyLabel}</option>
    ${(values || []).map((value) => `
      <option value="${escapeHtml(value)}" ${value === selected ? "selected" : ""}>${escapeHtml(value)}</option>
    `).join("")}
  `;
}

function filterStudentJobs(jobs, filters) {
  const keyword = normalizeText(filters.keyword);
  return (jobs || []).filter((item) => {
    const keywordText = normalizeText([
      item.jobTitle,
      item.companyName,
      item.industry,
      item.city,
      item.skillRequirement,
      item.jobDesc
    ].join(" "));
    return (!keyword || keywordText.includes(keyword))
      && (!filters.company || item.companyName === filters.company)
      && (!filters.city || item.city === filters.city)
      && (!filters.industry || item.industry === filters.industry);
  });
}

function buildStudentSpotlightCards(jobs = []) {
  return jobs.slice(0, 3).map((job, index) => `
    <article class="compact-item">
      <div class="split-header">
        <div>
          <strong>${escapeHtml(job.jobTitle || "-")}</strong>
          <div class="job-card-company">${escapeHtml(job.companyName || "-")} / ${escapeHtml(job.city || "-")}</div>
        </div>
        <span class="pill">TOP ${index + 1}</span>
      </div>
      <div class="meta-row">
        <span class="meta-tag">${escapeHtml(job.industry || "行业不限")}</span>
        <span class="meta-tag">${escapeHtml(job.educationRequirement || "学历不限")}</span>
        <span class="meta-tag">${asNumber(job.matchScore)}%</span>
      </div>
    </article>
  `).join("") || `<div class="empty-state">暂无推荐岗位</div>`;
}

function renderStudentPriorityCards(jobs = []) {
  return jobs.slice(0, 3).map((job, index) => `
    <article class="jobs-priority-card">
      <div class="jobs-priority-rank jobs-priority-rank-${index + 1}">TOP ${index + 1}</div>
      <div class="jobs-priority-copy">
        <strong>${escapeHtml(job.jobTitle || "-")}</strong>
        <span>${escapeHtml(job.companyName || "-")} / ${escapeHtml(job.city || "-")}</span>
        <div class="meta-row">
          <span class="meta-tag">${escapeHtml(job.industry || "行业不限")}</span>
          <span class="meta-tag">${escapeHtml(job.educationRequirement || "学历不限")}</span>
          <span class="meta-tag jobs-match-tag">${asNumber(job.matchScore)}%</span>
        </div>
      </div>
      <a class="jobs-priority-link" href="/job-detail.html?id=${job.id}">›</a>
    </article>
  `).join("") || '<div class="empty-state">暂无推荐岗位</div>';
}

function buildJobsMetricIcon(type) {
  const icons = {
    results: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"></circle><path d="m16 16 4 4"></path></svg>',
    applied: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12.5 10 18l10-12"></path><path d="M4 6h8"></path></svg>',
    score: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v18"></path><path d="M5 12h14"></path><path d="M7.5 7.5 12 12l4.5-4.5"></path></svg>'
  };
  return `<span class="jobs-metric-icon jobs-metric-icon-${type}">${icons[type] || icons.results}</span>`;
}

function buildJobSkillTags(job) {
  const tags = String(job.skillRequirement || "")
    .split(/[、,，/| ]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4);
  if (!tags.length) {
    return `
      <span class="meta-tag">${escapeHtml(job.industry || "行业方向")}</span>
      <span class="meta-tag">${escapeHtml(job.educationRequirement || "学历不限")}</span>
      <span class="meta-tag">内推岗位</span>
    `;
  }
  return tags.map((item) => `<span class="meta-tag">${escapeHtml(item)}</span>`).join("");
}

function renderJobsHotFilters(jobs = []) {
  const terms = [];
  jobs.slice(0, 6).forEach((item) => {
    [item.jobTitle, item.city, item.industry].forEach((value) => {
      const text = String(value || "").trim();
      if (text && !terms.includes(text) && terms.length < 6) {
        terms.push(text);
      }
    });
  });
  return terms.map((term) => `<span class="jobs-hot-chip">${escapeHtml(term)}</span>`).join("");
}

function renderJobsPreferenceSummary(filters, rankedJobs) {
  const topCities = Array.from(new Set(rankedJobs.map((item) => item.city).filter(Boolean))).slice(0, 2).join(" / ") || "城市不限";
  const topIndustries = Array.from(new Set(rankedJobs.map((item) => item.industry).filter(Boolean))).slice(0, 2).join(" / ") || "行业不限";
  return `
    <div class="jobs-preference-list">
      <div><span>方向</span><strong>${escapeHtml(filters.keyword || "后端开发")}</strong></div>
      <div><span>城市</span><strong>${escapeHtml(filters.city || topCities)}</strong></div>
      <div><span>行业</span><strong>${escapeHtml(filters.industry || topIndustries)}</strong></div>
      <div><span>学历</span><strong>本科及以上</strong></div>
    </div>
  `;
}

function renderJobsTipsPanel(appliedJobIds, favoriteIds) {
  return `
    <div class="jobs-tip-list">
      <div><strong>优先投递高匹配岗位</strong><span>已在处理 ${appliedJobIds.size} 个岗位，建议优先跟进高匹配机会。</span></div>
      <div><strong>保持简历完整度</strong><span>收藏中的 ${favoriteIds.length} 个岗位建议结合资料页继续补充亮点。</span></div>
      <div><strong>主动跟进校友沟通</strong><span>投递后可通过消息中心及时沟通，增加曝光机会。</span></div>
    </div>
  `;
}

function renderJobKeywordField(value = "", placeholder = "搜索岗位") {
  return `
    <label class="job-search-keyword">
      <span class="job-search-keyword-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"></circle><path d="m16 16 4 4"></path></svg>
      </span>
      <input id="job-keyword" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}">
    </label>
  `;
}

function buildStudentJobCard(job, favoriteIds, appliedJobIds) {
  const favorited = favoriteIds.includes(Number(job.id));
  const applied = appliedJobIds.has(Number(job.id));
  return `
    <article class="job-card market-job-card">
      <div class="job-card-top">
        <div>
          <h3 class="job-card-title">${escapeHtml(job.jobTitle || "-")}</h3>
          <div class="job-card-company">${escapeHtml(job.companyName || "-")} / ${escapeHtml(job.city || "-")}</div>
        </div>
        <div class="market-job-salary">
          <strong>${escapeHtml(job.salaryRange || "薪资面议")}</strong>
          <span class="status-badge ${applied ? "status-approved" : "status-pending"}">${applied ? "已投递" : "未投递"}</span>
        </div>
      </div>
      <div class="meta-row">
        <span class="meta-tag">${escapeHtml(job.industry || "行业不限")}</span>
        <span class="meta-tag">${escapeHtml(job.educationRequirement || "学历不限")}</span>
        <span class="meta-tag jobs-match-tag">匹配 ${asNumber(job.matchScore)}%</span>
      </div>
      <p class="job-card-desc">${escapeHtml(job.jobDesc || "暂无岗位描述。")}</p>
      <div class="meta-row market-job-tags">
        ${buildJobSkillTags(job)}
      </div>
      <div class="job-card-actions">
        <button class="btn ghost-btn favorite-btn ${favorited ? "active-favorite" : ""}" data-job-id="${job.id}">
          ${favorited ? "已收藏" : "收藏岗位"}
        </button>
        <a class="btn ghost-btn" href="/job-detail.html?id=${job.id}">查看详情</a>
        <a class="btn" href="/applications.html?jobId=${job.id}">${applied ? "查看申请" : "立即投递"}</a>
      </div>
    </article>
  `;
}

function renderStudentJobs(session, jobs, favoriteIds, applications) {
  const filters = getJobFilters();
  const filteredJobs = filterStudentJobs(jobs, filters);
  const rankedJobs = filteredJobs.slice().sort((left, right) => asNumber(right.matchScore) - asNumber(left.matchScore));
  const companies = uniqueValues(jobs, (item) => item.companyName);
  const cities = uniqueValues(jobs, (item) => item.city);
  const industries = uniqueValues(jobs, (item) => item.industry);
  const appliedJobIds = new Set(
    (applications || [])
      .filter((item) => Number(item.applyStatus) !== 5)
      .map((item) => Number(item.jobId))
  );
  const averageScore = rankedJobs.length
    ? Math.round(rankedJobs.reduce((sum, item) => sum + asNumber(item.matchScore), 0) / rankedJobs.length)
    : 0;

  renderAppLayout("jobs", "职位广场", "", `
    <section class="job-search-hero reveal">
      <div class="hero-panel">
        <span class="hero-kicker">岗位检索</span>
        <h2>快速找到适合你的校友内推岗位</h2>
        <p>按关键词、企业、城市和行业筛选，结果按匹配度优先展示。</p>
        <div class="search-bar job-search-bar">
          <input id="job-keyword" value="${escapeHtml(filters.keyword)}" placeholder="搜索岗位、企业或技能">
          <select id="job-company">${renderSelectOptions(companies, filters.company, "企业不限")}</select>
          <select id="job-city">${renderSelectOptions(cities, filters.city, "城市不限")}</select>
          <select id="job-industry">${renderSelectOptions(industries, filters.industry, "行业不限")}</select>
          <button class="btn" id="search-job-btn">开始筛选</button>
        </div>
        <div class="hero-stat-row">
          <div class="hero-stat">
            <span>结果数</span>
            <strong>${filteredJobs.length}</strong>
          </div>
          <div class="hero-stat">
            <span>已申请</span>
            <strong>${appliedJobIds.size}</strong>
          </div>
          <div class="hero-stat">
            <span>平均匹配</span>
            <strong>${averageScore}%</strong>
          </div>
        </div>
      </div>
      <div class="hero-panel">
        <div class="panel-header">
          <div>
            <h3>优先推荐</h3>
            <p>匹配度最高的岗位会优先展示在这里。</p>
          </div>
        </div>
        <div class="compact-list">
          ${buildStudentSpotlightCards(rankedJobs)}
        </div>
      </div>
    </section>
    <section class="panel reveal reveal-delay-1">
      <div class="panel-header">
        <div>
          <h2>岗位列表</h2>
          <p>支持继续收藏、查看详情和发起申请。</p>
        </div>
        <span class="meta-tag">${rankedJobs.length} 个岗位</span>
      </div>
      <div id="student-job-list" class="job-card-list market-grid"></div>
    </section>
  `, { hideDefaultHero: true });

  document.getElementById("student-job-list").innerHTML = rankedJobs.map((job) => (
    buildStudentJobCard(job, favoriteIds, appliedJobIds)
  )).join("") || `<div class="empty-state">暂无符合条件的岗位。</div>`;

  document.querySelectorAll(".favorite-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        const favorited = await toggleFavoriteJob(session.profileId, button.dataset.jobId);
        setFavoriteButtonState(button, favorited);
      } finally {
        button.disabled = false;
      }
    });
  });

  document.getElementById("search-job-btn")?.addEventListener("click", buildJobFilterQuery);
}

function buildJobPayload(form, alumniProfile) {
  const payload = formPayload(form);
  payload.companyId = payload.companyId || alumniProfile.companyId;
  if (!payload.referralQuota) {
    payload.referralQuota = 1;
  }
  return payload;
}

function openJobEditor({ alumniProfile, job = {}, onSubmit }) {
  const isEdit = !!job.id;
  const values = {
    id: job.id || "",
    companyId: job.companyId || alumniProfile.companyId || "",
    companyName: job.companyName || alumniProfile.companyName || "",
    jobTitle: job.jobTitle || "",
    jobType: job.jobType || "校招",
    industry: job.industry || alumniProfile.industry || "互联网",
    city: job.city || alumniProfile.city || "上海",
    salaryRange: job.salaryRange || "",
    educationRequirement: job.educationRequirement || "本科",
    experienceRequirement: job.experienceRequirement || "",
    skillRequirement: job.skillRequirement || "",
    contactType: job.contactType || "站内消息",
    referralQuota: job.referralQuota || 3,
    jobDesc: job.jobDesc || ""
  };
  const hasCompany = !!values.companyId;

  openPageModal({
    title: isEdit ? "编辑岗位" : "发布岗位",
    subtitle: "",
    size: "wide",
    body: `
      <form id="job-editor-form" class="demo-form">
        <input type="hidden" name="id" value="${values.id}">
        <input type="hidden" name="companyId" value="${values.companyId}">
        <div class="form-grid">
          <label class="form-field">
            <span>企业</span>
            <input value="${escapeHtml(values.companyName || "未绑定企业")}" readonly>
          </label>
          <label class="form-field">
            <span>岗位名称</span>
            <input name="jobTitle" value="${escapeHtml(values.jobTitle)}" required>
          </label>
          <label class="form-field">
            <span>岗位类型</span>
            <select name="jobType">
              ${["校招", "实习", "社招"].map((item) => `<option value="${item}" ${values.jobType === item ? "selected" : ""}>${item}</option>`).join("")}
            </select>
          </label>
          <label class="form-field">
            <span>行业</span>
            <input name="industry" value="${escapeHtml(values.industry)}">
          </label>
          <label class="form-field">
            <span>城市</span>
            <input name="city" value="${escapeHtml(values.city)}">
          </label>
          <label class="form-field">
            <span>薪资</span>
            <input name="salaryRange" value="${escapeHtml(values.salaryRange)}" placeholder="15k-25k">
          </label>
          <label class="form-field">
            <span>学历</span>
            <input name="educationRequirement" value="${escapeHtml(values.educationRequirement)}">
          </label>
          <label class="form-field">
            <span>经验</span>
            <input name="experienceRequirement" value="${escapeHtml(values.experienceRequirement)}">
          </label>
          <label class="form-field">
            <span>联系渠道</span>
            <input name="contactType" value="${escapeHtml(values.contactType)}">
          </label>
          <label class="form-field">
            <span>名额</span>
            <input name="referralQuota" value="${values.referralQuota}">
          </label>
          <label class="form-field field-span-2">
            <span>技能要求</span>
            <input name="skillRequirement" value="${escapeHtml(values.skillRequirement)}">
          </label>
          <label class="form-field field-span-2">
            <span>岗位描述</span>
            <textarea name="jobDesc">${escapeHtml(values.jobDesc)}</textarea>
          </label>
        </div>
        <div class="page-action-bar top-gap">
          <div id="job-editor-result" class="action-result">${hasCompany ? "准备保存" : "请先在资料页绑定企业"}</div>
          <div class="action-group">
            ${hasCompany ? "" : `<a class="btn ghost-btn" href="/profile.html">完善资料</a>`}
            <button type="button" class="btn ghost-btn" id="cancel-job-edit">取消</button>
            <button type="submit" class="btn" ${hasCompany ? "" : "disabled"}>保存</button>
          </div>
        </div>
      </form>
    `,
    onReady(body) {
      body.querySelector("#cancel-job-edit")?.addEventListener("click", closePageModal);
      body.querySelector("#job-editor-form")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const resultNode = body.querySelector("#job-editor-result");
        try {
          resultNode.innerText = "保存中...";
          await onSubmit(buildJobPayload(event.target, alumniProfile));
          resultNode.innerText = "已保存";
          setTimeout(() => location.reload(), 300);
        } catch (error) {
          resultNode.innerText = error.message || "保存失败";
        }
      });
    }
  });
}

function renderAlumniJobCard(job) {
  const badge = jobAuditBadge(Number(job.auditStatus));
  return `
    <article class="compact-item">
      <div class="split-header">
        <div>
          <strong>${escapeHtml(job.jobTitle || "-")}</strong>
          <div class="job-card-company">${escapeHtml(job.companyName || "-")} / ${escapeHtml(job.city || "-")}</div>
        </div>
        <span class="status-badge ${badge.cls}">${badge.text}</span>
      </div>
      <div class="meta-row">
        <span class="meta-tag">${escapeHtml(job.industry || "-")}</span>
        <span class="meta-tag">${escapeHtml(job.salaryRange || "-")}</span>
        <span class="meta-tag">名额 ${job.referralQuota || 0}</span>
      </div>
      <p>${escapeHtml(job.jobDesc || "暂无岗位描述。")}</p>
      <div class="action-group top-gap">
        <a class="btn ghost-btn" href="/job-detail.html?id=${job.id}">查看详情</a>
        <button class="btn ghost-btn edit-job-btn" data-id="${job.id}">编辑</button>
        <button class="btn ghost-btn delete-job-btn" data-id="${job.id}">删除</button>
      </div>
    </article>
  `;
}

function renderAlumniJobs(jobs, alumniProfile) {
  const approvedCount = jobs.filter((item) => Number(item.auditStatus) === 1).length;
  const pendingCount = jobs.filter((item) => Number(item.auditStatus) === 0).length;
  renderAppLayout("jobs", "岗位管理", "", `
    <section class="job-search-hero reveal">
      <div class="hero-panel">
        <span class="hero-kicker">岗位维护</span>
        <h2>集中管理你的校友内推岗位</h2>
        <p>支持发布、编辑和删除岗位，审核状态会同步展示。</p>
        <div class="hero-stat-row">
          <div class="hero-stat">
            <span>岗位总数</span>
            <strong>${jobs.length}</strong>
          </div>
          <div class="hero-stat">
            <span>已通过</span>
            <strong>${approvedCount}</strong>
          </div>
          <div class="hero-stat">
            <span>待审核</span>
            <strong>${pendingCount}</strong>
          </div>
        </div>
      </div>
      <div class="hero-panel">
        <div class="panel-header">
          <div>
            <h3>当前绑定</h3>
            <p>${escapeHtml(alumniProfile.companyName || "未绑定企业")} / ${escapeHtml(alumniProfile.city || "-")}</p>
          </div>
          <button class="btn" id="create-job-btn">发布岗位</button>
        </div>
        <div class="compact-list">
          ${jobs.slice(0, 3).map(renderAlumniJobCard).join("") || `<div class="empty-state">暂无岗位，先发布一个岗位。</div>`}
        </div>
      </div>
    </section>
    <section class="panel reveal reveal-delay-1">
      <div class="panel-header">
        <div>
          <h2>全部岗位</h2>
          <p>维护岗位信息并跟踪审核状态。</p>
        </div>
        <span class="meta-tag">${jobs.length} 个岗位</span>
      </div>
      <div class="compact-list" id="alumni-job-list"></div>
    </section>
  `, { hideDefaultHero: true });

  document.getElementById("alumni-job-list").innerHTML = jobs.map(renderAlumniJobCard).join("")
    || `<div class="empty-state">暂无岗位。</div>`;

  document.getElementById("create-job-btn")?.addEventListener("click", () => {
    openJobEditor({
      alumniProfile,
      onSubmit: (payload) => apiRequest("/referral/job-info/create", {
        method: "POST",
        body: JSON.stringify(payload)
      })
    });
  });

  document.querySelectorAll(".edit-job-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const job = jobs.find((item) => Number(item.id) === Number(button.dataset.id));
      if (!job) {
        return;
      }
      openJobEditor({
        alumniProfile,
        job,
        onSubmit: (payload) => apiRequest("/referral/job-info/update", {
          method: "PUT",
          body: JSON.stringify(payload)
        })
      });
    });
  });

  document.querySelectorAll(".delete-job-btn").forEach((button) => {
    button.addEventListener("click", () => {
      openPageModal({
        title: "删除岗位",
        subtitle: "",
        body: `
          <div class="compact-item">确认删除这个岗位吗？</div>
          <div class="page-action-bar top-gap">
            <button class="btn ghost-btn" id="cancel-delete-job">取消</button>
            <button class="btn danger-btn" id="confirm-delete-job">删除</button>
          </div>
        `,
        onReady(body) {
          body.querySelector("#cancel-delete-job")?.addEventListener("click", closePageModal);
          body.querySelector("#confirm-delete-job")?.addEventListener("click", async () => {
            await apiRequest(`/referral/job-info/delete?id=${button.dataset.id}`, { method: "DELETE" });
            location.reload();
          });
        }
      });
    });
  });
}

function renderStudentJobOverview(rankedJobs, favoriteIds, appliedJobIds) {
  const averageScore = rankedJobs.length
    ? Math.round(rankedJobs.reduce((sum, item) => sum + asNumber(item.matchScore), 0) / rankedJobs.length)
    : 0;

  return `
    <div class="job-market-overview-grid">
      <div class="job-market-overview-card">
        ${buildJobsMetricIcon("results")}
        <span>匹配结果</span>
        <strong>${rankedJobs.length}</strong>
        <p>当前筛选条件下可浏览的岗位数</p>
      </div>
      <div class="job-market-overview-card">
        ${buildJobsMetricIcon("applied")}
        <span>已申请</span>
        <strong>${appliedJobIds.size}</strong>
        <p>正在推进中的机会建议优先跟进</p>
      </div>
      <div class="job-market-overview-card">
        ${buildJobsMetricIcon("score")}
        <span>平均匹配</span>
        <strong>${averageScore}%</strong>
        <p>收藏中的 ${favoriteIds.length} 个岗位可继续回看</p>
      </div>
    </div>
  `;
}

function renderStudentJobsV2(session, jobs, favoriteIds, applications) {
  const filters = getJobFilters();
  const filteredJobs = filterStudentJobs(jobs, filters);
  const rankedJobs = filteredJobs.slice().sort((left, right) => asNumber(right.matchScore) - asNumber(left.matchScore));
  const companies = uniqueValues(jobs, (item) => item.companyName);
  const cities = uniqueValues(jobs, (item) => item.city);
  const industries = uniqueValues(jobs, (item) => item.industry);
  const appliedJobIds = new Set(
    (applications || [])
      .filter((item) => Number(item.applyStatus) !== 5)
      .map((item) => Number(item.jobId))
  );
  const topJobs = rankedJobs.slice(0, 3);
  const highlightedJob = topJobs[0];

  renderAppLayout("jobs", "职位广场", "", `
    <section class="job-search-hero reveal">
      <div class="hero-panel hero-panel-compact">
        <span class="hero-kicker">岗位检索</span>
        <h2>把筛选、匹配和投递节奏收进同一张岗位工作台</h2>
        <p>围绕关键词、企业、城市和行业收窄结果，列表区保留收藏、详情与投递动作，不改变你原来的操作链路。</p>
        <div class="search-bar job-search-bar">
          <input id="job-keyword" value="${escapeHtml(filters.keyword)}" placeholder="搜索岗位、企业或技能关键词">
          <select id="job-company">${renderSelectOptions(companies, filters.company, "企业不限")}</select>
          <select id="job-city">${renderSelectOptions(cities, filters.city, "城市不限")}</select>
          <select id="job-industry">${renderSelectOptions(industries, filters.industry, "行业不限")}</select>
          <button class="btn" id="search-job-btn">开始筛选</button>
        </div>
        ${renderStudentJobOverview(rankedJobs, favoriteIds, appliedJobIds)}
      </div>
      <div class="hero-panel hero-panel-compact">
        <div class="panel-header">
          <div>
            <h3>推荐路径</h3>
            <p>先看高匹配岗位，再继续回到收藏、申请和消息，把推进动作接在一起。</p>
          </div>
        </div>
        <div class="compact-list">
          ${highlightedJob ? `
            <article class="compact-item compact-link-card">
              <strong>${escapeHtml(highlightedJob.jobTitle || "-")}</strong>
              <p>${escapeHtml(highlightedJob.companyName || "-")} / ${escapeHtml(highlightedJob.city || "-")} / 匹配 ${asNumber(highlightedJob.matchScore)}%</p>
              <div class="action-group top-gap">
                <a class="btn ghost-btn" href="/job-detail.html?id=${highlightedJob.id}">查看详情</a>
                <a class="btn" href="/applications.html?jobId=${highlightedJob.id}">${appliedJobIds.has(Number(highlightedJob.id)) ? "查看申请" : "立即投递"}</a>
              </div>
            </article>
          ` : '<div class="empty-state">当前筛选条件下暂无推荐岗位。</div>'}
          <a class="compact-item compact-link-card" href="/favorites.html">
            <strong>进入岗位收藏</strong>
            <p>集中整理高意向岗位，准备下一轮比较和投递。</p>
          </a>
          <a class="compact-item compact-link-card" href="/applications.html">
            <strong>查看申请记录</strong>
            <p>继续跟进已投递岗位的处理阶段和最新反馈。</p>
          </a>
          <a class="compact-item compact-link-card" href="/consults.html">
            <strong>前往消息中心</strong>
            <p>围绕已投递岗位继续和校友沟通，减少链路跳转。</p>
          </a>
        </div>
      </div>
    </section>

    <section class="jobs-market-layout reveal reveal-delay-1">
      <section class="panel">
        <div class="panel-header">
          <div>
            <h2>岗位列表</h2>
            <p>按匹配度优先排列，继续支持收藏、查看详情和直接投递。</p>
          </div>
          <span class="meta-tag">${rankedJobs.length} 个岗位</span>
        </div>
        <div id="student-job-list" class="job-card-list market-grid"></div>
      </section>

      <aside class="jobs-market-side-stack">
        <section class="panel">
          <div class="panel-header">
            <div>
              <h2>高匹配速览</h2>
              <p>优先查看最值得立即推进的岗位。</p>
            </div>
          </div>
          <div class="compact-list jobs-compact-stack">
            ${buildStudentSpotlightCards(topJobs)}
          </div>
        </section>

        <section class="panel">
          <div class="panel-header">
            <div>
              <h2>节奏提醒</h2>
              <p>把收藏、投递和沟通节奏压缩在右侧辅助区。</p>
            </div>
          </div>
          <div class="compact-list">
            <div class="compact-item">
              <strong>${favoriteIds.length} 个收藏岗位待比较</strong>
              <p>收藏列表适合整理高意向岗位，再决定下一步投递顺序。</p>
            </div>
            <div class="compact-item">
              <strong>${appliedJobIds.size} 个岗位已在处理中</strong>
              <p>如果已经投递，优先去申请记录和消息中心查看后续反馈。</p>
            </div>
          </div>
        </section>
      </aside>
    </section>
  `, { hideDefaultHero: true });

  document.getElementById("student-job-list").innerHTML = rankedJobs.map((job) => (
    buildStudentJobCard(job, favoriteIds, appliedJobIds)
  )).join("") || '<div class="empty-state">暂无符合当前筛选条件的岗位，试试放宽关键词或城市条件。</div>';

  document.querySelectorAll(".favorite-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        const favorited = await toggleFavoriteJob(session.profileId, button.dataset.jobId);
        setFavoriteButtonState(button, favorited);
      } finally {
        button.disabled = false;
      }
    });
  });

  document.getElementById("search-job-btn")?.addEventListener("click", buildJobFilterQuery);
}

function renderStudentJobsV3(session, jobs, favoriteIds, applications) {
  const filters = getJobFilters();
  const filteredJobs = filterStudentJobs(jobs, filters);
  const rankedJobs = filteredJobs.slice().sort((left, right) => asNumber(right.matchScore) - asNumber(left.matchScore));
  const companies = uniqueValues(jobs, (item) => item.companyName);
  const cities = uniqueValues(jobs, (item) => item.city);
  const industries = uniqueValues(jobs, (item) => item.industry);
  const appliedJobIds = new Set(
    (applications || [])
      .filter((item) => Number(item.applyStatus) !== 5)
      .map((item) => Number(item.jobId))
  );
  const topJobs = rankedJobs.slice(0, 3);

  renderAppLayout("jobs", "职位广场", "", `
    ${renderWorkspaceEditorialHeader(session, { title: "职位广场", subtitle: "岗位浏览与投递" })}
    <section class="job-search-hero reveal">
      <div class="hero-panel hero-panel-compact">
        <span class="hero-kicker">岗位检索</span>
        <h2>快速找到适合你的校友内推岗位</h2>
        <p>按关键词、企业、城市和行业筛选，结果按匹配度优先展示。</p>
        <div class="search-bar job-search-bar">
          ${renderJobKeywordField(filters.keyword, "搜索岗位")}
          <select id="job-company">${renderSelectOptions(companies, filters.company, "企业不限")}</select>
          <select id="job-city">${renderSelectOptions(cities, filters.city, "城市不限")}</select>
          <select id="job-industry">${renderSelectOptions(industries, filters.industry, "行业不限")}</select>
          <button class="btn" id="search-job-btn">开始筛选</button>
        </div>
        ${renderStudentJobOverview(rankedJobs, favoriteIds, appliedJobIds)}
        <div class="jobs-hot-chip-row">${renderJobsHotFilters(rankedJobs)}</div>
      </div>
      <div class="hero-panel hero-panel-compact">
        <div class="panel-header">
          <div>
            <h3>优先推荐</h3>
            <p>匹配度最高的岗位会优先展示在这里。</p>
          </div>
        </div>
        <div class="jobs-priority-list">${renderStudentPriorityCards(topJobs)}</div>
      </div>
    </section>

    <section class="panel reveal reveal-delay-1">
      <div class="panel-header">
        <div>
          <h2>岗位列表</h2>
          <p>支持继续细览收藏、查看详情和发起申请。</p>
        </div>
        <span class="meta-tag">${rankedJobs.length} 个岗位</span>
      </div>
      <div id="student-job-list-v3" class="job-card-list market-grid"></div>
    </section>

    <section class="jobs-bottom-grid reveal reveal-delay-2">
      <section class="panel">
        <div class="panel-header">
          <div>
            <h2>筛选偏好</h2>
            <p>根据你的筛选条件，归纳当前页的重点偏好。</p>
          </div>
        </div>
        ${renderJobsPreferenceSummary(filters, rankedJobs)}
      </section>
      <section class="panel">
        <div class="panel-header">
          <div>
            <h2>投递小贴士</h2>
            <p>围绕匹配度、资料完整度和沟通节奏继续推进。</p>
          </div>
        </div>
        ${renderJobsTipsPanel(appliedJobIds, favoriteIds)}
      </section>
    </section>
  `, { hideDefaultHero: true });

  document.getElementById("student-job-list-v3").innerHTML = rankedJobs.map((job) => (
    buildStudentJobCard(job, favoriteIds, appliedJobIds)
  )).join("") || '<div class="empty-state">暂无符合当前筛选条件的岗位，试试放宽关键词或城市条件。</div>';

  document.querySelectorAll(".favorite-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        const favorited = await toggleFavoriteJob(session.profileId, button.dataset.jobId);
        setFavoriteButtonState(button, favorited);
      } finally {
        button.disabled = false;
      }
    });
  });

  document.getElementById("search-job-btn")?.addEventListener("click", buildJobFilterQuery);
}

function renderUnsupportedRole() {
  renderAppLayout("jobs", "职位广场", "", `
    <section class="panel">
      <div class="empty-state">请使用学生端或校友端访问该页面。</div>
    </section>
  `);
}

async function bootJobsPage() {
  const session = ensureLogin();
  if (session.role === "ALUMNI") {
    const [jobs, alumniProfile] = await Promise.all([
      loadAlumniJobs(),
      loadCurrentAlumniProfile(session)
    ]);
    renderAlumniJobs(jobs, alumniProfile);
    return;
  }

  if (session.role !== "STUDENT") {
    renderUnsupportedRole();
    return;
  }

  const [jobs, applications] = await Promise.all([
    loadStudentJobs(),
    loadApplications()
  ]);
  await fetchFavoriteJobIds(session.profileId);
  renderStudentJobsV3(session, jobs, getFavoriteJobIds(session.profileId), applications);
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    if (typeof globalThis.runPageTask === "function") {
      await globalThis.runPageTask({ pageKey: "jobs", title: "职位广场", subtitle: "" }, bootJobsPage);
      return;
    }
    await bootJobsPage();
  } catch (error) {
    console.error(error);
  }
});
