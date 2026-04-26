async function loadApplicationsForRole() {
  const session = ensureLogin();
  const query = session.role === "ALUMNI" ? `?alumniId=${session.profileId}` : "";
  const result = await apiRequest(`/referral/referral-application/list${query}`);
  return result.data.list || [];
}

function bindAlumniApplicationActions(onChanged) {
  document.querySelectorAll(".process-btn, .reject-btn, .finish-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const remarkMap = {
        2: "已推荐给用人部门",
        3: "当前岗位暂不匹配",
        4: "流程完成，等待最终反馈"
      };
      await apiRequest("/referral/referral-application/process", {
        method: "POST",
        body: JSON.stringify({
          id: Number(button.dataset.id),
          applyStatus: Number(button.dataset.status),
          processRemark: remarkMap[Number(button.dataset.status)]
        })
      });
      onChanged();
    });
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const session = ensureLogin();
  const applications = await loadApplicationsForRole();

  if (session.role === "ALUMNI") {
    const renderAlumni = () => {
      const waiting = applications.filter((item) => item.applyStatus === 0 || item.applyStatus === 1).length;
      const recommended = applications.filter((item) => item.applyStatus === 2).length;

      renderAppLayout("applications", "学生申请", "查看并处理投递到我的岗位上的内推申请，同时支持直接预览学生附件。", `
        <section class="panel">
          <div class="cards">
            <div class="card"><div class="card-label">收到申请</div><div class="card-value">${applications.length}</div></div>
            <div class="card"><div class="card-label">待处理</div><div class="card-value">${waiting}</div></div>
            <div class="card"><div class="card-label">已推荐</div><div class="card-value">${recommended}</div></div>
          </div>
        </section>
        <section class="panel top-gap">
          <div class="panel-header">
            <div>
              <h2>申请列表</h2>
              <p>可以直接完成推荐、拒绝或标记流程结束，也可以点击查看学生附件。</p>
            </div>
          </div>
          <div class="table-box" id="alumni-application-table"></div>
        </section>
      `);

      renderTable("alumni-application-table",
        ["ID", "学生", "岗位", "附件", "状态", "备注", "操作"],
        applications.map((item) => [
          item.id,
          item.studentName,
          item.jobTitle,
          renderAttachmentLink(item.resumeUrl, "查看附件"),
          statusBadge(item.applyStatus).text,
          item.processRemark || "-",
          `<button class="btn process-btn" data-id="${item.id}" data-status="2">推荐</button>
           <button class="btn finish-btn" data-id="${item.id}" data-status="4">完成</button>
           <button class="btn reject-btn" data-id="${item.id}" data-status="3" style="background:#c83d3d">拒绝</button>`
        ])
      );
      bindAlumniApplicationActions(renderAlumni);
    };

    renderAlumni();
    return;
  }

  renderAppLayout("applications", "申请总览", "管理员查看平台内全部申请流转情况，并可直接检查简历附件是否可访问。", `
    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>全部申请</h2>
          <p>用于汇报岗位投递闭环和处理进度。</p>
        </div>
      </div>
      <div id="admin-application-table" class="table-box"></div>
    </section>
  `);

  renderTable("admin-application-table",
    ["ID", "岗位", "学生", "校友", "附件", "状态", "备注", "申请时间"],
    applications.map((item) => [
      item.id,
      item.jobTitle,
      item.studentName,
      item.alumniName,
      renderAttachmentLink(item.resumeUrl, "查看附件"),
      statusBadge(item.applyStatus).text,
      item.processRemark || "-",
      formatDateTime(item.applyTime)
    ])
  );
});
