async function loadAuditBundle() {
  const [jobsResult, alumniResult, applicationResult] = await Promise.all([
    apiRequest("/referral/job-info/list"),
    apiRequest("/referral/alumni-info/list"),
    apiRequest("/referral/referral-application/list")
  ]);
  return {
    jobs: jobsResult.data.list || [],
    alumni: alumniResult.data.list || [],
    applications: applicationResult.data.list || []
  };
}

function bindAuditActions(bundle) {
  document.querySelectorAll(".audit-pass-btn").forEach(button => {
    button.addEventListener("click", async () => {
      await apiRequest(`/referral/job-info/audit?id=${button.dataset.id}&auditStatus=1`, { method: "POST" });
      location.reload();
    });
  });

  document.querySelectorAll(".audit-reject-btn").forEach(button => {
    button.addEventListener("click", async () => {
      await apiRequest(`/referral/job-info/audit?id=${button.dataset.id}&auditStatus=2`, { method: "POST" });
      location.reload();
    });
  });

  document.querySelectorAll(".verify-alumni-btn").forEach(button => {
    button.addEventListener("click", async () => {
      const target = bundle.alumni.find(item => item.id === Number(button.dataset.id));
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
          verifyStatus: 1
        })
      });
      location.reload();
    });
  });

  document.querySelectorAll(".push-application-btn").forEach(button => {
    button.addEventListener("click", async () => {
      await apiRequest("/referral/referral-application/push", {
        method: "POST",
        body: JSON.stringify({
          id: Number(button.dataset.id),
          processRemark: "管理员已督促校友推进处理"
        })
      });
      location.reload();
    });
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const bundle = await loadAuditBundle();
  const pendingJobs = bundle.jobs.filter(item => item.auditStatus === 0);
  const pendingAlumni = bundle.alumni.filter(item => item.verifyStatus !== 1);
  const pendingApplications = bundle.applications.filter(item => item.applyStatus === 0 || item.applyStatus === 1);

  renderAppLayout("auditCenter", "审核工作台", "把待审核岗位、待核验校友和待跟进申请集中到一个页面处理。", `
    <section class="panel reveal">
      <div class="cards">
        <div class="card"><div class="card-label">待审岗位</div><div class="card-value">${pendingJobs.length}</div></div>
        <div class="card"><div class="card-label">待核验校友</div><div class="card-value">${pendingAlumni.length}</div></div>
        <div class="card"><div class="card-label">待跟进申请</div><div class="card-value">${pendingApplications.length}</div></div>
      </div>
    </section>
    <section class="grid-2 reveal reveal-delay-1">
      <div class="panel">
        <div class="panel-header"><div><h2>待审岗位</h2><p>可以直接执行通过或驳回，减少页面切换。</p></div></div>
        <div class="compact-list">
          ${pendingJobs.map(item => `
            <div class="compact-item">
              <div class="split-header">
                <div><strong>${item.jobTitle}</strong><div class="job-card-company">${item.companyName} / ${item.city}</div></div>
                <span class="status-badge warn">待审核</span>
              </div>
              <div class="meta-row">
                <span class="meta-tag">${item.industry || "-"}</span>
                <span class="meta-tag">${item.educationRequirement || "-"}</span>
              </div>
              <div class="action-group top-gap">
                <button class="btn audit-pass-btn" data-id="${item.id}">通过</button>
                <button class="btn audit-reject-btn" data-id="${item.id}" style="background:#c83d3d">驳回</button>
              </div>
            </div>
          `).join("") || `<div class="compact-item">当前没有待审岗位。</div>`}
        </div>
      </div>
      <div class="panel">
        <div class="panel-header"><div><h2>待核验校友</h2><p>快速确认校友身份和企业背景。</p></div></div>
        <div class="compact-list">
          ${pendingAlumni.map(item => `
            <div class="compact-item">
              <div class="split-header">
                <div><strong>${item.realName}</strong><div class="job-card-company">${item.companyName || "-"} / ${item.positionName || "-"}</div></div>
                <span class="status-badge warn">待核验</span>
              </div>
              <div class="meta-row">
                <span class="meta-tag">${item.city || "-"}</span>
                <span class="meta-tag">${item.industry || "-"}</span>
              </div>
              <div class="action-group top-gap">
                <button class="btn verify-alumni-btn" data-id="${item.id}">确认通过</button>
              </div>
            </div>
          `).join("") || `<div class="compact-item">当前没有待核验校友。</div>`}
        </div>
      </div>
    </section>
    <section class="panel reveal reveal-delay-2">
      <div class="panel-header"><div><h2>待跟进申请</h2><p>对长期未处理的申请进行集中推进。</p></div></div>
      <div class="table-box" id="audit-application-table"></div>
    </section>
  `);

  renderTable("audit-application-table",
    ["ID", "岗位", "学生", "校友", "状态", "备注", "操作"],
    pendingApplications.map(item => [
      item.id,
      item.jobTitle,
      item.studentName,
      item.alumniName,
      statusBadge(item.applyStatus).text,
      item.processRemark || "-",
      `<button class="btn push-application-btn" data-id="${item.id}">推进处理</button>`
    ])
  );

  bindAuditActions(bundle);
});
