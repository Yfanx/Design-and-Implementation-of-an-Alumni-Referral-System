async function loadJobDetailData(session) {
  const [jobsResult, alumniResult, companyResult, applicationResult] = await Promise.all([
    session.role === "ALUMNI" ? apiRequest("/referral/job-info/list") : apiRequest("/referral/job-info/match-list"),
    apiRequest("/referral/alumni-info/list"),
    apiRequest("/referral/company-info/list"),
    apiRequest("/referral/referral-application/list").catch(() => ({ data: { list: [] } }))
  ]);

  return {
    jobs: jobsResult.data?.list || [],
    alumniList: alumniResult.data?.list || [],
    companyList: companyResult.data?.list || [],
    applications: applicationResult.data?.list || []
  };
}

function buildSimilarJobCards(jobs) {
  return jobs.map((item) => `
    <a class="job-card compact-link-card" href="/job-detail.html?id=${item.id}">
      <div class="job-card-top">
        <div>
          <h3 class="job-card-title">${escapeHtml(item.jobTitle || "-")}</h3>
          <div class="job-card-company">${escapeHtml(item.companyName || "-")} / ${escapeHtml(item.city || "-")}</div>
        </div>
        <div class="salary">${escapeHtml(item.salaryRange || "-")}</div>
      </div>
    </a>
  `).join("") || `<div class="compact-item">暂无相似岗位。</div>`;
}

async function bootJobDetailPage() {
  const session = ensureLogin();
  const id = Number(new URLSearchParams(location.search).get("id"));
  const { jobs, alumniList, companyList, applications } = await loadJobDetailData(session);
  const job = jobs.find((item) => Number(item.id) === id) || jobs[0];

  if (!job) {
    renderAppLayout("jobs", "岗位详情", "", `
      <section class="panel"><div class="empty-state">没有找到岗位信息。</div></section>
    `);
    return;
  }

  const alumni = alumniList.find((item) => Number(item.id) === Number(job.alumniId));
  const company = companyList.find((item) => Number(item.id) === Number(job.companyId));
  const similarJobs = jobs.filter((item) => Number(item.id) !== Number(job.id) && item.city === job.city).slice(0, 3);
  const applied = applications.some((item) =>
    Number(item.studentId) === Number(session.profileId) && Number(item.jobId) === Number(job.id) && Number(item.applyStatus) !== 5
  );

  if (session.role === "STUDENT") {
    await fetchFavoriteJobIds(session.profileId);
  }
  const favorite = session.role === "STUDENT" ? isFavoriteJob(session.profileId, job.id) : false;
  const radarId = `job-radar-${job.id}`;

  renderAppLayout("jobs", "岗位详情", "", `
    <section class="detail-hero">
      <div class="panel reveal">
        <div class="section-eyebrow">岗位档案</div>
        <div class="detail-header top-gap">
          <div>
            <h2>${escapeHtml(job.jobTitle || "-")}</h2>
            <div class="job-card-company">${escapeHtml(job.companyName || "-")} / ${escapeHtml(job.city || "-")}</div>
          </div>
          <div class="salary">${escapeHtml(job.salaryRange || "-")}</div>
        </div>
        <div class="meta-row">
          <span class="meta-tag">${escapeHtml(job.industry || "-")}</span>
          <span class="meta-tag">${escapeHtml(job.educationRequirement || "-")}</span>
          <span class="meta-tag">${escapeHtml(job.skillRequirement || "-")}</span>
          <span class="meta-tag">名额 ${job.referralQuota || 1}</span>
          ${session.role === "STUDENT" ? `<span class="meta-tag">匹配 ${asNumber(job.matchScore)}%</span>` : ""}
        </div>
        <div class="detail-section">
          <h3>岗位描述</h3>
          <p>${escapeHtml(job.jobDesc || "暂无岗位描述。")}</p>
        </div>
        ${session.role === "STUDENT" ? `
          <div class="application-note-block subtle">
            <span>匹配摘要</span>
            <p>${escapeHtml(job.matchSummary || "暂无匹配摘要。")}</p>
          </div>
        ` : ""}
        <div class="detail-actions">
          ${session.role === "STUDENT"
            ? `<button class="btn ${favorite ? "ghost-btn active-favorite" : ""}" id="favorite-job">${favorite ? "已收藏" : "收藏岗位"}</button>`
            : ""}
          <a class="btn" href="/applications.html?jobId=${job.id}">${applied ? "查看申请" : "立即投递"}</a>
          <a class="btn secondary-btn" href="/consults.html?jobId=${job.id}">咨询校友</a>
        </div>
      </div>
      <div class="detail-side">
        ${session.role === "STUDENT" ? `
          <div class="panel floating-panel reveal reveal-delay-1">
            <div class="section-eyebrow">匹配雷达</div>
            <div id="${radarId}" class="chart-surface chart-radar detail-radar"></div>
          </div>
        ` : ""}
        <div class="panel reveal reveal-delay-2">
          <div class="section-eyebrow">联系信息</div>
          <div class="compact-list">
            <div class="compact-item">
              <strong>${escapeHtml(alumni?.realName || "未知校友")}</strong>
              <div class="job-card-company">${escapeHtml(alumni?.companyName || job.companyName || "-")} / ${escapeHtml(alumni?.positionName || "岗位发布人")}</div>
            </div>
            <div class="compact-item">
              <strong>${escapeHtml(company?.companyName || job.companyName || "-")}</strong>
              <p>${escapeHtml(company?.companyDesc || "暂无企业简介。")}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
    <section class="panel reveal reveal-delay-3">
      <div class="panel-header"><div><h2>相似岗位</h2></div></div>
      <div class="job-card-list">${buildSimilarJobCards(similarJobs)}</div>
    </section>
  `);

  if (session.role === "STUDENT") {
    document.getElementById("favorite-job")?.addEventListener("click", async (event) => {
      const button = event.currentTarget;
      button.disabled = true;
      try {
        const favorited = await toggleFavoriteJob(session.profileId, job.id);
        setFavoriteButtonState(button, favorited);
      } finally {
        button.disabled = false;
      }
    });
    renderRadarChart(radarId, job.matchBreakdown || [], "五维匹配");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    if (typeof globalThis.runPageTask === "function") {
      await globalThis.runPageTask({ pageKey: "jobs", title: "岗位详情", subtitle: "" }, bootJobDetailPage);
      return;
    }
    await bootJobDetailPage();
  } catch (error) {
    console.error(error);
  }
});
