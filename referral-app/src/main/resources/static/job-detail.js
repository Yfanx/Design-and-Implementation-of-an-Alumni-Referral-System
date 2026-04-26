document.addEventListener("DOMContentLoaded", async () => {
  const session = ensureLogin();
  const id = Number(new URLSearchParams(location.search).get("id"));
  const [jobsResult, alumniResult, companyResult] = await Promise.all([
    apiRequest("/referral/job-info/match-list"),
    apiRequest("/referral/alumni-info/list"),
    apiRequest("/referral/company-info/list")
  ]);

  const jobs = jobsResult.data?.list || [];
  const alumniList = alumniResult.data?.list || [];
  const companyList = companyResult.data?.list || [];
  const job = jobs.find((item) => Number(item.id) === id) || jobs[0];

  if (!job) {
    renderAppLayout("jobs", "岗位详情", "当前岗位不存在或已下线。", `
      <section class="panel">
        <div class="empty-state">没有找到可展示的岗位信息。</div>
      </section>
    `);
    return;
  }

  const alumni = alumniList.find((item) => Number(item.id) === Number(job.alumniId));
  const company = companyList.find((item) => Number(item.id) === Number(job.companyId));
  const similarJobs = jobs.filter((item) => Number(item.id) !== Number(job.id) && item.city === job.city).slice(0, 3);
  await fetchFavoriteJobIds(session.profileId);
  const favorite = isFavoriteJob(session.profileId, job.id);

  renderAppLayout("jobs", "岗位详情", "查看岗位要求、企业信息、校友联系人和投递路径。", `
    <section class="detail-hero">
      <div class="panel reveal">
        <div class="section-eyebrow">岗位档案</div>
        <div class="detail-header top-gap">
          <div>
            <h2>${job.jobTitle}</h2>
            <div class="job-card-company">${job.companyName} / ${job.city}</div>
          </div>
          <div class="salary">${job.salaryRange || "-"}</div>
        </div>
        <div class="meta-row">
          <span class="meta-tag">${job.industry || "-"}</span>
          <span class="meta-tag">${job.educationRequirement || "-"}</span>
          <span class="meta-tag">${job.skillRequirement || "-"}</span>
          <span class="meta-tag">名额 ${job.referralQuota || 1}</span>
        </div>
        <div class="detail-section">
          <h3>岗位描述</h3>
          <p>${job.jobDesc || "暂无岗位描述"}</p>
        </div>
        <div class="detail-actions">
          <button class="btn ${favorite ? "ghost-btn active-favorite" : ""}" id="favorite-job">${favorite ? "已收藏" : "收藏岗位"}</button>
          <button class="btn" id="go-apply">立刻投递</button>
          <button class="btn secondary-btn" id="go-consult">咨询校友</button>
        </div>
      </div>
      <div class="detail-side">
        <div class="panel floating-panel reveal reveal-delay-1">
          <div class="section-eyebrow">投递流程</div>
          <div class="panel-header">
            <div>
              <h2>业务闭环</h2>
            </div>
          </div>
          <div class="stepper">
            <div class="step-item"><div class="step-index">1</div><div class="step-content"><strong>收藏或直投</strong><p>先加入收藏，或者直接提交内推申请。</p></div></div>
            <div class="step-item"><div class="step-index">2</div><div class="step-content"><strong>校友查看申请</strong><p>系统记录状态和处理备注，方便后续跟踪。</p></div></div>
            <div class="step-item"><div class="step-index">3</div><div class="step-content"><strong>咨询和推进</strong><p>围绕具体岗位与校友沟通，形成在线闭环。</p></div></div>
          </div>
        </div>
        <div class="panel reveal reveal-delay-2">
          <div class="section-eyebrow">关键信息</div>
          <div class="compact-list">
            <div class="compact-item"><strong>联系方式</strong><div class="job-card-company">${job.contactType || "站内消息"}</div></div>
            <div class="compact-item"><strong>经验要求</strong><div class="job-card-company">${job.experienceRequirement || "有项目经验优先"}</div></div>
            <div class="compact-item"><strong>截止时间</strong><div class="job-card-company">${formatDateTime(job.expireTime) || "长期有效"}</div></div>
          </div>
        </div>
      </div>
    </section>
    <section class="grid-2 detail-info-grid">
      <div class="panel reveal reveal-delay-1">
        <div class="panel-header">
          <div>
            <h2>对接校友</h2>
            <p>岗位发布人和沟通对象。</p>
          </div>
        </div>
        <div class="detail-info-card">
          <div class="detail-info-head">
            <strong>${alumni?.realName || "未知校友"}</strong>
            <div class="job-card-company">${alumni?.companyName || job.companyName} / ${alumni?.positionName || "岗位发布人"}</div>
          </div>
          <p>${alumni?.intro || "该校友正在通过平台为母校同学提供内推机会。"}</p>
        </div>
      </div>
      <div class="panel reveal reveal-delay-2">
        <div class="panel-header">
          <div>
            <h2>企业信息</h2>
            <p>便于求职者快速了解公司背景。</p>
          </div>
        </div>
        <div class="detail-info-card">
          <div class="detail-info-head">
            <strong>${company?.companyName || job.companyName}</strong>
            <div class="job-card-company">${company?.industry || job.industry} / ${company?.city || job.city}</div>
          </div>
          <p>${company?.companyDesc || "暂无企业介绍"}</p>
        </div>
      </div>
    </section>
    <section class="panel reveal reveal-delay-3">
      <div class="panel-header">
        <div>
          <h2>相似岗位</h2>
          <p>同城市岗位推荐，适合继续浏览。</p>
        </div>
      </div>
      <div class="job-card-list">
        ${similarJobs.map((item) => `
          <div class="job-card">
            <div class="job-card-top">
              <div>
                <h3 class="job-card-title">${item.jobTitle}</h3>
                <div class="job-card-company">${item.companyName} / ${item.city}</div>
              </div>
              <div class="salary">${item.salaryRange || "-"}</div>
            </div>
            <div class="action-group top-gap">
              <button class="btn ghost-btn similar-detail" data-id="${item.id}">查看详情</button>
            </div>
          </div>
        `).join("") || `<div class="compact-item">暂无相似岗位。</div>`}
      </div>
    </section>
  `);

  document.getElementById("favorite-job").addEventListener("click", async (event) => {
    const favorited = await toggleFavoriteJob(session.profileId, job.id);
    setFavoriteButtonState(event.currentTarget, favorited);
  });
  document.getElementById("go-apply").addEventListener("click", () => {
    location.href = `/applications.html?jobId=${job.id}`;
  });
  document.getElementById("go-consult").addEventListener("click", () => {
    location.href = `/consults.html?jobId=${job.id}`;
  });
  document.querySelectorAll(".similar-detail").forEach((button) => {
    button.addEventListener("click", () => {
      location.href = `/job-detail.html?id=${button.dataset.id}`;
    });
  });
});
