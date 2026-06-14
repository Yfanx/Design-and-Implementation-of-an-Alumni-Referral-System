const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const outputDir = path.resolve(__dirname, "..", "output", "playwright");

const appBase = "http://127.0.0.1:8081";
const adminBase = "http://127.0.0.1:8080";

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function login(page, baseUrl, username, password) {
  await page.goto(`${baseUrl}/login.html`, { waitUntil: "networkidle" });
  await page.locator('input[name="username"]').fill(username);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);
}

async function shot(page, url, filename, options = {}) {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(options.delay ?? 1200);
  await page.screenshot({
    path: path.join(outputDir, filename),
    fullPage: options.fullPage ?? true,
  });
}

async function main() {
  await ensureDir(outputDir);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });

    await shot(page, `${appBase}/login.html`, "thesis-login-app.png", { fullPage: false, delay: 800 });
    await login(page, appBase, "student", "student123");
    await shot(page, `${appBase}/dashboard.html`, "thesis-dashboard-student.png");
    await shot(page, `${appBase}/job-detail.html?id=1`, "thesis-job-detail.png");
    await shot(page, `${appBase}/applications.html`, "thesis-applications-student.png");
    await shot(page, `${appBase}/favorites.html`, "thesis-favorites-student.png");
    await shot(page, `${appBase}/jobs.html`, "thesis-jobs-student.png");
    await shot(page, `${appBase}/consults.html`, "thesis-consults-student.png");
    await shot(page, `${appBase}/profile.html`, "thesis-profile-student.png");
    await shot(
      page,
      `${appBase}/attachment-viewer.html?url=${encodeURIComponent("/uploads/demo/resume/wang.pdf")}`,
      "thesis-attachment-viewer.png",
      { fullPage: false, delay: 1800 }
    );

    const adminPage = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
    await shot(adminPage, `${adminBase}/login.html`, "thesis-login-admin.png", { fullPage: false, delay: 800 });
    await login(adminPage, adminBase, "admin", "admin123");
    await shot(adminPage, `${adminBase}/dashboard.html`, "thesis-dashboard-admin.png");
    await shot(adminPage, `${adminBase}/students.html`, "thesis-students-admin.png");
    await shot(adminPage, `${adminBase}/alumni.html`, "thesis-alumni-admin.png");
    await shot(adminPage, `${adminBase}/jobs.html`, "thesis-jobs-admin.png");
    await shot(adminPage, `${adminBase}/applications.html`, "thesis-applications-admin.png");
    await shot(adminPage, `${adminBase}/consults.html`, "thesis-consults-admin.png");
    await adminPage.close();

    await page.close();
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
