async function loadJobDetailContext() {
  const [jobsResult, alumniResult, companyResult] = await Promise.all([
    apiRequest("/referral/job-info/list"),
    apiRequest("/referral/alumni-info/list"),
    apiRequest("/referral/company-info/list")
  ]);
  return {
    jobs: jobsResult.data.list || [],
    alumni: alumniResult.data.list || [],
    companies: companyResult.data.list || []
  };
}

function renderStudentJobDetail(job, alumni, company, relatedJobs) {
  const session = ensureLogin();
  const favorite = isFavoriteJob(session.userId, job.id);
  renderAppLayout("jobs", "岗位详情", "查看岗位要求、对接校友和相似岗位。", `
    <section class="detail-hero">
      <div class="detail-main panel">
        <div class="detail-header">
          <div>
            <div class="pill">校友内推岗位</div>
            <h2>${job.jobTitle}</h2>
            <div class="job-card-company">${job.companyName} · ${job.city}</div>
          </div>
          <div class="salary">${job.salaryRange || "-"}</div>
        </div>
        <div class="meta-row">
          <span class="meta-tag">${job.industry || "-"}</span>
          <span class="meta-tag">${job.educationRequirement || "-"}</span>
          <span class="meta-tag">${job.experienceRequirement || "-"}</span>
          <span class="meta-tag">${job.skillRequirement || "-"}</span>
        </div>
        <div class="detail-section">
          <h3>岗位描述</h3>
          <p>${job.jobDesc || "暂无岗位描述"}</p>
        </div>
        <div class="detail-actions">
          <button class="btn ghost-btn ${favorite ? "active-favorite" : ""}" id="detail-favorite-btn">${favorite ? "已收藏" : "收藏职位"}</button>
          <button class="btn" id="detail-apply-btn">立即投递</button>
          <button class="btn secondary-btn" id="detail-consult-btn">咨询校友</button>
          <button class="btn ghost-btn" id="detail-back-btn">返回职位广场</button>
        </div>
      </div>
      <div class="detail-side">
        <section class="panel">
          <div class="panel-header"><div><h2>对接校友</h2><p>可直接咨询岗位情况和投递建议。</p></div></div>
          <div class="compact-item">
            <strong>${alumni?.realName || "校友账号"}</strong>
            <div class="job-card-company">${alumni?.positionName || "内推人"} · ${alumni?.companyName || job.companyName}</div>
            <div class="meta-row">
              <span class="meta-tag">${alumni?.city || job.city}</span>
              <span class="meta-tag">${alumni?.industry || job.industry}</span>
            </div>
          </div>
        </section>
        <section class="panel">
          <div class="panel-header"><div><h2>企业信息</h2><p>帮助学生快速判断岗位背景。</p></div></div>
          <div class="compact-item">
            <strong>${company?.companyName || job.companyName}</strong>
            <div class="job-card-company">${company?.industry || job.industry}</div>
            <p>${company?.companyDesc || "暂无企业介绍，可在正式版中扩展公司主页、企业标签和评价信息。"}</p>
          </div>
        </section>
      </div>
    </section>
    <section class="panel">
      <div class="panel-header"><div><h2>相似岗位</h2><p>按行业和城市推荐相近岗位。</p></div></div>
      <div class="job-card-list">
        ${relatedJobs.map(item => `
          <div class="job-card compact-job-card">
            <div class="split-header">
              <div>
                <strong>${item.jobTitle}</strong>
                <div class="job-card-company">${item.companyName} · ${item.city}</div>
              </div>
              <div class="salary">${item.salaryRange || "-"}</div>
            </div>
            <div class="meta-row">
              <span class="meta-tag">${item.industry || "-"}</span>
              <span class="meta-tag">${item.educationRequirement || "-"}</span>
            </div>
            <div class="detail-actions inline-actions">
              <button class="btn ghost-btn related-detail-btn" data-id="${item.id}">查看详情</button>
              <button class="btn ghost-btn related-favorite-btn ${isFavoriteJob(session.userId, item.id) ? "active-favorite" : ""}" data-id="${item.id}">${isFavoriteJob(session.userId, item.id) ? "已收藏" : "收藏"}</button>
              <button class="btn related-apply-btn" data-id="${item.id}">立即投递</button>
            </div>
          </div>
        `).join("") || `<div class="compact-item">暂无相似岗位。</div>`}
      </div>
    </section>
  `);

  document.getElementById("detail-favorite-btn").addEventListener("click", () => {
    toggleFavoriteJob(session.userId, job.id);
    location.reload();
  });
  document.getElementById("detail-apply-btn").addEventListener("click", () => {
    location.href = `/applications.html?jobId=${job.id}`;
  });
  document.getElementById("detail-consult-btn").addEventListener("click", () => {
    location.href = `/consults.html?jobId=${job.id}`;
  });
  document.getElementById("detail-back-btn").addEventListener("click", () => {
    location.href = "/jobs.html";
  });

  document.querySelectorAll(".related-detail-btn").forEach(button => {
    button.addEventListener("click", () => {
      location.href = `/job-detail.html?id=${button.dataset.id}`;
    });
  });
  document.querySelectorAll(".related-favorite-btn").forEach(button => {
    button.addEventListener("click", () => {
      toggleFavoriteJob(session.userId, button.dataset.id);
      location.reload();
    });
  });
  document.querySelectorAll(".related-apply-btn").forEach(button => {
    button.addEventListener("click", () => {
      location.href = `/applications.html?jobId=${button.dataset.id}`;
    });
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const session = ensureLogin();
  if (session.role !== "STUDENT") {
    location.href = "/jobs.html";
    return;
  }

  const params = new URLSearchParams(location.search);
  const jobId = Number(params.get("id"));
  const context = await loadJobDetailContext();
  const job = context.jobs.find(item => item.id === jobId) || context.jobs[0];

  if (!job) {
    renderAppLayout("jobs", "岗位详情", "当前没有可展示的岗位。", `
      <section class="panel">
        <div class="compact-item">暂无岗位数据，请先返回职位广场。</div>
      </section>
    `);
    return;
  }

  const alumni = context.alumni.find(item => item.id === job.alumniId);
  const company = context.companies.find(item => item.id === job.companyId);
  const relatedJobs = context.jobs.filter(item => item.id !== job.id && (item.industry === job.industry || item.city === job.city)).slice(0, 3);

  renderStudentJobDetail(job, alumni, company, relatedJobs);
});
