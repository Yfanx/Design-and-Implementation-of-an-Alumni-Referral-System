async function loadCompanyContext() {
  const [companiesResult, jobsResult] = await Promise.all([
    apiRequest("/referral/company-info/list"),
    apiRequest("/referral/job-info/list")
  ]);
  return {
    companies: companiesResult.data.list || [],
    jobs: jobsResult.data.list || []
  };
}

function companyJobCount(jobs, companyId) {
  return jobs.filter(item => item.companyId === companyId).length;
}

function bindEditCompanyBtn(companies) {
  document.querySelectorAll(".edit-company-btn").forEach(button => {
    button.addEventListener("click", () => {
      const companyId = Number(button.dataset.id);
      const target = companies.find(item => item.id === companyId);
      if (!target) {
        return;
      }
      const panel = document.getElementById("company-edit-panel");
      const form = document.getElementById("company-edit-form");
      panel.hidden = false;
      form.elements.namedItem("id").value = String(target.id || "");
      form.companyName.value = target.companyName || "";
      form.industry.value = target.industry || "";
      form.companySize.value = target.companySize || "";
      form.city.value = target.city || "";
      form.address.value = target.address || "";
      form.officialWebsite.value = target.officialWebsite || "";
      form.companyDesc.value = target.companyDesc || "";
      form.status.value = target.status ?? 1;
      document.getElementById("company-edit-result").innerText = `正在编辑：${target.companyName || "未命名企业"}`;
      panel.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function bindDeleteCompanyBtn() {
  document.querySelectorAll(".delete-company-btn").forEach(button => {
    button.addEventListener("click", async () => {
      if (!confirm(`确认删除企业 ${button.dataset.id}？此操作不可恢复。`)) return;
      await apiRequest(`/referral/company-info/delete?id=${button.dataset.id}`, { method: "DELETE" });
      location.reload();
    });
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const session = ensureLogin();
  const { companies, jobs } = await loadCompanyContext();

  if (session.role === "ADMIN") {
    renderAppLayout("companies", "企业管理", "维护合作企业信息并查看岗位关联情况。", `
      <div class="content-grid">
        <section class="panel">
          <div class="panel-header"><div><h2>企业列表</h2><p>展示企业资源库和岗位关联情况。</p></div></div>
          <div id="company-table" class="table-box"></div>
        </section>
        <section class="panel">
          <div class="panel-header"><div><h2>新增企业</h2><p>快速补充合作企业资料。</p></div></div>
          <div class="field-guide">
            <h3>填写说明</h3>
            <p>企业名称写全称；行业写一级方向；规模用区间；城市填主要办公地；官网需带 http/https；状态填 1 启用、0 停用。</p>
          </div>
          <form class="demo-form" id="company-form">
            <div class="form-item">
              <label for="company-name">企业名称</label>
              <input id="company-name" name="companyName" value="星海数据" placeholder="例如：星海数据（建议使用企业全称）">
              <small>用于岗位展示和数据检索，建议填写营业执照或官网使用的标准名称。</small>
            </div>
            <div class="form-item">
              <label for="company-industry">行业</label>
              <input id="company-industry" name="industry" value="数据服务" placeholder="例如：互联网 / 金融科技 / 智能制造">
              <small>用于岗位筛选与统计，建议填写一级行业方向，避免过细描述。</small>
            </div>
            <div class="form-item">
              <label for="company-size">规模</label>
              <input id="company-size" name="companySize" value="100-500人" placeholder="例如：20-99人、100-500人、1000人以上">
              <small>用于学生判断企业成熟度，建议使用人数区间而非精确人数。</small>
            </div>
            <div class="form-item">
              <label for="company-city">城市</label>
              <input id="company-city" name="city" value="上海" placeholder="例如：上海、杭州、深圳">
              <small>优先填写岗位主要工作城市，便于学生按目标城市筛选岗位。</small>
            </div>
            <div class="form-item">
              <label for="company-address">地址</label>
              <input id="company-address" name="address" value="徐汇区漕河泾" placeholder="例如：徐汇区漕河泾开发区">
              <small>建议填写到区/园区级别，避免过于详细的门牌信息。</small>
            </div>
            <div class="form-item">
              <label for="company-website">官网</label>
              <input id="company-website" name="officialWebsite" value="https://example.com" placeholder="必须包含 http:// 或 https://">
              <small>用于背景核验和学生了解企业，建议填写可公开访问的官方站点。</small>
            </div>
            <div class="form-item">
              <label for="company-desc">企业简介</label>
              <textarea id="company-desc" name="companyDesc" placeholder="建议包含主营业务、招聘方向、团队特点。">面向高校招聘与人才运营的数据平台企业。</textarea>
              <small>建议 30-120 字，突出业务方向和与高校招聘相关的价值。</small>
            </div>
            <div class="form-item">
              <label for="company-status">状态</label>
              <input id="company-status" name="status" value="1" placeholder="1 表示启用，0 表示停用">
              <small>推荐默认填 1（启用），0 表示暂停合作或不对外展示。</small>
            </div>
            <button type="submit">新增企业</button>
          </form>
          <div id="company-result" class="action-result">新增后会自动刷新企业列表。</div>

          <section id="company-edit-panel" class="sub-panel top-gap" hidden>
            <div class="panel-header"><div><h3>编辑企业</h3><p>修改后点击保存即可，避免逐项弹窗输入。</p></div></div>
            <form class="demo-form" id="company-edit-form">
              <input id="edit-company-id" type="hidden" name="id">
              <div class="form-item">
                <label for="edit-company-name">企业名称</label>
                <input id="edit-company-name" name="companyName" placeholder="企业全称">
              </div>
              <div class="form-item">
                <label for="edit-company-industry">行业</label>
                <input id="edit-company-industry" name="industry" placeholder="行业方向">
              </div>
              <div class="form-item">
                <label for="edit-company-size">规模</label>
                <input id="edit-company-size" name="companySize" placeholder="如：100-500人">
              </div>
              <div class="form-item">
                <label for="edit-company-city">城市</label>
                <input id="edit-company-city" name="city" placeholder="如：上海">
              </div>
              <div class="form-item">
                <label for="edit-company-address">地址</label>
                <input id="edit-company-address" name="address" placeholder="区/园区优先">
              </div>
              <div class="form-item">
                <label for="edit-company-website">官网</label>
                <input id="edit-company-website" name="officialWebsite" placeholder="https://">
              </div>
              <div class="form-item">
                <label for="edit-company-desc">企业简介</label>
                <textarea id="edit-company-desc" name="companyDesc" placeholder="简要描述企业业务和招聘方向"></textarea>
              </div>
              <div class="form-item">
                <label for="edit-company-status">状态</label>
                <select id="edit-company-status" name="status">
                  <option value="1">1 - 启用</option>
                  <option value="0">0 - 停用</option>
                </select>
              </div>
              <div class="action-group">
                <button type="submit">保存修改</button>
                <button type="button" class="btn ghost-btn" id="cancel-company-edit-btn">取消编辑</button>
              </div>
            </form>
            <div id="company-edit-result" class="action-result">点击企业列表中的“编辑”按钮后会在此处加载数据。</div>
          </section>
        </section>
      </div>
    `);

    renderTable("company-table",
      ["ID", "企业", "行业", "城市", "规模", "关联岗位", "操作"],
      companies.map(item => [item.id, item.companyName, item.industry, item.city, item.companySize, companyJobCount(jobs, item.id),
        `<button class="btn edit-company-btn" data-id="${item.id}">编辑</button>
         <button class="btn delete-company-btn" data-id="${item.id}" style="background:#888">删除</button>`
      ])
    );

    bindEditCompanyBtn(companies);
    bindDeleteCompanyBtn();

    document.getElementById("company-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const payload = formPayload(event.target);
      const response = await apiRequest("/referral/company-info/create", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      document.getElementById("company-result").innerText = `企业创建成功，记录 ID：${response.data}`;
      location.reload();
    });

    document.getElementById("cancel-company-edit-btn").addEventListener("click", () => {
      document.getElementById("company-edit-panel").hidden = true;
    });

    document.getElementById("company-edit-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const payload = formPayload(event.target);
      await apiRequest("/referral/company-info/update", {
        method: "PUT",
        body: JSON.stringify(payload)
      });
      document.getElementById("company-edit-result").innerText = "企业信息更新成功，正在刷新列表...";
      location.reload();
    });
    return;
  }

  renderAppLayout("companies", "企业信息", "查看可提供内推机会的企业池。", `
    <section class="panel">
      <div class="panel-header"><div><h2>企业列表</h2><p>方便校友快速确认岗位归属企业。</p></div></div>
      <div id="company-card-list" class="table-box"></div>
    </section>
  `);
  renderTable("company-card-list",
    ["企业", "行业", "城市", "岗位数量"],
    companies.map(item => [item.companyName, item.industry, item.city, companyJobCount(jobs, item.id)])
  );
});
