# Windows 迁移部署文档

本文档用于把项目完整迁移到另一台 Windows 电脑，并保证可直接运行。

## 1. 环境要求
- Windows 10 或 Windows 11
- JDK 17
- Maven 3.9 及以上
- MySQL 8.x
- 推荐浏览器：Chrome 或 Edge

## 2. 目录约定
- 项目代码目录：`...\code`
- 上传文件目录：`...\uploads`
- SQL 目录：`...\code\deployment\mysql`

建议迁移时把整个项目目录连同 `uploads` 一起复制，目录结构保持如下：

```text
项目根目录
├─ code
│  ├─ referral-admin
│  ├─ referral-app
│  └─ deployment\mysql
└─ uploads
```

## 3. 导入数据库
先在 MySQL 中创建目标库，然后依次执行以下 SQL：

1. `code\deployment\mysql\01-schema.sql`
2. `code\deployment\mysql\02-seed-data.sql`
3. `code\deployment\mysql\03-migrations.sql`

命令行示例：

```bat
mysql -u root -p < code\deployment\mysql\01-schema.sql
mysql -u root -p < code\deployment\mysql\02-seed-data.sql
mysql -u root -p yudao_referral_demo < code\deployment\mysql\03-migrations.sql
```

默认数据库连接名使用：

```text
yudao_referral_demo
```

## 4. 本地配置文件
启动前请先在项目根目录 `code\config` 下复制以下模板文件：

1. `shared-local.example.yml` 复制为 `shared-local.yml`
2. `referral-admin-local.example.yml` 复制为 `referral-admin-local.yml`
3. `referral-app-local.example.yml` 复制为 `referral-app-local.yml`

其中 `shared-local.yml` 需要至少改成下面这样：

```yml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/yudao_referral_demo?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Asia/Shanghai&characterEncoding=utf8
    username: root
    password: 你的MySQL密码

referral:
  file:
    upload-dir: ../uploads
    public-prefix: /uploads/
```

端口配置分别写在：
- `config\referral-admin-local.yml`
- `config\referral-app-local.yml`

默认示例：

```yml
server:
  port: 8080
```

```yml
server:
  port: 8081
```

说明：
- `shared-local.yml`、`referral-admin-local.yml`、`referral-app-local.yml` 默认不会提交到 Git
- `password` 必须改成目标电脑自己的 MySQL 密码
- `upload-dir` 建议指向项目根目录下的 `uploads`
- 当前系统不会在启动时自动重置演示数据
- 如有需要，环境变量仍然可以覆盖文件中的同名配置

## 5. 构建项目
在 `code` 目录下执行：

```bat
mvn -pl referral-app,referral-admin -am package -DskipTests
```

## 6. 启动服务
推荐直接在 `code` 目录执行一键启动脚本。脚本会自动使用 JDK 17、检查 Docker MySQL、构建项目、启动前后台服务，并在已有数据库上执行 `03-migrations.sql` 兼容迁移：

```bat
start-system.cmd
```

如果不希望自动打开浏览器，可执行：

```bat
powershell -ExecutionPolicy Bypass -File tools\start-all.ps1 -NoBrowser
```

停止前后台 Java 服务：

```bat
stop-system.cmd
```

也可以按下面方式手动启动。

### 启动后台

```bat
mvn -pl referral-admin spring-boot:run
```

### 启动前台

```bat
mvn -pl referral-app spring-boot:run
```

## 7. 默认账号
- 管理员：`admin / admin123`
- 校友：`alumni / alumni123`
- 学生：`student / student123`

补充账号：
- 校友：`alumni2 / alumni123`、`alumni3 / alumni123`
- 学生：`student2 / student123`、`student3 / student123`、`student4 / student123`、`student5 / student123`

## 8. 访问地址
- 后台登录：`http://localhost:8080/login.html`
- 前台登录：`http://localhost:8081/login.html`

## 9. 迁移检查清单
- MySQL 已启动，且 `yudao_referral_demo` 可正常连接
- `uploads` 目录已随项目一起复制
- `8080` 和 `8081` 未被其他进程占用
- 管理员只能进入 `8080`
- 学生和校友只能进入 `8081`
- 企业图标地址可访问，例如：
  - `http://localhost:8081/assets/company/tencent.png`
- 附件地址可访问，例如：
  - `http://localhost:8081/uploads/demo/resume/wang_backend_resume.pdf`
- 全链路冒烟测试通过：
  - `powershell -ExecutionPolicy Bypass -File tools\smoke-test.ps1`

## 10. 常见问题
### 10.1 端口被占用
在 PowerShell 中执行：

```bat
netstat -ano | findstr 8080
netstat -ano | findstr 8081
taskkill /PID 进程号 /F
```

### 10.2 登录后出现 401 或 403
- 先退出登录，再重新登录
- 确认没有用后台管理员账号登录前台
- 确认没有用学生或校友账号登录后台

### 10.3 附件预览被 IDM 干扰
- 优先使用系统页面内的预览按钮
- 答辩环境建议临时关闭 IDM 浏览器接管
- 若需新窗口打开，优先走系统提供的“新窗口查看”入口

### 10.4 迁移后附件无法打开
- 检查 `config\shared-local.yml` 中的 `referral.file.upload-dir` 是否指向正确的 `uploads`
- 检查 `uploads` 是否完整复制
- 检查附件 URL 是否能直接访问
