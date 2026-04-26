async function loadJobsForRole() {
  const session = ensureLogin();
  const query = session.role === "ALUMNI" ? `?alumniId=${session.profileId}` : "";
  const result = await apiRequest(`/referral/job-info/list${query}`);
  return result.data.list || [];
}

function bindAdminAudit() {
  document.querySelectorAll(".audit-pass").forEach(button => {
    button.addEventListener("click", async () => {
      await apiRequest(`/referral/job-info/audit?id=${button.dataset.id}&auditStatus=1`, { method: "POST" });
      location.reload();
    });
  });
  document.querySelectorAll(".audit-reject").forEach(button => {
    button.addEventListener("click", async () => {
      await apiRequest(`/referral/job-info/audit?id=${button.dataset.id}&auditStatus=2`, { method: "POST" });
      location.reload();
    });
  });
}

function bindEditJobBtn() {
  document.querySelectorAll(".edit-job-btn").forEach(button => {
    button.addEventListener("click", async () => {
      const id = Number(button.dataset.id);
      const currentTitle = button.dataset.title || "";
      const currentSalary = button.dataset.salary || "";

      const overlay = document.createElement("div");
      overlay.className = "inline-edit-modal";
      overlay.innerHTML = `
        <div class="modal-card">
          <h3>编辑岗位</h3>
          <div class="field-group">
            <label>岗位名称</label>
            <input id="edit-title" value="${currentTitle}" placeholder="岗位名称">
          </div>
          <div class="field-group">
            <label>薪资范围</label>
            <input id="edit-salary" value="${currentSalary}" placeholder="如 15k-22k">
          </div>
          <div class="modal-actions">
            <button class="btn" id="edit-cancel">取消</button>
            <button class="btn primary" id="edit-save">保存</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);

      const closeModal = () => {
        document.body.removeChild(overlay);
      };

      overlay.querySelector("#edit-cancel").addEventListener("click", closeModal);
      overlay.querySelector("#edit-save").addEventListener("click", async () => {
        const newTitle = overlay.querySelector("#edit-title").value.trim();
        const newSalary = overlay.querySelector("#edit-salary").value.trim();
        if (!newTitle) return;
        await apiRequest("/referral/job-info/update", {
          method: "PUT",
          body: JSON.stringify({ id, jobTitle: newTitle, salaryRange: newSalary })
        });
        closeModal();
        location.reload();
      });
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) closeModal();
      });
    });
  });
}

function bindDeleteJobBtn() {
  document.querySelectorAll(".delete-job-btn").forEach(button => {
    button.addEventListener("click", async () => {
      const id = button.dataset.id;
      const overlay = document.createElement("div");
      overlay.className = "inline-edit-modal";
      overlay.innerHTML = `
        <div class="modal-card">
          <h3>确认删除</h3>
          <p style="margin:0 0 20px;color:var(--muted)">确定要删除岗位 ${id} 吗？此操作不可恢复。</p>
          <div class="modal-actions">
            <button class="btn" id="del-cancel">取消</button>
            <button class="btn danger" id="del-confirm">确认删除</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);

      const closeModal = () => {
        document.body.removeChild(overlay);
      };

      overlay.querySelector("#del-cancel").addEventListener("click", closeModal);
      overlay.querySelector("#del-confirm").addEventListener("click", async () => {
        closeModal();
        await apiRequest(`/referral/job-info/delete?id=${id}`, { method: "DELETE" });
        location.reload();
      });
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) closeModal();
      });
    });
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const session = ensureLogin();
  const jobs = await loadJobsForRole();

  if (session.role === "ALUMNI") {
    renderAppLayout("jobs", "我的岗位", "发布岗位并查看每个岗位的审核状态和投递情况。", `
      <div class="content-grid">
        <section class="panel">
          <div class="panel-header"><div><h2>岗位列表</h2><p>这里仅展示当前校友账号发布的岗位。</p></div></div>
          <div class="compact-list">
            ${jobs.map(item => `
              <div class="compact-item">
                <div class="split-header">
                  <div><strong>${item.jobTitle}</strong><div class="job-card-company">${item.companyName || "-"} / ${item.city || "-"}</div></div>
                  <span class="status-badge ${jobAuditBadge(item.auditStatus).cls}">${jobAuditBadge(item.auditStatus).text}</span>
                </div>
                <div class="meta-row">
                  <span class="meta-tag">${item.salaryRange || "-"}</span>
                  <span class="meta-tag">${item.industry || "-"}</span>
                  <span class="meta-tag">${item.educationRequirement || "-"}</span>
                  <button class="btn edit-job-btn" data-id="${item.id}" data-title="${item.jobTitle}" data-salary="${item.salaryRange || ""}" style="margin-left:8px;font-size:12px">编辑</button>
                </div>
              </div>
            `).join("") || `<div class="compact-item">当前还没有发布岗位。</div>`}
          </div>
        </section>
        <section class="panel">
          <div class="panel-header"><div><h2>发布新岗位</h2><p>提交后会进入待审核状态，适合演示校友发岗流程。</p></div></div>
          <form class="demo-form" id="job-form">
            <input name="alumniId" value="${session.profileId}" placeholder="校友档案 ID">
            <input name="companyId" value="3001" placeholder="企业 ID">
            <input name="jobTitle" value="后端开发工程师" placeholder="岗位名称">
            <input name="jobType" value="校招" placeholder="岗位类型">
            <input name="industry" value="互联网" placeholder="所属行业">
            <input name="city" value="上海" placeholder="工作城市">
            <input name="salaryRange" value="15k-22k" placeholder="薪资范围">
            <input name="educationRequirement" value="本科" placeholder="学历要求">
            <input name="experienceRequirement" value="有项目经验" placeholder="经验要求">
            <input name="skillRequirement" value="Java, Spring Boot, MySQL" placeholder="技能要求">
            <input name="contactType" value="站内沟通" placeholder="联系形式">
            <input name="referralQuota" value="3" placeholder="内推名额">
            <textarea name="jobDesc">参与招聘平台服务端开发、接口联调和业务流程实现。</textarea>
            <button type="submit">发布岗位</button>
          </form>
          <div id="job-result" class="action-result">发布成功后会自动刷新当前岗位列表。</div>
        </section>
      </div>
    `);

    document.getElementById("job-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const payload = formPayload(event.target);
      const response = await apiRequest("/referral/job-info/create", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      document.getElementById("job-result").innerText = `岗位发布成功，记录 ID：${response.data}`;
      location.reload();
    });
    bindEditJobBtn();
    return;
  }

  renderAppLayout("jobs", "岗位管理", "管理员查看全部岗位并执行审核操作。", `
    <section class="panel">
      <div class="panel-header"><div><h2>全部岗位</h2><p>对待审核岗位执行通过或驳回操作。</p></div></div>
      <div id="admin-job-table" class="table-box"></div>
    </section>
  `);

  renderTable("admin-job-table",
    ["ID", "岗位名称", "企业", "城市", "行业", "审核状态", "操作"],
    jobs.map(item => {
      const badge = jobAuditBadge(item.auditStatus);
      return [
        item.id,
        item.jobTitle,
        item.companyName,
        item.city,
        item.industry,
        `<span class="status-badge ${badge.cls}">${badge.text}</span>`,
        `<button class="btn audit-pass" data-id="${item.id}">通过</button>
         <button class="btn audit-reject" data-id="${item.id}" style="background:#c83d3d">驳回</button>
         <button class="btn edit-job-btn" data-id="${item.id}" data-title="${item.jobTitle}" data-salary="${item.salaryRange || ""}">编辑</button>
         <button class="btn delete-job-btn" data-id="${item.id}" style="background:#888">删除</button>`
      ];
    })
  );
  bindAdminAudit();
  bindEditJobBtn();
  bindDeleteJobBtn();
});
