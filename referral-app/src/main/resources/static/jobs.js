function getQueryParams() {
  return new URLSearchParams(location.search);
}

function calculateMatchScore(job) {
  let score = 68;
  if ((job.skillRequirement || "").includes("Java")) score += 10;
  if ((job.skillRequirement || "").includes("Spring")) score += 7;
  if (["上海", "杭州", "北京", "深圳"].includes(job.city)) score += 5;
  if (job.educationRequirement === "本科") score += 4;
  return Math.min(score, 97);
}

async function loadStudentJobs() {
  const result = await apiRequest("/referral/job-info/match-list");
  return result.data.list || [];
}

async function loadAlumniJobs() {
  const result = await apiRequest("/referral/job-info/list");
  return result.data.list || [];
}

function openJobEditor({ title, subtitle, initial = {}, onSubmit }) {
  const safe = {
    id: initial.id || "",
    companyId: initial.companyId || "3001",
    jobTitle: initial.jobTitle || "",
    jobType: initial.jobType || "校招",
    industry: initial.industry || "互联网",
    city: initial.city || "上海",
    salaryRange: initial.salaryRange || "",
    educationRequirement: initial.educationRequirement || "本科",
    experienceRequirement: initial.experienceRequirement || "",
    skillRequirement: initial.skillRequirement || "",
    jobDesc: initial.jobDesc || "",
    contactType: initial.contactType || "站内沟通",
    referralQuota: initial.referralQuota || 3,
    expireTime: initial.expireTime || ""
  };

  openPageModal({
    title,
    subtitle,
    size: "wide",
    body: `
      <form class="demo-form" id="job-editor-form">
        <input type="hidden" name="id" value="${safe.id}">
        <div class="form-grid">
          <label class="form-field">
            <span>企业 ID</span>
            <input name="companyId" value="${safe.companyId}" placeholder="例如：3001">
          </label>
          <label class="form-field">
            <span>岗位名称</span>
            <input name="jobTitle" value="${safe.jobTitle}" placeholder="例如：Java 后端开发工程师">
          </label>
          <label class="form-field">
            <span>岗位类型</span>
            <select name="jobType">
              <option value="校招" ${safe.jobType === "校招" ? "selected" : ""}>校招</option>
              <option value="实习" ${safe.jobType === "实习" ? "selected" : ""}>实习</option>
              <option value="社招" ${safe.jobType === "社招" ? "selected" : ""}>社招</option>
            </select>
          </label>
          <label class="form-field">
            <span>行业</span>
            <select name="industry">
              <option value="互联网" ${safe.industry === "互联网" ? "selected" : ""}>互联网</option>
              <option value="人工智能" ${safe.industry === "人工智能" ? "selected" : ""}>人工智能</option>
              <option value="金融科技" ${safe.industry === "金融科技" ? "selected" : ""}>金融科技</option>
              <option value="制造业" ${safe.industry === "制造业" ? "selected" : ""}>制造业</option>
            </select>
          </label>
          <label class="form-field">
            <span>工作城市</span>
            <select name="city">
              <option value="上海" ${safe.city === "上海" ? "selected" : ""}>上海</option>
              <option value="杭州" ${safe.city === "杭州" ? "selected" : ""}>杭州</option>
              <option value="北京" ${safe.city === "北京" ? "selected" : ""}>北京</option>
              <option value="深圳" ${safe.city === "深圳" ? "selected" : ""}>深圳</option>
            </select>
          </label>
          <label class="form-field">
            <span>薪资范围</span>
            <input name="salaryRange" value="${safe.salaryRange}" placeholder="例如：15k-25k / 200-300 元/天">
          </label>
          <label class="form-field">
            <span>学历要求</span>
            <select name="educationRequirement">
              <option value="本科" ${safe.educationRequirement === "本科" ? "selected" : ""}>本科</option>
              <option value="硕士" ${safe.educationRequirement === "硕士" ? "selected" : ""}>硕士</option>
              <option value="博士" ${safe.educationRequirement === "博士" ? "selected" : ""}>博士</option>
            </select>
          </label>
          <label class="form-field">
            <span>经验要求</span>
            <input name="experienceRequirement" value="${safe.experienceRequirement}" placeholder="例如：有项目经验 / 1-3 年">
          </label>
          <label class="form-field">
            <span>联系方式</span>
            <select name="contactType">
              <option value="站内沟通" ${safe.contactType === "站内沟通" ? "selected" : ""}>站内沟通</option>
              <option value="邮箱" ${safe.contactType === "邮箱" ? "selected" : ""}>邮箱</option>
              <option value="微信" ${safe.contactType === "微信" ? "selected" : ""}>微信</option>
            </select>
          </label>
          <label class="form-field">
            <span>内推名额</span>
            <input name="referralQuota" value="${safe.referralQuota}" placeholder="例如：3">
          </label>
          <label class="form-field field-span-2">
            <span>技能要求</span>
            <input name="skillRequirement" value="${safe.skillRequirement}" placeholder="例如：Java / Spring Boot / MySQL / Redis">
          </label>
          <label class="form-field field-span-2">
            <span>岗位说明</span>
            <textarea name="jobDesc" placeholder="说明岗位职责、项目背景、工作节奏与亮点。">${safe.jobDesc}</textarea>
          </label>
        </div>
        <div class="page-action-bar top-gap">
          <div class="page-action-note">提交后会进入待审核状态；如果是编辑已审核岗位，也会重新进入审核队列。</div>
          <div class="action-group">
            <button type="button" class="btn ghost-btn" id="job-editor-cancel">取消</button>
            <button type="submit" class="btn" id="job-editor-submit">保存岗位</button>
          </div>
        </div>
      </form>
      <div id="job-editor-result" class="action-result">请确认岗位信息完整后再提交。</div>
    `,
    onReady(body) {
      body.querySelector("#job-editor-cancel").addEventListener("click", closePageModal);
      body.querySelector("#job-editor-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const payload = formPayload(event.target);
        const result = body.querySelector("#job-editor-result");
        result.innerText = "正在保存岗位...";
        try {
          await onSubmit(payload);
          result.innerText = "岗位保存成功。";
          setTimeout(() => closePageModal(), 500);
        } catch (error) {
          result.innerText = error.message || "保存失败，请稍后重试。";
        }
      });
    }
  });
}

function renderStudentJobs(session, jobs, favoriteIds) {
  const query = getQueryParams();
  const keyword = query.get("keyword") || "";
  const city = query.get("city") || "";
  const industry = query.get("industry") || "";
  const filteredJobs = jobs
    .filter((item) => !keyword || item.jobTitle.includes(keyword) || item.companyName.includes(keyword) || (item.skillRequirement || "").includes(keyword))
    .filter((item) => !city || item.city === city)
    .filter((item) => !industry || item.industry === industry);

  renderAppLayout("jobs", "职位广场", "按照行业、城市和关键词筛选校友内推岗位。", `
    <section class="panel reveal">
      <div class="section-eyebrow">Job Market</div>
      <div class="panel-header"><div><h2>岗位筛选</h2><p>更像招聘产品的职位广场布局，支持边筛选边查看。</p></div></div>
      <div class="search-bar">
        <input id="job-keyword" value="${keyword}" placeholder="搜索岗位名称、公司或技能关键词">
        <select id="job-city">
          <option value="">城市不限</option><option value="上海" ${city === "上海" ? "selected" : ""}>上海</option><option value="杭州" ${city === "杭州" ? "selected" : ""}>杭州</option><option value="北京" ${city === "北京" ? "selected" : ""}>北京</option><option value="深圳" ${city === "深圳" ? "selected" : ""}>深圳</option>
        </select>
        <select id="job-industry">
          <option value="">行业不限</option><option value="互联网" ${industry === "互联网" ? "selected" : ""}>互联网</option><option value="人工智能" ${industry === "人工智能" ? "selected" : ""}>人工智能</option><option value="金融科技" ${industry === "金融科技" ? "selected" : ""}>金融科技</option>
        </select>
        <button class="btn" id="search-job-btn">筛选职位</button>
      </div>
      <div class="student-summary-strip top-gap">
        <div class="summary-chip">支持收藏岗位后统一投递</div>
        <div class="summary-chip">岗位详情页可查看企业与校友信息</div>
        <div class="summary-chip">支持多条件检索</div>
      </div>
      <div id="job-market-summary" class="market-marquee">
        <div class="mini-stat"><span>筛选结果</span><strong>${filteredJobs.length}</strong></div>
        <div class="mini-stat"><span>城市命中</span><strong>${city || "全部"}</strong></div>
        <div class="mini-stat"><span>行业命中</span><strong>${industry || "全部"}</strong></div>
        <div class="mini-stat"><span>已收藏</span><strong>${favoriteIds.length}</strong></div>
      </div>
    </section>
    <section class="panel reveal reveal-delay-1"><div id="student-job-list" class="job-card-list"></div></section>
  `);

  const listNode = document.getElementById("student-job-list");
  listNode.innerHTML = filteredJobs.map((item) => {
    const match = calculateMatchScore(item);
    const favorited = favoriteIds.includes(item.id);
    return `
      <div class="job-card reveal" data-job-id="${item.id}">
        <div class="job-card-top">
          <div>
            <h3 class="job-card-title">${item.jobTitle}</h3>
            <div class="job-card-company">${item.companyName} / ${item.city}</div>
          </div>
          <div class="salary">${item.salaryRange || "-"}</div>
        </div>
        <div class="meta-row">
          <span class="meta-tag">${item.industry || "-"}</span>
          <span class="meta-tag">${item.educationRequirement || "-"}</span>
          <span class="meta-tag">${item.skillRequirement || "-"}</span>
          <span class="meta-tag">匹配度 ${match}%</span>
        </div>
        <div class="job-card-actions">
          <span>${item.jobDesc || ""}</span>
          <div class="action-group">
            <button class="btn ghost-btn favorite-btn ${favorited ? "active-favorite" : ""}" data-job-id="${item.id}">${favorited ? "已收藏" : "收藏岗位"}</button>
            <button class="btn detail-btn" data-job-id="${item.id}">查看详情</button>
            <button class="btn apply-btn" data-job-id="${item.id}">立即投递</button>
          </div>
        </div>
      </div>
    `;
  }).join("") || `<div class="job-card">没有符合条件的岗位，换个筛选条件试试。</div>`;

  document.querySelectorAll(".favorite-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const favorited = await toggleFavoriteJob(session.profileId, button.dataset.jobId);
      setFavoriteButtonState(button, favorited, "已收藏", "收藏岗位");
    });
  });
  document.querySelectorAll(".detail-btn").forEach((button) => {
    button.addEventListener("click", () => {
      location.href = `/job-detail.html?id=${button.dataset.jobId}`;
    });
  });
  document.querySelectorAll(".apply-btn").forEach((button) => {
    button.addEventListener("click", () => {
      location.href = `/applications.html?jobId=${button.dataset.jobId}`;
    });
  });
  document.getElementById("search-job-btn").addEventListener("click", () => {
    const params = new URLSearchParams({
      keyword: document.getElementById("job-keyword").value || "",
      city: document.getElementById("job-city").value || "",
      industry: document.getElementById("job-industry").value || ""
    });
    location.href = `/jobs.html?${params.toString()}`;
  });
}

function renderAlumniJobs(jobs) {
  renderAppLayout("jobs", "我的岗位", "发布岗位并查看每个岗位的审核状态和投递情况。", `
    <section class="panel">
      <div class="page-action-bar">
        <div class="page-action-note">岗位发布与编辑统一走弹窗；校友提交后会进入管理员审核队列。</div>
        <div class="action-group">
          <button class="btn" id="create-job-btn">发布新岗位</button>
        </div>
      </div>
      <div class="compact-list" id="alumni-job-list"></div>
    </section>
  `);

  const listNode = document.getElementById("alumni-job-list");
  listNode.innerHTML = jobs.map((item) => {
    const badge = jobAuditBadge(item.auditStatus);
    return `
      <div class="compact-item">
        <div class="split-header">
          <div>
            <strong>${item.jobTitle}</strong>
            <div class="job-card-company">${item.companyName || "-"} / ${item.city || "-"}</div>
          </div>
          <span class="status-badge ${badge.cls}">${badge.text}</span>
        </div>
        <div class="meta-row">
          <span class="meta-tag">${item.salaryRange || "-"}</span>
          <span class="meta-tag">${item.industry || "-"}</span>
          <span class="meta-tag">${item.educationRequirement || "-"}</span>
          <span class="meta-tag">名额 ${item.referralQuota || 0}</span>
        </div>
        <p>${item.jobDesc || "暂无岗位说明"}</p>
        <div class="action-group top-gap">
          <button class="btn ghost-btn edit-job-btn" data-id="${item.id}">编辑岗位</button>
          <button class="btn ghost-btn delete-job-btn" data-id="${item.id}">删除岗位</button>
        </div>
      </div>
    `;
  }).join("") || `<div class="compact-item">当前还没有发布岗位，点击右上角按钮添加第一条岗位。</div>`;

  document.getElementById("create-job-btn").addEventListener("click", () => {
    openJobEditor({
      title: "发布岗位",
      subtitle: "岗位资料会直接进入待审核状态，用于保障发布内容真实可靠。",
      onSubmit: async (payload) => {
        await apiRequest("/referral/job-info/create", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        location.reload();
      }
    });
  });

  document.querySelectorAll(".edit-job-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const current = jobs.find((item) => Number(item.id) === Number(button.dataset.id));
      if (!current) {
        return;
      }
      openJobEditor({
        title: "编辑岗位",
        subtitle: "编辑后会重新进入待审核状态，避免历史审核状态与岗位内容不一致。",
        initial: current,
        onSubmit: async (payload) => {
          await apiRequest("/referral/job-info/update", {
            method: "PUT",
            body: JSON.stringify(payload)
          });
          location.reload();
        }
      });
    });
  });

  document.querySelectorAll(".delete-job-btn").forEach((button) => {
    button.addEventListener("click", () => {
      openPageModal({
        title: "确认删除岗位",
        subtitle: "删除后将无法恢复，请确认当前岗位不再用于演示或后续处理。",
        body: `
          <div class="compact-item">
            <strong>删除确认</strong>
            <p>仅允许删除自己发布的岗位。删除后，该岗位下的演示链路也会受到影响。</p>
          </div>
          <div class="page-action-bar top-gap">
            <div class="page-action-note">建议仅删除误建岗位；用于答辩展示的岗位请保留。</div>
            <div class="action-group">
              <button type="button" class="btn ghost-btn" id="cancel-delete-job">取消</button>
              <button type="button" class="btn danger-btn" id="confirm-delete-job">确认删除</button>
            </div>
          </div>
        `,
        onReady(body) {
          body.querySelector("#cancel-delete-job").addEventListener("click", closePageModal);
          body.querySelector("#confirm-delete-job").addEventListener("click", async () => {
            await apiRequest(`/referral/job-info/delete?id=${button.dataset.id}`, { method: "DELETE" });
            closePageModal();
            location.reload();
          });
        }
      });
    });
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const session = ensureLogin();
  if (session.role === "ALUMNI") {
    renderAlumniJobs(await loadAlumniJobs());
    return;
  }
  await fetchFavoriteJobIds(session.profileId);
  renderStudentJobs(session, await loadStudentJobs(), getFavoriteJobIds(session.profileId));
});
