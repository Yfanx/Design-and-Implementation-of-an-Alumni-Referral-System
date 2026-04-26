async function loadFavoriteJobs(session) {
  const result = await apiRequest("/referral/job-info/list");
  const jobs = result.data.list || [];
  const favorites = getFavoriteJobIds(session.userId);
  return jobs.filter(item => favorites.includes(item.id));
}

document.addEventListener("DOMContentLoaded", async () => {
  const session = ensureLogin();
  if (session.role !== "STUDENT") {
    location.href = "/dashboard.html";
    return;
  }

  const jobs = await loadFavoriteJobs(session);
  renderAppLayout("favorites", "职位收藏", "保存感兴趣的岗位，方便后续统一投递。", `
    <section class="panel">
      <div class="panel-header"><div><h2>收藏列表</h2><p>这里展示你从职位广场或岗位详情中收藏的岗位。</p></div></div>
      <div id="favorite-job-list" class="job-card-list"></div>
    </section>
  `);

  document.getElementById("favorite-job-list").innerHTML = jobs.map(item => `
    <div class="job-card">
      <div class="job-card-top">
        <div>
          <h3 class="job-card-title">${item.jobTitle}</h3>
          <div class="job-card-company">${item.companyName} · ${item.city}</div>
        </div>
        <div class="salary">${item.salaryRange || "-"}</div>
      </div>
      <div class="meta-row">
        <span class="meta-tag">${item.industry || "-"}</span>
        <span class="meta-tag">${item.educationRequirement || "-"}</span>
      </div>
      <div class="detail-actions inline-actions">
        <button class="btn ghost-btn favorite-detail-btn" data-id="${item.id}">查看详情</button>
        <button class="btn favorite-apply-btn" data-id="${item.id}">立即投递</button>
        <button class="btn secondary-btn favorite-remove-btn" data-id="${item.id}">取消收藏</button>
      </div>
    </div>
  `).join("") || `<div class="compact-item">还没有收藏岗位，去职位广场挑几个感兴趣的吧。</div>`;

  document.querySelectorAll(".favorite-detail-btn").forEach(button => {
    button.addEventListener("click", () => {
      location.href = `/job-detail.html?id=${button.dataset.id}`;
    });
  });
  document.querySelectorAll(".favorite-apply-btn").forEach(button => {
    button.addEventListener("click", () => {
      location.href = `/applications.html?jobId=${button.dataset.id}`;
    });
  });
  document.querySelectorAll(".favorite-remove-btn").forEach(button => {
    button.addEventListener("click", () => {
      toggleFavoriteJob(session.userId, button.dataset.id);
      location.reload();
    });
  });
});
