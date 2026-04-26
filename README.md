# 高校校友内推信息管理与对接系统

本项目用于演示高校校友内推岗位发布、学生浏览投递、咨询沟通、管理员审核治理的完整闭环。

## 项目结构
- `referral-admin`：管理员后台，默认端口 `8080`
- `referral-app`：学生/校友前台，默认端口 `8081`
- `deployment/mysql`：MySQL 建库与演示数据 SQL
- `uploads`：附件与预览文件目录

## 角色说明
- 管理员：仅登录后台，负责岗位与申请审核、全局治理
- 校友：仅登录前台，负责发布岗位、查看申请、回复咨询
- 学生：仅登录前台，负责浏览岗位、投递申请、发起咨询、维护资料

## 技术栈
- Java 17
- Spring Boot
- MySQL 8.x
- Maven 3.9+
- 原生 HTML / CSS / JavaScript 静态页面

## 快速启动
1. 先按 [DEPLOY_WINDOWS.md](./DEPLOY_WINDOWS.md) 完成数据库和本地配置文件设置。
2. 在项目根目录 `code` 下执行打包：

```bat
mvn -pl referral-app,referral-admin -am package -DskipTests
```

3. 启动后台：

```bat
mvn -pl referral-admin spring-boot:run
```

4. 启动前台：

```bat
mvn -pl referral-app spring-boot:run
```

## 默认演示账号
- 管理员：`admin / admin123`
- 校友：`alumni / alumni123`
- 学生：`student / student123`

补充账号：
- 校友：`alumni2 / alumni123`、`alumni3 / alumni123`
- 学生：`student2 / student123`、`student3 / student123`、`student4 / student123`、`student5 / student123`

## 访问地址
- 后台登录：[http://localhost:8080/login.html](http://localhost:8080/login.html)
- 前台登录：[http://localhost:8081/login.html](http://localhost:8081/login.html)

## 演示主链路
1. 校友登录前台并发布岗位
2. 管理员登录后台审核岗位或申请
3. 学生登录前台浏览岗位并投递
4. 学生查看附件预览并发起咨询
5. 校友在前台处理申请并回复咨询

## 说明
- 项目最终只保留一份迁移部署文档：`DEPLOY_WINDOWS.md`
- 如果需要迁移到其他 Windows 电脑，直接按部署文档导入 SQL、复制 `config` 模板并修改后启动即可
