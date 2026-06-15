const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const appBase = process.env.APP_BASE_URL || "http://127.0.0.1:8081";
const adminBase = process.env.ADMIN_BASE_URL || "http://127.0.0.1:8080";
const outputDir = path.join(process.cwd(), "output", "playwright");
const reportPath = path.join(outputDir, "browser-audit-report.json");

const appEntries = [
  { name: "index", path: "/index.html", auth: null },
  { name: "login", path: "/login.html", auth: null },
  { name: "register", path: "/register.html", auth: null },
  { name: "dashboard-student", path: "/dashboard.html", auth: "student" },
  { name: "jobs-student", path: "/jobs.html", auth: "student" },
  { name: "favorites-student", path: "/favorites.html", auth: "student" },
  { name: "companies-student", path: "/companies.html", auth: "student" },
  { name: "applications-student", path: "/applications.html", auth: "student" },
  { name: "consults-student", path: "/consults.html", auth: "student" },
  { name: "job-detail-student", path: "/job-detail.html?id=4001", auth: "student" },
  { name: "profile-student", path: "/profile.html", auth: "student" },
  { name: "attachment-viewer", path: `/attachment-viewer.html?url=${encodeURIComponent("/uploads/demo/resume/wang_backend_resume.pdf")}`, auth: "student" },
  { name: "dashboard-alumni", path: "/dashboard.html", auth: "alumni" },
  { name: "jobs-alumni", path: "/jobs.html", auth: "alumni" },
  { name: "companies-alumni", path: "/companies.html", auth: "alumni" },
  { name: "applications-alumni", path: "/applications.html", auth: "alumni" },
  { name: "consults-alumni", path: "/consults.html", auth: "alumni" },
  { name: "job-detail-alumni", path: "/job-detail.html?id=4001", auth: "alumni" },
  { name: "profile-alumni", path: "/profile.html", auth: "alumni" }
];

const adminEntries = [
  { name: "admin-login", path: "/login.html", auth: null },
  { name: "admin-dashboard", path: "/dashboard.html", auth: "admin" },
  { name: "admin-audit-center", path: "/audit-center.html", auth: "admin" },
  { name: "admin-jobs", path: "/jobs.html", auth: "admin" },
  { name: "admin-companies", path: "/companies.html", auth: "admin" },
  { name: "admin-applications", path: "/applications.html", auth: "admin" },
  { name: "admin-consults", path: "/consults.html", auth: "admin" },
  { name: "admin-students", path: "/students.html", auth: "admin" },
  { name: "admin-alumni", path: "/alumni.html", auth: "admin" },
  { name: "admin-profile", path: "/profile.html", auth: "admin" },
  { name: "admin-attachment-viewer", path: `/attachment-viewer.html?url=${encodeURIComponent("/uploads/demo/resume/wang_backend_resume.pdf")}`, auth: "admin" }
];

const users = {
  student: { username: "student", password: "student123", base: appBase },
  alumni: { username: "alumni", password: "alumni123", base: appBase },
  admin: { username: "admin", password: "admin123", base: adminBase }
};

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function apiLogin(user) {
  const response = await fetch(`${user.base}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: user.username, password: user.password })
  });
  const result = await response.json();
  assert(result.code === 0, `login failed for ${user.username}: ${result.message}`);
  return result.data;
}

function shouldIgnoreConsole(message) {
  const text = message.text();
  return message.type() === "warning" && /favicon|DevTools/.test(text);
}

async function newPageWithAudit(context, pageResult) {
  const page = await context.newPage();
  page.on("console", (message) => {
    if (message.type() === "error" && !shouldIgnoreConsole(message)) {
      pageResult.consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    pageResult.pageErrors.push(error.message);
  });
  page.on("requestfailed", (request) => {
    const url = request.url();
    if (!url.startsWith(appBase) && !url.startsWith(adminBase)) {
      return;
    }
    pageResult.requestFailures.push({
      url,
      method: request.method(),
      error: request.failure()?.errorText || "request failed"
    });
  });
  page.on("response", (response) => {
    const url = response.url();
    const status = response.status();
    if ((url.startsWith(appBase) || url.startsWith(adminBase)) && status >= 500) {
      pageResult.httpErrors.push({ url, status });
    }
  });
  return page;
}

async function setSession(context, origin, session, storageKey) {
  await context.addInitScript(({ sessionValue, key }) => {
    localStorage.setItem(key, JSON.stringify(sessionValue));
  }, { sessionValue: session, key: storageKey });
  await context.addCookies([{
    name: "referral_audit_marker",
    value: "1",
    url: origin
  }]);
}

async function auditPage(browser, entry, base, sessions, storageKey) {
  const result = {
    name: entry.name,
    url: `${base}${entry.path}`,
    finalUrl: "",
    consoleErrors: [],
    pageErrors: [],
    requestFailures: [],
    httpErrors: [],
    assertions: []
  };
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    ignoreHTTPSErrors: true
  });
  try {
    if (entry.auth) {
      await setSession(context, base, sessions[entry.auth], storageKey);
    }
    const page = await newPageWithAudit(context, result);
    await page.goto(result.url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => null);
    result.finalUrl = page.url();
    const bodyText = await page.locator("body").innerText({ timeout: 10000 }).catch(() => "");
    if (!entry.auth) {
      assert(!/Not logged in|登录状态已失效/.test(bodyText), `${entry.name} unexpectedly requires login`);
    }
    if (entry.auth && /login\.html$/.test(new URL(result.finalUrl).pathname)) {
      throw new Error(`${entry.name} redirected to login`);
    }
    assert(result.pageErrors.length === 0, `${entry.name} has page errors`);
    assert(result.consoleErrors.length === 0, `${entry.name} has console errors`);
    assert(result.httpErrors.length === 0, `${entry.name} has HTTP 5xx errors`);
    result.assertions.push("page loaded without console/page/http errors");
    await page.close();
  } catch (error) {
    result.failed = true;
    result.error = error.message;
  } finally {
    await context.close();
  }
  return result;
}

async function clickIfVisible(page, selector) {
  const locator = page.locator(selector).first();
  if (await locator.count() === 0) {
    return false;
  }
  if (!await locator.isVisible().catch(() => false)) {
    return false;
  }
  await locator.click();
  return true;
}

async function auditInteractions(browser, sessions) {
  const result = {
    name: "key-interactions",
    consoleErrors: [],
    pageErrors: [],
    requestFailures: [],
    httpErrors: [],
    assertions: []
  };
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  await setSession(context, appBase, sessions.student, "referral_app_user");
  const page = await newPageWithAudit(context, result);
  try {
    await page.goto(`${appBase}/jobs.html`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => null);
    await clickIfVisible(page, "text=收藏");
    await page.waitForTimeout(500);
    result.assertions.push("favorite button click did not crash");

    await page.goto(`${appBase}/consults.html`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => null);
    const textarea = page.locator("textarea").first();
    if (await textarea.count() > 0 && await textarea.isVisible().catch(() => false)) {
      await textarea.fill(`browser audit ${Date.now()}`);
      await clickIfVisible(page, "button:has-text('发送')");
      await page.waitForTimeout(800);
      result.assertions.push("consult message send path executed");
    } else {
      result.assertions.push("consult message input not visible; page load verified only");
    }

    await page.goto(`${appBase}/profile.html`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => null);
    await clickIfVisible(page, "text=我的资料");
    result.assertions.push("profile page interaction did not crash");

    assert(result.pageErrors.length === 0, "interaction flow has page errors");
    assert(result.consoleErrors.length === 0, "interaction flow has console errors");
    assert(result.httpErrors.length === 0, "interaction flow has HTTP 5xx errors");
  } catch (error) {
    result.failed = true;
    result.error = error.message;
  } finally {
    await page.close().catch(() => null);
    await context.close();
  }
  return result;
}

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });
  const sessions = {
    student: await apiLogin(users.student),
    alumni: await apiLogin(users.alumni),
    admin: await apiLogin(users.admin)
  };
  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    for (const entry of appEntries) {
      results.push(await auditPage(browser, entry, appBase, sessions, "referral_app_user"));
    }
    for (const entry of adminEntries) {
      results.push(await auditPage(browser, entry, adminBase, sessions, "referral_admin_user"));
    }
    results.push(await auditInteractions(browser, sessions));
  } finally {
    await browser.close();
  }
  const summary = {
    generatedAt: new Date().toISOString(),
    appBase,
    adminBase,
    total: results.length,
    failed: results.filter((item) => item.failed).length,
    results
  };
  fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2), "utf8");
  if (summary.failed > 0) {
    console.error(JSON.stringify(summary.results.filter((item) => item.failed), null, 2));
    process.exit(1);
  }
  console.log(`Browser audit passed: ${summary.total} checks. Report: ${reportPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
