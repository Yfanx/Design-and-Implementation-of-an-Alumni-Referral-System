async function loadAlumniPage() {
  const result = await apiRequest("/referral/alumni-info/list");
  return result.data.list || [];
}

function renderAlumniSummary(alumniList) {
  const verified = alumniList.filter(item => item.verifyStatus === 1).length;
  const waiting = alumniList.filter(item => item.verifyStatus !== 1).length;
  return `
    <div class="cards">
      <div class="card"><div class="card-label">校友总数</div><div class="card-value">${alumniList.length}</div></div>
      <div class="card"><div class="card-label">已审核</div><div class="card-value">${verified}</div></div>
      <div class="card"><div class="card-label">待确认</div><div class="card-value">${waiting}</div></div>
    </div>
  `;
}

function renderAlumniTable(alumniList) {
  renderTable("alumni-table",
    ["ID", "姓名", "企业", "岗位", "城市", "审核状态", "动作"],
    alumniList.map(item => [
      item.id,
      item.realName,
      item.companyName,
      item.positionName,
      item.city,
      item.verifyStatus === 1 ? "已审核" : "待审核",
      `<button class="btn verify-btn" data-id="${item.id}" data-status="${item.verifyStatus === 1 ? 0 : 1}">${item.verifyStatus === 1 ? "撤销" : "通过"}</button>`
    ])
  );
}

document.addEventListener("DOMContentLoaded", async () => {
  const session = ensureLogin();
  if (session.role !== "ADMIN") {
    location.href = "/dashboard.html";
    return;
  }

  const alumniList = await loadAlumniPage();
  renderAppLayout("alumni", "校友管理", "查看校友档案并快速调整审核状态。", `
    <section class="panel">${renderAlumniSummary(alumniList)}</section>
    <section class="panel">
      <div class="panel-header"><div><h2>校友档案列表</h2><p>支持汇报时展示校友资源库和审核能力。</p></div></div>
      <div class="search-bar compact-search">
        <input id="alumni-keyword" placeholder="搜索姓名、企业、岗位">
        <select id="alumni-city-filter">
          <option value="">城市不限</option>
          <option value="上海">上海</option>
          <option value="杭州">杭州</option>
        </select>
        <button class="btn" id="alumni-filter-btn">筛选</button>
      </div>
      <div id="alumni-table" class="table-box"></div>
    </section>
  `);

  const bindVerify = currentList => {
    document.querySelectorAll(".verify-btn").forEach(button => {
      button.addEventListener("click", async () => {
        const target = alumniList.find(item => item.id === Number(button.dataset.id));
        if (!target) {
          return;
        }
        await apiRequest("/referral/alumni-info/update", {
          method: "PUT",
          body: JSON.stringify({
            id: target.id,
            userId: target.userId,
            realName: target.realName,
            gender: target.gender,
            graduationYear: target.graduationYear,
            college: target.college,
            major: target.major,
            companyId: target.companyId,
            companyName: target.companyName,
            industry: target.industry,
            positionName: target.positionName,
            city: target.city,
            referralPermission: target.referralPermission,
            intro: target.intro,
            verifyStatus: Number(button.dataset.status)
          })
        });
        location.reload();
      });
    });
  };

  const applyFilter = () => {
    const keyword = (document.getElementById("alumni-keyword").value || "").trim();
    const city = document.getElementById("alumni-city-filter").value || "";
    const filtered = alumniList.filter(item => {
      return (!keyword || item.realName.includes(keyword) || (item.companyName || "").includes(keyword) || (item.positionName || "").includes(keyword))
        && (!city || item.city === city);
    });
    renderAlumniTable(filtered);
    bindVerify(filtered);
  };

  document.getElementById("alumni-filter-btn").addEventListener("click", applyFilter);
  applyFilter();
});
