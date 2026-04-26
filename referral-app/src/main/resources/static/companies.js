function companyJobCount(jobs, companyId) {
  return (jobs || []).filter((job) => Number(job.companyId) === Number(companyId)).length;
}

function companyJobKeywords(jobs, companyId) {
  return (jobs || [])
    .filter((job) => Number(job.companyId) === Number(companyId))
    .slice(0, 3)
    .map((job) => job.jobTitle)
    .join(" / ");
}

document.addEventListener("DOMContentLoaded", async () => {
  const [companyResult, jobResult] = await Promise.all([
    apiRequest("/referral/company-info/list"),
    apiRequest("/referral/job-info/match-list")
  ]);

  const companies = companyResult.data?.list || [];
  const jobs = jobResult.data?.list || [];

  renderAppLayout("companies", "企业总览", "按企业维度查看岗位来源、行业方向和当前开放职位。", `
    <section class="panel reveal">
      <div class="panel-header">
        <div>
          <h2>企业列表</h2>
          <p>每张卡片展示企业信息、岗位数量和可继续浏览的入口。</p>
        </div>
      </div>
      <div id="company-card-list" class="job-card-list"></div>
    </section>
  `);

  const listNode = document.getElementById("company-card-list");
  listNode.innerHTML = companies.map((item) => {
    const count = companyJobCount(jobs, item.id);
    const keywords = companyJobKeywords(jobs, item.id);
    return `
      <div class="job-card">
        <div class="job-card-top">
          <div>
            <h3 class="job-card-title">${item.companyName || "-"}</h3>
            <div class="job-card-company">${item.city || "-"} / ${item.industry || "-"}</div>
          </div>
          <div class="salary">${count} 个岗位</div>
        </div>
        <div class="meta-row">
          <span class="meta-tag">${item.companySize || "规模待补充"}</span>
          <span class="meta-tag">${item.address || "地址待补充"}</span>
        </div>
        <p>${item.companyDesc || "暂无企业简介。"}</p>
        <div class="compact-item top-gap">
          <strong>相关岗位</strong>
          <div class="job-card-company">${keywords || "当前暂无可投递岗位"}</div>
        </div>
        <div class="action-group top-gap">
          <button class="btn company-jobs" data-id="${item.id}" data-name="${item.companyName || ""}">查看岗位</button>
          ${item.officialWebsite ? `<a class="btn ghost-btn" href="${item.officialWebsite}" target="_blank" rel="noreferrer">官网</a>` : ""}
        </div>
      </div>
    `;
  }).join("") || `<div class="compact-item">暂无企业数据。</div>`;

  listNode.querySelectorAll(".company-jobs").forEach((button) => {
    button.addEventListener("click", () => {
      const query = new URLSearchParams({
        keyword: button.dataset.name || ""
      });
      location.href = `/jobs.html?${query.toString()}`;
    });
  });
});
