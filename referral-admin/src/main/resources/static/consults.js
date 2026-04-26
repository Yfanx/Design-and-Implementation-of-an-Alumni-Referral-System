async function loadConsultsForRole() {
  const session = ensureLogin();
  const result = await apiRequest("/referral/consult-message/list");
  let consults = result.data.list || [];

  if (session.role !== "ADMIN") {
    consults = consults.filter(item => item.senderUserId === session.userId || item.receiverUserId === session.userId);
  }
  return consults;
}

document.addEventListener("DOMContentLoaded", async () => {
  const session = ensureLogin();
  const consults = await loadConsultsForRole();
  const headers = ["ID", "岗位 ID", "发送方", "接收方", "内容", "发送时间", "操作"];
  const rows = consults.map(item => [item.id, item.jobId, item.senderUserId, item.receiverUserId, item.content, formatDateTime(item.sendTime),
    `<button class="btn mark-read-btn" data-id="${item.id}" style="font-size:12px">已读</button>
     <button class="btn delete-consult-btn" data-id="${item.id}" style="background:#888;font-size:12px">删除</button>`
  ]);

  function bindConsultActions() {
    document.querySelectorAll(".mark-read-btn").forEach(button => {
      button.addEventListener("click", async () => {
        await apiRequest(`/referral/consult-message/mark-read?id=${button.dataset.id}`, { method: "PUT" });
        location.reload();
      });
    });
    document.querySelectorAll(".delete-consult-btn").forEach(button => {
      button.addEventListener("click", async () => {
        if (!confirm("确认删除该消息？")) return;
        await apiRequest(`/referral/consult-message/delete?id=${button.dataset.id}`, { method: "DELETE" });
        location.reload();
      });
    });
  }

  if (session.role === "ALUMNI") {
    renderAppLayout("consults", "沟通消息", "处理学生围绕岗位提出的咨询，并继续跟进沟通。", `
      <div class="content-grid">
        <section class="panel">
          <div class="panel-header"><div><h2>消息列表</h2><p>显示与当前校友账号相关的全部沟通记录。</p></div></div>
          <div id="alumni-consult-table" class="table-box"></div>
        </section>
        <section class="panel">
          <div class="panel-header"><div><h2>回复学生</h2><p>可直接演示校友端主动回复。</p></div></div>
          <form class="demo-form" id="alumni-consult-form">
            <input name="jobId" value="4001" placeholder="岗位 ID">
            <input name="senderUserId" value="${session.userId}" placeholder="发送方用户 ID">
            <input name="receiverUserId" value="201" placeholder="接收方用户 ID">
            <input name="senderRole" value="1" placeholder="发送方角色">
            <input name="receiverRole" value="2" placeholder="接收方角色">
            <textarea name="content">建议重点突出你的 Java 项目经验、数据库优化经验和上线结果。</textarea>
            <button type="submit">发送回复</button>
          </form>
          <div class="action-result" id="alumni-consult-result">发送后会刷新消息列表。</div>
        </section>
      </div>
    `);

    renderTable("alumni-consult-table", headers, rows);
    bindConsultActions();
    document.getElementById("alumni-consult-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const payload = formPayload(event.target);
      const response = await apiRequest("/referral/consult-message/send", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      document.getElementById("alumni-consult-result").innerText = `回复成功，消息 ID：${response.data}`;
      location.reload();
    });
    return;
  }

  renderAppLayout("consults", "咨询记录", "管理员查看系统中的全部咨询消息。", `
    <section class="panel">
      <div class="panel-header"><div><h2>全部消息</h2><p>用于汇报学生与校友之间的沟通闭环。</p></div></div>
      <div id="admin-consult-table" class="table-box"></div>
    </section>
  `);
  renderTable("admin-consult-table", headers, rows);
  bindConsultActions();
});
