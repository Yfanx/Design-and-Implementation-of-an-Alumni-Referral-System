# 包结构与文件命名

```text
yudao-module-referral
├─ README.md
├─ pom.xml
├─ docs
│  ├─ 01-module-overview.md
│  ├─ 02-package-structure-and-file-names.md
│  └─ 03-api-and-class-list.md
├─ sql
│  └─ 00-referral-schema-draft.sql
└─ src/main/java/cn/iocoder/yudao/module/referral
   ├─ controller
   │  ├─ admin
   │  │  ├─ alumni/AlumniInfoController.java
   │  │  ├─ student/StudentInfoController.java
   │  │  ├─ company/CompanyInfoController.java
   │  │  ├─ job/JobInfoController.java
   │  │  ├─ referral/ReferralApplicationController.java
   │  │  ├─ consult/ConsultMessageController.java
   │  │  └─ dashboard/DashboardController.java
   │  └─ app
   │     ├─ alumni/AppAlumniInfoController.java
   │     ├─ student/AppStudentInfoController.java
   │     ├─ job/AppJobInfoController.java
   │     ├─ referral/AppReferralApplicationController.java
   │     └─ consult/AppConsultMessageController.java
   ├─ convert
   │  ├─ alumni/AlumniInfoConvert.java
   │  ├─ student/StudentInfoConvert.java
   │  ├─ company/CompanyInfoConvert.java
   │  ├─ job/JobInfoConvert.java
   │  ├─ referral/ReferralApplicationConvert.java
   │  └─ consult/ConsultMessageConvert.java
   ├─ dal
   │  ├─ dataobject
   │  │  ├─ alumni/AlumniInfoDO.java
   │  │  ├─ student/StudentInfoDO.java
   │  │  ├─ company/CompanyInfoDO.java
   │  │  ├─ job/JobInfoDO.java
   │  │  ├─ referral/ReferralApplicationDO.java
   │  │  └─ consult/ConsultMessageDO.java
   │  └─ mysql
   │     ├─ alumni/AlumniInfoMapper.java
   │     ├─ student/StudentInfoMapper.java
   │     ├─ company/CompanyInfoMapper.java
   │     ├─ job/JobInfoMapper.java
   │     ├─ referral/ReferralApplicationMapper.java
   │     ├─ consult/ConsultMessageMapper.java
   │     └─ dashboard/DashboardMapper.java
   ├─ enums
   │  ├─ JobStatusEnum.java
   │  ├─ JobAuditStatusEnum.java
   │  ├─ ReferralApplicationStatusEnum.java
   │  └─ UserRoleEnum.java
   └─ service
      ├─ alumni/AlumniInfoService.java
      ├─ alumni/AlumniInfoServiceImpl.java
      ├─ student/StudentInfoService.java
      ├─ student/StudentInfoServiceImpl.java
      ├─ company/CompanyInfoService.java
      ├─ company/CompanyInfoServiceImpl.java
      ├─ job/JobInfoService.java
      ├─ job/JobInfoServiceImpl.java
      ├─ referral/ReferralApplicationService.java
      ├─ referral/ReferralApplicationServiceImpl.java
      ├─ consult/ConsultMessageService.java
      ├─ consult/ConsultMessageServiceImpl.java
      ├─ dashboard/DashboardService.java
      └─ dashboard/DashboardServiceImpl.java
```

命名规则：

- 数据库对象统一使用 `*DO`
- 查询/创建/修改/返回对象统一使用 `*ReqVO` / `*RespVO`
- 控制器统一使用 `*Controller`
- Service 接口与实现使用 `*Service` / `*ServiceImpl`
- 数据访问层统一使用 `*Mapper`
- 对象转换层统一使用 `*Convert`
