async function loadAlumniPage() {
  const result = await apiRequest("/referral/alumni-info/list");
  return result.data?.list || [];
}

function renderAlumniSummary(alumniList) {
  const verified = alumniList.filter((item) => Number(item.verifyStatus) === 1).length;
  const waiting = alumniList.filter((item) => Number(item.verifyStatus) !== 1).length;
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
    ["姓名", "企业", "岗位", "城市", "审核状态", "操作"],
    alumniList.map((item) => [
      item.realName,
      item.companyName,
      item.positionName,
      item.city,
      Number(item.verifyStatus) === 1 ? "已审核" : "待审核",
      `<button class="btn verify-btn" data-id="${item.id}" data-status="${Number(item.verifyStatus) === 1 ? 0 : 1}">${Number(item.verifyStatus) === 1 ? "撤销" : "通过"}</button>`
    ])
  );
}

function bindVerifyActions(alumniList) {
  document.querySelectorAll(".verify-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const target = alumniList.find((item) => Number(item.id) === Number(button.dataset.id));
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
}

function renderAlumniPage(alumniList) {
  renderAppLayout("alumni", "校友管理", "查看校友档案并快速调整审核状态。", `
    <section class="panel">${renderAlumniSummary(alumniList)}</section>
    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>校友档案列表</h2>
          <p>支持按姓名、企业、岗位筛选，并直接切换审核状态。</p>
        </div>
      </div>
      <div class="search-bar compact-search">
        <input id="alumni-keyword" placeholder="搜索姓名、企业、岗位">
        <select id="alumni-city-filter">
          <option value="">城市不限</option>
          <option value="上海">上海</option>
          <option value="杭州">杭州</option>
          <option value="深圳">深圳</option>
          <option value="北京">北京</option>
        </select>
        <button class="btn" id="alumni-filter-btn">筛选</button>
      </div>
      <div id="alumni-table" class="table-box"></div>
    </section>
  `);

  const applyFilter = () => {
    const keyword = (document.getElementById("alumni-keyword").value || "").trim();
    const city = document.getElementById("alumni-city-filter").value || "";
    const filtered = alumniList.filter((item) => {
      return (!keyword
        || (item.realName || "").includes(keyword)
        || (item.companyName || "").includes(keyword)
        || (item.positionName || "").includes(keyword))
        && (!city || item.city === city);
    });
    renderAlumniTable(filtered);
    bindVerifyActions(alumniList);
  };

  document.getElementById("alumni-filter-btn")?.addEventListener("click", applyFilter);
  applyFilter();
}

async function bootAlumniPage() {
  const session = ensureLogin();
  if (session.role !== "ADMIN") {
    location.href = "/dashboard.html";
    return;
  }
  renderAlumniPage(await loadAlumniPage());
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    if (typeof globalThis.runPageTask === "function") {
      await globalThis.runPageTask({ pageKey: "alumni", title: "校友管理", subtitle: "" }, bootAlumniPage);
      return;
    }
    await bootAlumniPage();
  } catch (error) {
    console.error(error);
  }
});
