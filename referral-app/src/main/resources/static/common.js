const STORAGE_KEY = "referral_app_user";
const SIDEBAR_STATE_KEY = "referral_app_sidebar_collapsed";
let toastTimer = null;
let favoriteCache = {};
let attachmentPreviewBlobUrl = "";
let attachmentPreviewRequestSeq = 0;

function showToast(message, duration = 4000) {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }
  const toast = document.createElement("div");
  toast.className = "toast toast-error";
  toast.textContent = message;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("is-visible"));
  if (toastTimer) {
    clearTimeout(toastTimer);
  }
  toastTimer = setTimeout(() => {
    toast.classList.remove("is-visible");
    toast.addEventListener("transitionend", () => toast.remove(), { once: true });
  }, duration);
}

function getSession() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

function saveSession(session) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

function logout() {
  localStorage.removeItem(STORAGE_KEY);
  location.href = "/login.html";
}

function ensureLogin() {
  const session = getSession();
  if (!session) {
    location.href = "/login.html";
    throw new Error("Not logged in");
  }
  return session;
}

function buildAuthHeaders() {
  const session = getSession();
  if (!session) {
    return {};
  }
  return {
    "X-Referral-Token": session.token || "",
    "X-Referral-Role": session.role || "",
    "X-Referral-User-Id": String(session.userId || ""),
    "X-Referral-Profile-Id": String(session.profileId || "")
  };
}

async function parseResponseBody(response) {
  const text = await response.text();
  if (!text) {
    return {};
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    return { code: response.ok ? 0 : response.status, message: text };
  }
}

function resolveMessage(result, fallback) {
  return result.msg || result.message || fallback;
}

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...buildAuthHeaders(),
      ...(options.headers || {})
    }
  });
  const result = await parseResponseBody(response);
  const resultCode = Number(result.code ?? (response.ok ? 0 : response.status));

  if (response.status === 401 || response.status === 403 || resultCode === 401 || resultCode === 403) {
    const message = resolveMessage(result, "闂傚倷娴囬惃顐﹀幢閳轰焦顔勭紓鍌氬€哥粔瀵哥矓閹绢噮鏁婇煫鍥ㄧ⊕閸ゆ垿鏌涢幘鑼跺厡闁伙絾妞藉娲传閸曨厼鈪遍梺闈╃秶婵″洤危閹邦兘鏀介柛顐ゅ枎閻濅即姊虹紒妯虹伇婵☆偄瀚埢宥夊閵堝棛鍘搁梺绋挎湰缁嬫垿藟鐎ｎ偆绠鹃柛娑卞亜閸斻儵鏌曢崶銊ュ鐎殿喗娼欒灒鐎瑰嫰顣︽竟?);
    showToast(message);
    setTimeout(() => logout(), 1200);
    throw new Error(message);
  }

  if (!response.ok || resultCode !== 0) {
    const message = resolveMessage(result, "闂備浇宕垫慨鏉懨洪銏犵哗闂侇剙绉甸崕鎴︽煟濡も偓閻楀棛娆㈤悙鍝勭骇闁割偒鍋勬禍顖滄偖濠靛鈷戦柟绋挎捣閳藉鏌ｉ婵堢獢妞ゃ垺宀搁、妤呭磼濠婂懐鍘柣搴＄畭閸庨亶骞婅箛娑樼９闁汇垹鎲￠埛鎴︽煙缂佹ê绗ч崯鎼佹⒑娴兼瑥鐦滈柛銊ㄥ煐娣?);
    showToast(message);
    throw new Error(message);
  }

  return result;
}

function getRoleConfig(role) {
  const configs = {
    STUDENT: {
      title: "Referral App",
      subtitle: "婵犲痉鏉库偓鏇㈠磹绾懏鎳岄梻浣虹帛椤ㄥ懘鏌婇敐鍜佸殨濞寸姴顑呴悘鎶芥煕閹邦厼绲婚柛銈嗗灴濮婃椽宕ㄦ繝鍌氼潓闂佺懓鍟跨换鎺楀极椤曗偓瀹曠兘顢樺☉妯瑰濠电偞鍨甸崯鍧椼€呴鍕厸濞达綀顫夌亸鐢电磼?,
      menus: [
        { key: "dashboard", label: "婵犵妲呴崑鎾跺緤妤ｅ啯鍋嬮柣妯款嚙杩?, shortLabel: "婵犵妲呴崑鎾跺緤妤ｅ啯鍋嬮柣妯款嚙杩?, desc: "闂傚倷娴囬～澶嬬娴犲绀夐煫鍥ㄦ尵閺嗭附淇婇婵囶仩闁哄棗妫欐穱濠囨倷閹绘巻鎸冪紓浣割槹濞兼瑩鍩ユ径鎰闁告劕妯婇崝澶娾攽閻愬瓨灏柣鏍帶椤曪綁顢楅崟顐ら獓闂佸壊鐓堥崯鈺佄旈崨顔惧幍?, href: "/dashboard.html" },
        { key: "jobs", label: "闂佽楠搁崢婊堝磻閹剧繝绻嗛柣鎰絻閳锋梻绱?, shortLabel: "闂佽楠搁崢婊堝磻閹剧繝绻嗛柣鎰絻閳锋梻绱?, desc: "闂傚倷鑳堕幊鎾诲触鐎ｎ剙鍨濋幖娣妼绾惧ジ鏌曟繛鐐珔婵＄偟鏅埀顒€鍘滈崑鎾绘煃瑜滈崜鐔煎箖濞差亶鏁冮柨鏃傛櫕閸斿灚绻濋姀锝嗙【闁挎洏鍊濆顐﹀醇閺囩喓鍘甸梺璇″幗鐢帗鎱ㄩ埀顒佺箾鐎涙鐭婇柣掳鍔戦獮?, href: "/jobs.html" },
        { key: "favorites", label: "闂傚倷娴囬妴鈧柛瀣崌閺岀喖顢涘鍐炬毉濡?, shortLabel: "闂傚倷娴囬妴鈧柛瀣崌閺岀喖顢涘鍐炬毉濡?, desc: "婵犵數鍎戠徊钘壝洪敂鐐床闁稿瞼鍋為崑銈夋煏婵炲灝鍔撮柛銈嗩殜閺屾稑鈽夐崡鐐寸亪濡炪値鍋勯惌鍌氼潖濞差亶鏁冮柨婵嗘噽閻熴劑姊哄ú璇插箺闁绘顨婇獮?, href: "/favorites.html" },
        { key: "companies", label: "婵犵數鍋為幐鍐参涢崹顕呮富闁圭儤姊荤粻?, shortLabel: "婵犵數鍋為幐鍐参涢崹顕呮富闁圭儤姊荤粻?, desc: "闂傚倷绀侀幖顐ゆ偖椤愶箑纾块柛鎰嚋閼板潡鏌涘☉鍗炴灈妞ゆ洖宕湁闁挎繂顦藉Λ鎴︽煟閻旂儤鍤€閼挎劙鏌涢妷顖滃埌濠⒀勫絻闇夐柣鎾冲閸ゅ洨鈧娲︽禍鐐寸閿曞倹鍋╃€光偓閳ь剟鏁嶅☉銏♀拺閻炴稈鈧厖澹曢梻浣侯攰椤宕濋幒妤€绠茬€广儱鎮?, href: "/companies.html" },
        { key: "applications", label: "闂傚倷鐒﹂惇褰掑垂瑜版帗鍋柛銉墻閺?, shortLabel: "闂傚倷鐒﹂惇褰掑垂瑜版帗鍋柛銉墻閺?, desc: "闂備浇宕垫慨鎯р枍閿濆绐楅柡鍥ュ灪閻撳倹绻濇繝鍌滃缂佲偓閸愵喗鐓曟繛鎴濆船閺嬫盯鏌ら棃娑氱Ш闁哄矉缍佹慨鈧柣妯虹仛閻庮喖顪冮妶鍡樺闁告挻鑹鹃…鍥╂嫚濞村顫嶅┑鈽嗗灟鐠€锕傚船?, href: "/applications.html" },
        { key: "consults", label: "濠电姷鏁搁崑鐐哄垂閻㈠憡鍋嬪┑鐘插暙椤?, shortLabel: "濠电姷鏁搁崑鐐哄垂閻㈠憡鍋嬪┑鐘插暙椤?, desc: "闂傚倷鐒﹂幃鍫曞磿闁稁鏁嬫い鎾跺Т閸ㄦ繃銇勯幇鈺佺伄闁哄棗妫欐穱濠囨倷閹绘巻鎸冪紓浣割槸椤曨厾妲愰幘瀛樺闁割偅绻冮崳浠嬫煛娴ｅ搫浜剧紒缁樼☉閻ｆ繈鍩€椤掑嫬绐楅柡宥庡幖閻?, href: "/consults.html" },
        { key: "profile", label: "闂備浇宕垫慨宥夊礃椤垳鐥梻?, shortLabel: "闂備浇宕垫慨宥夊礃椤垳鐥梻?, desc: "缂傚倸鍊搁崐椋庣矆娓氣偓閹椽濡搁敂钘夊伎闂侀潧楠忕槐鏇㈠煝閺冣偓閵囧嫯绠涢幘铏闂佹椿浜ｆ慨銈嗙┍婵犲伣鏃傗偓锝庡墰钃辨俊鐐€戦崹鍦矓閻熸壆鏆︽い蹇撳閺嗗棝鏌嶈閸撶喖骞冮幆褉鏀介悗锝庝簻閸?, href: "/profile.html" }
      ]
    },
    ALUMNI: {
      title: "Referral App",
      subtitle: "婵犲痉鏉库偓鏇㈠磹绾懏鎳岄梻浣虹帛椤ㄥ懘鏌婇敐鍜佸殨濞寸姴顑呴悘鎶芥煕閹邦厼绲婚柛銈嗗灴濮婃椽宕ㄦ繝鍌氼潓闂佺懓鍟跨换鎺楀极椤旇￥浜归柟鐑樺灥閸炪劑姊洪悙钘夊姎闁哥喎娼″畷娆撴偐閻㈢數锛?,
      menus: [
        { key: "dashboard", label: "闂佽姘﹂～澶愬箖閸洖纾块柟娈垮枤缁€濠囨煛閸愩劎澧曢柣?, shortLabel: "闂佽姘﹂～澶愬箖閸洖纾块柟娈垮枤缁€濠囨煛閸愩劎澧曢柣?, desc: "闂傚倷绀侀幖顐ゆ偖椤愶箑纾块柛鎰嚋閼板潡鏌涘☉鍗炲箻闁哄棗妫欐穱濠囨倷閹绘巻鎸冪紓浣割槹閹告娊寮婚弴銏犲耿闁哄洠鈧啿甯梻浣芥〃閼冲爼寮幖浣哥闁绘绮幉銉╂煕鐏炲墽鐭岄柟鎻掔仢閳规垿鎮欓懠顒備紘闂佸摜濮甸悧鐘诲春閳ь剚銇勯幒宥嗩樂濞存嚎鍨荤槐鎺旂磼濡洘鍨块獮?, href: "/dashboard.html" },
        { key: "companies", label: "婵犵數鍋為幐鍐参涢崹顕呮富闁圭儤姊荤粻?, shortLabel: "婵犵數鍋為幐鍐参涢崹顕呮富闁圭儤姊荤粻?, desc: "闂傚倷绀侀幖顐ゆ偖椤愶箑纾块柛鎰嚋閼板潡鏌涘☉娆愮稇閻熸瑱绠撻弻娑㈩敃閿濆洨鐓傜紓浣割儏閿曘倝婀侀梻鍌氬€搁悺銊┧囨搴ｇ＜婵°倕鍟弸娑氣偓瑙勬处娴滅偞绂掗敃鍌涘癄濠㈣泛锕︾粙鎴︽⒒娴ｈ棄顥嶅瀛樻倐瀵濡搁埡鍌氬壒闂佸搫绉查崝宥嗗垔?, href: "/companies.html" },
        { key: "jobs", label: "闂傚倷鑳堕幊鎾绘偤閵娾晛鍨傞柣鐔稿閺嬫棃鏌熺€涙绠橀柡鍡楁娣囧﹪鎮欓幓鎺嗘寖缂?, shortLabel: "闂佽楠搁崢婊堝磻閹剧繝绻嗛柣鎰絻閳锋梻绱?, desc: "闂傚倷绀侀幉锟犳偡閿曞倸鍨傞柣銏㈡暩閸楁岸鏌ｉ幋鐘虫珪鐎规挷绶氶弻娑㈠箻閼碱剙濡藉┑鈽嗗灠閿曨亪寮婚悢鑲╁彆闁圭粯宸婚崑鎾斥槈閵忕姴鎯炲┑鐘诧工閸犳岸宕崨鏉戠骇闁割偅纰嶅▍鍡涙煟閿濆牅鍚柍褜鍓欓崢婊堝磻閹剧繝绻嗛柣鎰絻閳锋梻绱?, href: "/jobs.html" },
        { key: "applications", label: "闂備浇顕х€涒晠宕樼紒妯圭箚闁搞儺鍓欓弸渚€鏌熼崜褏甯涢柛瀣ㄥ姂閹宕烽鐑嗏偓宀勬煕?, shortLabel: "闂傚倷鐒﹂惇褰掑垂瑜版帗鍋柛銉墻閺?, desc: "婵犵數濮伴崹鐓庘枖濞戞埃鍋撳鐓庢珝妤犵偛鍟换婵嬪炊瑜忛鍛存⒑閸濆嫭绀岄柟鍐叉喘瀹曟垿骞樼拠鑼唺闂佺懓鐡ㄧ换鍕储閹烘鈷戦柣鐔稿閹界娀鏌涢妸褎鏆柟顖氱焸瀵粙濡搁敃鈧鎾绘倵楠炲灝鍔氭繛璇х畵閹箖鏌嗗鍡欏幗闂侀潧绻掓慨鐑藉几閸愨斂浜?, href: "/applications.html" },
        { key: "consults", label: "濠电姷鏁搁崑鐐哄垂閻㈠憡鍋嬪┑鐘插暙椤?, shortLabel: "濠电姷鏁搁崑鐐哄垂閻㈠憡鍋嬪┑鐘插暙椤?, desc: "闂傚倷鐒﹂幃鍫曞磿閹惰棄纾绘繛鎴旀嚍閸ヮ剚鍤戞い鎴ｆ娴滅偓绻涢幋婵嗘毐妞も晩鍓熼弻鈩冩媴鐟欏嫬纾抽悗瑙勬处娴滎亝淇婇幖浣测偓锕傚箣濠靛洨鏆犲┑掳鍊楁慨鐑藉磻閻樿鏄ラ柡宥庡亐閸嬫捇宕归锝傛嫽缂備浇椴哥敮锟犮€佸鈧弫宥夊礋绾版ê浜鹃柍褜鍓熼弻?, href: "/consults.html" },
        { key: "profile", label: "闂備浇宕垫慨宥夊礃椤垳鐥梻?, shortLabel: "闂備浇宕垫慨宥夊礃椤垳鐥梻?, desc: "缂傚倸鍊搁崐椋庣矆娓氣偓閹椽濡搁敂钘夊伎闂侀潧绻堥崐鏇㈠礃閳ь剟姊洪悙钘夊姎闁哥喎娼″畷娆撴偐閸忓懐绠氬┑掳鍊曢鍥╃矙缂佹ǜ浜滈柕蹇曞Х鏍＄紓浣割儏椤︿即骞嗛弮鍫濐潊闁挎稑瀚ⅲ闂?, href: "/profile.html" }
      ]
    }
  };
  return configs[role] || configs.STUDENT;
}

function roleText(role) {
  return {
    STUDENT: "闂備浇顕х€涒晠宕樼紒妯圭箚闁搞儺鍓欓弸?,
    ALUMNI: "闂傚倷绀侀幖顐ょ矓椤曗偓閸┾偓妞ゆ巻鍋撻柛鐔锋健瀹?
  }[role] || role;
}

function ensurePageAccess(pageKey, session) {
  if (!session.menus || !session.menus.includes(pageKey)) {
    location.href = session.landingPage || "/dashboard.html";
    throw new Error(`Access denied for page ${pageKey}`);
  }
}

function getSidebarCollapsed() {
  return false;
}

function saveSidebarCollapsed(collapsed) {
  localStorage.removeItem(SIDEBAR_STATE_KEY);
}

function applySidebarCollapsedState() {
  const shell = document.querySelector(".app-shell");
  if (!shell) {
    return;
  }
  shell.classList.remove("sidebar-collapsed");
}

window.__toggleSidebar = function __toggleSidebar() {
  applySidebarCollapsedState();
};

function bindSidebarToggle() {
  return;
}

function renderAppLayout(pageKey, title, subtitle, mainContent) {
  const session = ensureLogin();
  ensurePageAccess(pageKey, session);
  const roleConfig = getRoleConfig(session.role);
  const menus = roleConfig.menus.filter((item) => session.menus.includes(item.key));

  document.title = `${title} - 婵犲痉鏉库偓鏇㈠磹绾懏鎳岄梻浣虹帛椤ㄥ懘鏌婇敐鍜佸殨濞寸姴顑呴悘鎶芥煕閹邦厼绲婚柛銈嗗灴濮婃椽宕ㄦ繝鍌氼潓闂佺懓鍟跨换鎺楀极椤旇￥浜归柟鐑樻煥缁侊箓姊洪崨濠傚鐟滄澘鍟撮弻濠囨儎?
  document.getElementById("app").innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="sidebar-inner">
          <div class="sidebar-top">
            <div class="brand-wrap">
              <div class="brand">${roleConfig.title}</div>
              <div class="brand-subtitle">${roleConfig.subtitle}</div>
            </div>
          </div>
          <div class="user-card">
            <div class="name">${session.displayName}</div>
            <div class="meta">${roleText(session.role)} / ${session.username}</div>
          </div>
          <nav class="menu">
            ${menus.map((item) => `
              <a class="${item.key === pageKey ? "active" : ""}" href="${item.href}" title="${item.label}">
                <span class="menu-short">${item.shortLabel}</span>
                <span class="menu-copy">
                  <span class="menu-label">${item.label}</span>
                  <small>${item.desc}</small>
                </span>
              </a>
            `).join("")}
          </nav>
          <button class="btn logout-btn" type="button" onclick="logout()">退出登录</button>
        </div>
      </aside>
      <main class="content">
        <div class="page-title">
          <h1>${title}</h1>
          <p>${subtitle}</p>
        </div>
        ${mainContent}
      </main>
    </div>
  `;
  bindSidebarToggle();
  applySidebarCollapsedState();
}

function closePageModal() {
  const modal = document.getElementById("page-modal-root");
  if (!modal) {
    return;
  }
  modal.remove();
  document.body.classList.remove("page-modal-open");
}

function openPageModal({ title, subtitle = "", body = "", size = "default", onReady }) {
  closePageModal();
  const root = document.createElement("div");
  root.id = "page-modal-root";
  root.className = "page-modal-root";
  root.innerHTML = `
    <div class="page-modal-mask" data-close="1"></div>
    <div class="page-modal-card ${size === "wide" ? "page-modal-wide" : ""}" role="dialog" aria-modal="true" aria-label="${title}">
      <div class="page-modal-header">
        <div>
          <h2>${title}</h2>
          ${subtitle ? `<p>${subtitle}</p>` : ""}
        </div>
        <button type="button" class="page-modal-close" data-close="1">闂傚倷鑳堕…鍫㈡崲閹寸偟绠惧┑鐘蹭迹?/button>
      </div>
      <div class="page-modal-body">${body}</div>
    </div>
  `;
  root.addEventListener("click", (event) => {
    if (event.target?.dataset?.close === "1") {
      closePageModal();
    }
  });
  document.body.appendChild(root);
  document.body.classList.add("page-modal-open");
  if (typeof onReady === "function") {
    onReady(root.querySelector(".page-modal-body"), root);
  }
  return {
    root,
    close: closePageModal
  };
}

function renderMetricList(targetId, items, keyName = "name", valueName = "value") {
  const target = document.getElementById(targetId);
  target.innerHTML = items.map((item) => `
    <div class="metric-item">
      <span>${item[keyName]}</span>
      <strong>${item[valueName]}</strong>
    </div>
  `).join("");
}

function renderTable(targetId, headers, rows) {
  const target = document.getElementById(targetId);
  const head = headers.map((item) => `<th>${item}</th>`).join("");
  const body = rows.map((row) => `<tr>${row.map((cell) => `<td>${cell ?? "-"}</td>`).join("")}</tr>`).join("");
  target.innerHTML = `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function formPayload(form) {
  const payload = Object.fromEntries(new FormData(form).entries());
  Object.keys(payload).forEach((key) => {
    if (payload[key] === "") {
      payload[key] = null;
    } else if (/^-?\d+$/.test(payload[key])) {
      payload[key] = Number(payload[key]);
    }
  });
  return payload;
}

function statusBadge(status) {
  const mapping = {
    0: { text: "闂佽楠搁悘姘熆濮椻偓楠炲﹥鎯旈妸瀣喘閸╋繝宕ㄩ闂村摋?, cls: "warn" },
    1: { text: "闂佽楠稿﹢閬嶁€﹂崼婵愬殨闁割偅娲橀崑鍌炴煥閻斿搫校闁?, cls: "success" },
    2: { text: "闂佽娴烽幊鎾诲箟闄囬妵鎰板礃椤旇壈鍩為梺鍦檸閸犳牜绮?, cls: "success" },
    3: { text: "闂佽楠稿﹢閬嶁€﹂崼婵愬殨闁告挷璁查崑鎾愁潩椤掍緡妫ょ紓?, cls: "danger" },
    4: { text: "闂佽娴烽幊鎾诲箟闄囬妵鎰板礃椤旇棄浠煎銈嗗笒鐎氼剛绮?, cls: "success" },
    5: { text: "闂佽娴烽幊鎾诲箟闄囬妵鎰板礃椤撴粈姹楅梺鎼炲劀閳ь剙危?, cls: "danger" }
  };
  return mapping[status] || { text: `闂傚倷鑳剁划顖炩€﹂崼銉ユ槬闁哄稁鍘奸悞?${status}`, cls: "" };
}

function jobAuditBadge(status) {
  const mapping = {
    0: { text: "闂佽楠搁悘姘熆濮椻偓楠炲﹥鎯旈…鎴炴櫍闂佸綊妫跨粈渚€宕橀埀?, cls: "warn" },
    1: { text: "闂佽娴烽幊鎾诲箟閿熺姵鍋傞柨鐔哄Т閻掑灚銇勯幒宥嗩樂濞存嚎鍨荤槐?, cls: "success" },
    2: { text: "闂佽娴烽幊鎾诲箟閿熺姵鍋傞柨鐔哄Т閻撴﹢鐓崶銊р槈闁?, cls: "danger" }
  };
  return mapping[status] || { text: `闂傚倷鑳剁划顖炩€﹂崼銉ユ槬闁哄稁鍘奸悞?${status}`, cls: "" };
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }
  return String(value).replace("T", " ").slice(0, 16);
}

async function fetchFavoriteJobIds(studentId) {
  const result = await apiRequest(`/referral/job-favorite/list?studentId=${studentId}`);
  const ids = (result.data?.list || []).map((item) => Number(item.jobId));
  favoriteCache[studentId] = ids;
  return ids;
}

function getFavoriteJobIds(studentId) {
  return favoriteCache[studentId] || [];
}

function isFavoriteJob(studentId, jobId) {
  return getFavoriteJobIds(studentId).includes(Number(jobId));
}

function setFavoriteButtonState(button, favorited, activeText = "闂佽楠稿﹢閬嶁€﹂崼婵愬殨闁割偅娲栭弸浣烘喐閻楀牆绗氶悗?, inactiveText = "闂傚倷娴囬妴鈧柛瀣崌閺岀喖顢涘鍐炬毉濡?) {
  if (!button) {
    return;
  }
  button.classList.toggle("active-favorite", favorited);
  button.dataset.favorited = favorited ? "1" : "0";
  button.textContent = favorited ? activeText : inactiveText;
}

function updateFavoriteCache(studentId, jobId, favorited) {
  const normalizedId = Number(jobId);
  const current = new Set(getFavoriteJobIds(studentId));
  if (favorited) {
    current.add(normalizedId);
  } else {
    current.delete(normalizedId);
  }
  favoriteCache[studentId] = Array.from(current);
  return favoriteCache[studentId];
}

async function toggleFavoriteJob(studentId, jobId) {
  const result = await apiRequest("/referral/job-favorite/toggle", {
    method: "POST",
    body: JSON.stringify({
      studentId,
      jobId: Number(jobId)
    })
  });
  const favorited = !!result.data?.favorited;
  updateFavoriteCache(studentId, jobId, favorited);
  return favorited;
}

function sanitizeAttachmentUrl(url = "") {
  const raw = String(url || "").trim();
  if (!raw) {
    return "";
  }
  try {
    const parsed = new URL(raw, window.location.origin);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return "";
    }
    return parsed.href;
  } catch (error) {
    return "";
  }
}

function getAttachmentExtension(url = "") {
  const safeUrl = sanitizeAttachmentUrl(url);
  if (!safeUrl) {
    return "";
  }
  const pathname = new URL(safeUrl).pathname;
  const filename = pathname.split("/").pop() || "";
  const dotIndex = filename.lastIndexOf(".");
  if (dotIndex === -1) {
    return "";
  }
  return filename.slice(dotIndex + 1).toLowerCase();
}

function isImageUrl(url = "") {
  return ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(getAttachmentExtension(url));
}

function isPdfUrl(url = "") {
  return getAttachmentExtension(url) === "pdf";
}

function clearAttachmentPreviewBlobUrl() {
  if (attachmentPreviewBlobUrl) {
    URL.revokeObjectURL(attachmentPreviewBlobUrl);
    attachmentPreviewBlobUrl = "";
  }
}

window.addEventListener("beforeunload", clearAttachmentPreviewBlobUrl);

function decodeBase64ToUint8Array(base64Content) {
  const binary = atob(base64Content);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function fetchAttachmentPreviewPayload(url) {
  const safeUrl = sanitizeAttachmentUrl(url);
  if (!safeUrl) {
    throw new Error("invalid-url");
  }
  const encodedUrl = encodeURIComponent(safeUrl);
  const response = await apiRequest(`/referral/file/preview-content?url=${encodedUrl}`, {
    method: "GET"
  });
  return response.data || null;
}

function buildAttachmentOpenUrl(url = "") {
  const safeUrl = sanitizeAttachmentUrl(url);
  if (!safeUrl) {
    return "#";
  }
  if (isImageUrl(safeUrl) || isPdfUrl(safeUrl)) {
    return `/attachment-viewer.html?url=${encodeURIComponent(safeUrl)}`;
  }
  return safeUrl;
}

async function buildAttachmentPreviewBlobUrl(url) {
  const safeUrl = sanitizeAttachmentUrl(url);
  if (!safeUrl) {
    throw new Error("invalid-url");
  }
  const previewPayload = await fetchAttachmentPreviewPayload(safeUrl);
  const base64Content = previewPayload?.base64Content;
  if (!base64Content) {
    throw new Error("empty-content");
  }
  const bytes = decodeBase64ToUint8Array(base64Content);
  const contentType = previewPayload.contentType || (isPdfUrl(safeUrl) ? "application/pdf" : "application/octet-stream");
  const blob = new Blob([bytes], { type: contentType });
  clearAttachmentPreviewBlobUrl();
  attachmentPreviewBlobUrl = URL.createObjectURL(blob);
  return attachmentPreviewBlobUrl;
}

function ensureAttachmentPreviewModal() {
  const existing = document.getElementById("attachment-preview-modal");
  if (existing) {
    existing.remove();
  }
  const modal = document.createElement("div");
  modal.id = "attachment-preview-modal";
  modal.className = "attachment-preview-modal";
  modal.innerHTML = `
    <div class="attachment-preview-mask" data-close="true"></div>
    <div class="attachment-preview-dialog" role="dialog" aria-modal="true" aria-label="闂傚倸鍊搁崐鍝モ偓姘煎墰閳ь剚鍑规禍婊堝煝鎼淬劌顫呴柍钘夋噽閻姊洪崨濠冨闁革綆鍠栭…?>
      <div class="attachment-preview-toolbar">
        <strong>闂傚倸鍊搁崐鍝モ偓姘煎墰閳ь剚鍑规禍婊堝煝鎼淬劌顫呴柍钘夋噽閻姊洪崨濠冨闁革綆鍠栭…?/strong>
        <div class="action-group">
          <a id="attachment-preview-open-link" class="btn ghost-btn" href="#" target="_blank" rel="noreferrer">闂傚倷绀侀幖顐﹀磹鐟欏嫮鐝堕柛鈩冪⊕閸嬫﹢鏌曟径鍡樻珔闁活厽顨婇弻銊モ攽閸℃﹩妫為梺鎰佷簽閺佹悂鍩€椤掍緡鍟忛柛鐘冲浮瀹?/a>
          <button type="button" class="btn" data-close="true">闂傚倷鑳堕…鍫㈡崲閹寸偟绠惧┑鐘蹭迹?/button>
        </div>
      </div>
      <div id="attachment-preview-content" class="attachment-preview-content"></div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.addEventListener("click", (event) => {
    if (event.target?.dataset?.close === "true") {
      modal.classList.remove("is-open");
      document.body.classList.remove("attachment-preview-open");
      clearAttachmentPreviewBlobUrl();
    }
  });
}

async function openAttachmentPreview(url) {
  const safeUrl = sanitizeAttachmentUrl(url);
  if (!safeUrl) {
    showToast("闂傚倸鍊搁崐鍝モ偓姘煎墰閳ь剚鍑规禍婊堝煝鎼淬劌顫呴柕鍫濇噺瀹撳秹姊洪崫鍕垫Ч閻庣瑳鍛筏濠电姵纰嶉悡娑㈡煕閹板吀绨婚弽锟犳⒑閸濆嫭鍣烽柛搴ｆ暬瀵偄顓奸崶锔藉媰闂佺粯鍔﹂崜銊︻殽韫囨挴鏀介柣鎰▕濡茶绻涢懠顒€鏋涢柕鍡楀€块崺锟犲礃閳轰焦鐎梻浣稿閸嬪懐绮欓崼銉ョ；?);
    return;
  }
  const requestSeq = ++attachmentPreviewRequestSeq;
  ensureAttachmentPreviewModal();
  const modal = document.getElementById("attachment-preview-modal");
  const content = document.getElementById("attachment-preview-content");
  const openLink = document.getElementById("attachment-preview-open-link");
  if (!modal || !content || !openLink) {
    return;
  }

  openLink.href = buildAttachmentOpenUrl(safeUrl);
  content.innerHTML = `<div class="attachment-preview-fallback">濠电姵顔栭崰妤冩崲閹邦喖绶ら柦妯侯檧閼版寧銇勮箛鎾跺缂佲偓婢舵劖鐓熸俊顖滃帶閸斿绱掓担宄板祮婵﹤顭峰畷鐔碱敃閵忊晙杩樻繝鐢靛仜濡酣宕瑰ú顏呮櫖闁圭増婢樼粈瀣亜閺囩偞鍣虹紓?..</div>`;

  if (isImageUrl(safeUrl)) {
    try {
      const imageBlobUrl = await buildAttachmentPreviewBlobUrl(safeUrl);
      if (requestSeq !== attachmentPreviewRequestSeq) {
        return;
      }
      content.innerHTML = `<img class="attachment-preview-image" src="${imageBlobUrl}" alt="闂傚倸鍊搁崐鍝モ偓姘煎墰閳ь剚鍑规禍婊堝煝鎼淬劌顫呴柕鍫濇噽閸婄偤姊洪崨濠冨瘷闁告劗鍋撳В鍫濃攽閳藉棗浜濇繝銏☆焽閳ь剚鍑归崹鍫曟晲?>`;
    } catch (error) {
      content.innerHTML = `<div class="attachment-preview-fallback">闂傚倷鐒﹂幃鍫曞磿鏉堛劍娅犻柤鎭掑劜濞呯娀鏌″搴ｅ帨缂佹唻缍侀弻娑㈠即閵娿儲鐝┑鐐插悑濡啴寮诲☉銏犵睄闁稿本顕撮浣虹闁哄鍨舵径鍕偓鍨緲鐎氼厼顭囪箛娑辨晝闁靛鍔栧ú鐔煎蓟閵娿儮妲堟俊顖濆亹閸旑喖顪冮妶鍡樺闁告挻宀搁獮蹇涘川椤栨稑纾梺闈涱煭闂勫嫬鈻撻姀銈嗏拺闁绘劘妫勯崝婊呯磼椤旇偐效鐎殿喚绮换婵嬪礋椤撶姴绠垫繝寰锋澘鈧劙宕戦幘鑸靛枑闁绘鐗忓ú瀛橆殽閻愯尙效妤犵偞锚閻ｇ兘宕堕埡瀣耿闂傚倷鑳堕崑銊╁磿閼碱剛绱﹂柛褎顨呴悞?/div>`;
    }
  } else if (isPdfUrl(safeUrl)) {
    try {
      const pdfBlobUrl = await buildAttachmentPreviewBlobUrl(safeUrl);
      if (requestSeq !== attachmentPreviewRequestSeq) {
        return;
      }
      content.innerHTML = `
        <object class="attachment-preview-pdf" data="${pdfBlobUrl}#toolbar=0&navpanes=0&scrollbar=1" type="application/pdf">
          <div class="attachment-preview-fallback">PDF 婵犵妲呴崑鍛熆濡皷鍋撳鐓庣仸闁挎繄鍋涢鍏煎緞婵犲嫷妲烽梻浣虹帛椤洭宕曢妶鍥╃焾闁哄顑欓悢鍡涙煙椤栨稑顥嬬紒銊ユ健閹嘲鈻庡▎鎴犳殼闂佽桨绀佺粔鎾偩濠靛绀冮柟顖嗗嫷鍞规繝鐢靛仩閹活亞绱為埀顒佺箾婢跺绀嬬€殿噮鍋婃俊鑸靛緞婵犲嫪绱滄繝鐢靛Т閿曘倗鈧凹鍙冮幃锟犲焵椤掑倻纾藉ù锝囨嚀婵牊銇勯妸銉﹀殌闁靛洦鍔曢埥澶愬閻樻鍚嬮梻浣筋潐閸庡磭澹曢鐘差棜濠电姵纰嶉悡鍐煏婢舵稑顩紓鍌涘哺閺?/div>
        </object>
      `;
    } catch (error) {
      content.innerHTML = `<div class="attachment-preview-fallback">PDF 婵犵妲呴崑鍛熆濡皷鍋撳鐓庣仸闁挎繄鍋涢鍏煎緞婵犲嫷妲烽梻浣虹帛椤洭宕曢妶鍥╃焾闁哄顑欓悢鍡涙煙椤栨稑顥嬬紒銊ユ健閹嘲鈻庡▎鎴犳殼闂佽桨绀佺粔鎾偩濠靛绀冮柟顖嗗嫷鍞规繝鐢靛仩閹活亞绱為埀顒佺箾婢跺绀嬬€殿噮鍋婃俊鑸靛緞婵犲嫪绱滄繝鐢靛Т閿曘倗鈧凹鍙冮幃锟犲焵椤掑倻纾藉ù锝囨嚀婵牊銇勯妸銉﹀殌闁靛洦鍔曢埥澶愬閻樻鍚嬮梻浣筋潐閸庡磭澹曢鐘差棜濠电姵纰嶉悡鍐煏婢舵稑顩紓鍌涘哺閺?/div>`;
    }
  } else {
    content.innerHTML = `<div class="attachment-preview-fallback">闂備浇宕垫慨鏉懨洪姀銈呯？闁哄被鍎遍崙鐘绘煕閹般劍娅囨い鈺冨厴閺屾盯骞橀崣澶屻偘濡炪値鍋撶粻鎾诲蓟濞戙垹惟闁靛鍠栭崜鍗炩攽閻愯尙澧曠紒缁樺灩缁瑦寰勬繝搴℃倯闂佺硶鍓濊摫婵炲牅鍗冲楦裤亹閹烘挻鐝崇紓浣插亾濞撴埃鍋撶€规洦鍓熷鍫曞箣閻樿櫕顔撻柣搴″帨閸嬫捇鏌涢弴鐐典粵婵炲牄鍔戦弻锝夋偄閸濄儲鍣ч梺缁橆殘閸嬬喎危閹邦兘鏀介柛顐ゅ枎閻濅即姊洪悙顒冨闁稿﹥鎮傞崺銏ｇ疀濞戞瑧鍘藉銈庡亽閸撴瑦淇婇悜鑺ョ厓鐟滄粓宕滃鍗炲灊鐎广儱顦拑鐔封攽閻樻彃顏柣婊呯帛娣囧﹪濡堕崒姘闁荤喐绮庢晶妤呮儎椤栫偟宓佺€广儱顦粻鑽も偓瑙勬礀濞层劑鏁嶅☉銏♀拺闁绘劘妫勯崝婊呯磼閸濆嫭鍋ラ柛鈹惧亾?/div>`;
  }

  modal.classList.add("is-open");
  document.body.classList.add("attachment-preview-open");
}

document.addEventListener("click", (event) => {
  const trigger = event.target.closest(".attachment-preview-trigger");
  if (!trigger) {
    return;
  }
  event.preventDefault();
  openAttachmentPreview(trigger.dataset.url);
});

document.addEventListener("click", (event) => {
  const openAnchor = event.target.closest(".attachment-action-secondary");
  if (!openAnchor) {
    return;
  }
  const currentHref = openAnchor.getAttribute("href") || "";
  const nextHref = buildAttachmentOpenUrl(currentHref);
  if (!nextHref || nextHref === currentHref) {
    return;
  }
  event.preventDefault();
  window.open(nextHref, "_blank", "noopener,noreferrer");
});

function normalizeAttachmentOpenAnchor(anchor) {
  if (!anchor) {
    return;
  }
  const currentHref = anchor.getAttribute("href") || "";
  const nextHref = buildAttachmentOpenUrl(currentHref);
  if (!nextHref || nextHref === currentHref) {
    return;
  }
  anchor.setAttribute("href", nextHref);
}

function normalizeAllAttachmentOpenAnchors() {
  document.querySelectorAll(".attachment-action-secondary").forEach((anchor) => {
    normalizeAttachmentOpenAnchor(anchor);
  });
}

document.addEventListener("mouseover", (event) => {
  normalizeAttachmentOpenAnchor(event.target.closest(".attachment-action-secondary"));
});

document.addEventListener("contextmenu", (event) => {
  normalizeAttachmentOpenAnchor(event.target.closest(".attachment-action-secondary"));
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", normalizeAllAttachmentOpenAnchors, { once: true });
} else {
  normalizeAllAttachmentOpenAnchors();
}

if (typeof MutationObserver !== "undefined") {
  const attachmentOpenLinkObserver = new MutationObserver(() => {
    normalizeAllAttachmentOpenAnchors();
  });
  if (document.body) {
    attachmentOpenLinkObserver.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      attachmentOpenLinkObserver.observe(document.body, { childList: true, subtree: true });
    }, { once: true });
  }
}

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") {
    return;
  }
  const modal = document.getElementById("attachment-preview-modal");
  if (!modal || !modal.classList.contains("is-open")) {
    return;
  }
  modal.classList.remove("is-open");
  document.body.classList.remove("attachment-preview-open");
  clearAttachmentPreviewBlobUrl();
});

function renderAttachmentLink(url, label = "闂傚倷绀侀幖顐ゆ偖椤愶箑纾块柛鎰嚋閼板潡鏌涘☉妯兼憼闁抽攱妫冮弻娑㈠即閵娿倗鍑瑰?) {
  const safeUrl = sanitizeAttachmentUrl(url);
  if (!safeUrl) {
    return "-";
  }
  const openUrl = buildAttachmentOpenUrl(safeUrl);
  if (isPdfUrl(safeUrl) || isImageUrl(safeUrl)) {
    return `
      <span class="attachment-actions attachment-action-group">
        <button type="button" class="attachment-action attachment-preview-trigger" data-url="${safeUrl}">
          <span class="attachment-action-icon">婵犵妲呴崑鍛熆濡皷鍋撳鐓庣仸闁?/span>
          <span>${label}</span>
        </button>
        <a class="attachment-action attachment-action-secondary" href="${openUrl}" target="_blank" rel="noreferrer">
          <span class="attachment-action-icon">闂傚倷鑳堕幊鎾绘倶濮樿泛绠伴柛婵勫劜椤?/span>
          <span>闂傚倷绀侀幖顐﹀磹鐟欏嫮鐝堕柛鈩冪⊕閸嬫﹢鏌曟径鍡樻珔闁活厽顨婇弻銊モ攽閸℃﹩妫為梺鎰佷簽閺佹悂鍩€椤掍緡鍟忛柛鐘冲浮瀹?/span>
        </a>
      </span>
    `;
  }
  return `
    <span class="attachment-actions attachment-action-group">
      <a class="attachment-action attachment-action-secondary" href="${openUrl}" target="_blank" rel="noreferrer">
        <span class="attachment-action-icon">闂傚倷绀侀幖顐﹀磹缁嬫５娲晲閸涱亝鐎?/span>
        <span>${label}</span>
      </a>
    </span>
  `;
}

function renderAttachmentPreview(url) {
  const safeUrl = sanitizeAttachmentUrl(url);
  if (!safeUrl) {
    return `<div class="attachment-empty">闂傚倷绀侀幖顐⑽涘Δ鍛９闁荤喐瀚堝☉銏犖у璺侯儌閹稿啴姊洪崨濠冨濞存粍绻堥、?/div>`;
  }
  if (isImageUrl(safeUrl)) {
    return `<div class="attachment-preview-card"><img class="attachment-image" src="${safeUrl}" alt="闂傚倸鍊搁崐鍝モ偓姘煎墰閳ь剚鍑规禍婊堝煝鎼淬劌顫呴柍钘夋噽閻姊洪崨濠冨闁革綆鍠栭…?></div>`;
  }
  if (isPdfUrl(safeUrl)) {
    return `<div class="attachment-preview-card attachment-generic">${renderAttachmentLink(safeUrl, "婵犵妲呴崑鍛熆濡皷鍋撳鐓庣仸闁?PDF")}</div>`;
  }
  return `<div class="attachment-preview-card attachment-generic">${renderAttachmentLink(safeUrl, "闂傚倷鑳堕幊鎾绘倶濮樿泛绠伴柛婵勫劜椤洟鏌熸潏楣冩闁抽攱妫冮弻娑㈠即閵娿倗鍑瑰?)}</div>`;
}

async function uploadReferralFile(file, category = "general") {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("category", category);

  const response = await fetch("/referral/file/upload", {
    method: "POST",
    headers: buildAuthHeaders(),
    body: formData
  });
  const result = await parseResponseBody(response);
  const resultCode = Number(result.code ?? (response.ok ? 0 : response.status));
  if (!response.ok || resultCode !== 0) {
    throw new Error(resolveMessage(result, "闂傚倷绀侀幖顐﹀磹缁嬫５娲晲閸涱亝鐎婚梺闈涢獜缁辨洟鍩㈤弬搴撴斀闁绘绮鹃崗宀勬煟閹邦剨宸ユい顓炴健楠炲棝骞嶉鍓у嫎闂佽崵鍠愰悷杈╃不閹捐鏋佺€广儱鎳愰弳鍡涙煕閹邦厼鍔ゆ繛鍫ｅ皺缁辨挻鎷呴崜鎻掑壈缂備礁顦伴幐鎶界嵁閸愩剮鏃堝川椤旀儳甯撻柣搴＄畭閸庨亶鎮ц箛鎾愶綁骞栨担鍦帾?));
  }
  return result.data;
}
