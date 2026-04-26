document.addEventListener("DOMContentLoaded", async () => {
  const session = ensureLogin();
  const [jobResult, favoriteResult] = await Promise.all([
    apiRequest("/referral/job-info/match-list"),
    apiRequest(`/referral/job-favorite/list?studentId=${session.profileId}`)
  ]);
  const jobs = jobResult.data.list || [];
  const favoriteIds = (favoriteResult.data.list || []).map((item) => Number(item.jobId));
  favoriteCache[session.profileId] = favoriteIds;

  renderAppLayout("favorites", "岗位收藏", "把感兴趣的岗位先收起来，再统一比较和投递，不打断当前浏览位置。", `
    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>我的收藏</h2>
          <p id="favorite-summary">当前已收藏 0 个岗位。</p>
        </div>
      </div>
      <div id="favorite-job-list" class="job-card-list"></div>
    </section>
  `);

  const listNode = document.getElementById("favorite-job-list");
  const summaryNode = document.getElementById("favorite-summary");

  function updateSummary(count) {
    summaryNode.textContent = `当前已收藏 ${count} 个岗位。`;
  }

  function renderList() {
    const currentFavoriteIds = getFavoriteJobIds(session.profileId);
    const favoriteJobs = jobs.filter((item) => currentFavoriteIds.includes(item.id));
    updateSummary(favoriteJobs.length);
    listNode.innerHTML = favoriteJobs.map((item) => `
      <div class="job-card" data-job-id="${item.id}">
        <div class="job-card-top">
          <div>
            <h3 class="job-card-title">${item.jobTitle}</h3>
            <div class="job-card-company">${item.companyName} / ${item.city}</div>
          </div>
          <div class="salary">${item.salaryRange || "-"}</div>
        </div>
        <div class="meta-row">
          <span class="meta-tag">${item.industry || "-"}</span>
          <span class="meta-tag">${item.educationRequirement || "-"}</span>
        </div>
        <div class="action-group">
          <button class="btn ghost-btn remove-favorite" data-id="${item.id}">取消收藏</button>
          <button class="btn detail-job" data-id="${item.id}">查看详情</button>
          <button class="btn apply-job" data-id="${item.id}">立即投递</button>
        </div>
      </div>
    `).join("") || `<div class="compact-item">还没有收藏岗位，可以先去职位广场看看。</div>`;

    listNode.querySelectorAll(".remove-favorite").forEach((button) => {
      button.addEventListener("click", async () => {
        const favorited = await toggleFavoriteJob(session.profileId, button.dataset.id);
        if (!favorited) {
          button.closest(".job-card")?.remove();
        }
        renderList();
      });
    });
    listNode.querySelectorAll(".detail-job").forEach((button) => {
      button.addEventListener("click", () => {
        location.href = `/job-detail.html?id=${button.dataset.id}`;
      });
    });
    listNode.querySelectorAll(".apply-job").forEach((button) => {
      button.addEventListener("click", () => {
        location.href = `/applications.html?jobId=${button.dataset.id}`;
      });
    });
  }

  renderList();
});
