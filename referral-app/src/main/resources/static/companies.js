document.addEventListener("DOMContentLoaded", async () => {
  const [companyResult, jobResult] = await Promise.all([
    apiRequest("/referral/company-info/list"),
    apiRequest("/referral/job-info/match-list")
  ]);

  const companies = companyResult.data.list || [];
  const jobs = jobResult.data.list || [];

  renderAppLayout("companies", "企业卡片", "通过企业维度了解岗位来源、行业方向和城市分布。, `
    <section class="panel">
      <div class="panel-header"><div><h2>企业列表</h2><p>每张卡片展示企业信息和可投岗位数量。</p></div></div>
      <div id="company-card-list" class="job-card-list"></div>
    </section>
  `);

  document.getElementById("company-card-list").innerHTML = companies.map(item => {
    const companyJobs = jobs.filter(job => job.companyId === item.id);
    return `
      <div class="job-card">
        <div class="job-card-top">
          <div>
            <h3 class="job-card-title">${item.companyName}</h3>
            <div class="job-card-company">${item.city} / ${item.industry}</div>
          </div>
          <div class="salary">${companyJobs.length} 岗位</div>
        </div>
        <div class="meta-row">
          <span class="meta-tag">${item.companySize || "规模未知"}</span>
          <span class="meta-tag">${item.address || "地址待补"}</span>
        </div>
        <p>${item.companyDesc || "暂无企业简介"}</p>
        <div class="action-group top-gap">
          <button class="btn company-jobs" data-id="${item.id}">查看岗位</button>
        </div>
      </div>
    `;
  }).join("") || `<div class="compact-item">暂无企业数据</div>`;

  document.querySelectorAll(".company-jobs").forEach(button => {
    button.addEventListener("click", () => {
      const company = companies.find(item => item.id === Number(button.dataset.id));
      const query = new URLSearchParams({ keyword: company?.companyName || "" });
      location.href = `/jobs.html?${query.toString()}`;
    });
  });
});
