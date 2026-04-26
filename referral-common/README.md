# yudao-module-referral

`yudao-module-referral` is a standalone runnable Spring Boot demo project that keeps a RuoYi-Vue-Pro style package structure for the graduation project "高校校友内推信息管理与对接系统".

Current scope:

- standalone Maven project under `code`
- Spring Boot backend with RuoYi-style layering
- multi-page admin UI: login, dashboard, jobs, applications, consults
- fake login flow for demo presentation
- default in-memory demo data, no database setup required
- optional MySQL mode for `company / job / referral_application`
- draft SQL schema for later full migration

Run locally:

1. Open the `code` directory in IDEA
2. Import Maven dependencies
3. Run `cn.iocoder.yudao.server.YudaoReferralApplication`
4. Open [http://localhost:8080](http://localhost:8080)

Or from terminal:

```powershell
cd code
mvn -pl yudao-module-referral spring-boot:run
```

Demo highlights:

- separate pages instead of single-page prototype
- role-based pages for `admin / alumni / student`
- student-side job-search style dashboard and job marketplace
- student job detail page with related jobs and quick actions
- overview dashboard
- job management
- referral application management
- consult message management
- quick-create forms on the related pages
- demo login accounts

Override the default port if needed:

```powershell
$env:SERVER_PORT=18080
cd code
mvn -pl yudao-module-referral spring-boot:run
```

Demo accounts:

- `admin / admin123`
- `alumni / alumni123`
- `student / student123`

Run with MySQL mode:

1. Create database `yudao_referral_demo`
2. Edit [application-mysql.yml](D:/code/codex/高校校友内推信息管理与对接系统的设计与实现/code/yudao-module-referral/src/main/resources/application-mysql.yml) with your MySQL username and password
3. Start with profile:

```powershell
cd code
mvn -pl yudao-module-referral spring-boot:run -Dspring-boot.run.profiles=mysql
```

Notes:

- default profile is still `demo`
- MySQL mode currently persists `company`, `job`, and `referral_application`
- `alumni`, `student`, `consult`, and part of dashboard data still use built-in demo data

Next step after the demo:

1. Replace the in-memory store with MySQL + MyBatis
2. Fill the `Mapper` layer with real SQL
3. Add login, role permissions, and file upload
