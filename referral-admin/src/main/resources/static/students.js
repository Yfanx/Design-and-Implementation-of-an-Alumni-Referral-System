async function loadStudentsPage() {
  const result = await apiRequest("/referral/student-info/list");
  return result.data.list || [];
}

function renderStudentTable(students) {
  renderTable("student-table",
    ["ID", "姓名", "专业", "目标岗位", "目标城市", "技能标签", "简历附件"],
    students.map((item) => [
      item.id,
      item.realName,
      item.major,
      item.expectedJob,
      item.expectedCity,
      item.skillTags,
      renderAttachmentLink(item.resumeUrl, "查看简历")
    ])
  );
}

document.addEventListener("DOMContentLoaded", async () => {
  const session = ensureLogin();
  if (session.role !== "ADMIN") {
    location.href = "/dashboard.html";
    return;
  }

  const students = await loadStudentsPage();
  renderAppLayout("students", "学生管理", "查看学生求职档案、意向岗位、技能标签和附件简历。", `
    <section class="panel">
      <div class="cards">
        <div class="card"><div class="card-label">学生总数</div><div class="card-value">${students.length}</div></div>
        <div class="card"><div class="card-label">目标上海</div><div class="card-value">${students.filter((item) => item.expectedCity === "上海").length}</div></div>
        <div class="card"><div class="card-label">目标杭州</div><div class="card-value">${students.filter((item) => item.expectedCity === "杭州").length}</div></div>
      </div>
    </section>
    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>学生档案列表</h2>
          <p>答辩时可以直接点开 PDF 或图片附件，展示完整资料链路。</p>
        </div>
      </div>
      <div class="search-bar compact-search">
        <input id="student-keyword-filter" placeholder="搜索姓名、专业、岗位方向">
        <select id="student-city-filter">
          <option value="">目标城市不限</option>
          <option value="上海">上海</option>
          <option value="杭州">杭州</option>
        </select>
        <button class="btn" id="student-filter-btn">筛选</button>
      </div>
      <div id="student-table" class="table-box"></div>
    </section>
  `);

  const applyFilter = () => {
    const keyword = (document.getElementById("student-keyword-filter").value || "").trim();
    const city = document.getElementById("student-city-filter").value || "";
    const filtered = students.filter((item) => {
      return (!keyword || item.realName.includes(keyword) || (item.major || "").includes(keyword) || (item.expectedJob || "").includes(keyword))
        && (!city || item.expectedCity === city);
    });
    renderStudentTable(filtered);
  };

  document.getElementById("student-filter-btn").addEventListener("click", applyFilter);
  applyFilter();
});
