USE yudao_referral_demo;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

REPLACE INTO ref_company_info (
  id, company_name, industry, company_size, city, address, company_desc, official_website, status
) VALUES
  (3001, '腾讯', '互联网', '10000人以上', '深圳', '广东省深圳市南山区海天二路33号腾讯滨海大厦', '综合互联网科技企业，覆盖社交、内容、云服务与企业数字化等业务。', 'https://www.tencent.com', 1),
  (3002, '字节跳动', '互联网', '10000人以上', '上海', '上海市杨浦区政立路489号创智天地', '以内容平台、协同办公和全球化产品为核心的科技企业。', 'https://www.bytedance.com', 1),
  (3003, '阿里云', '云计算', '10000人以上', '杭州', '浙江省杭州市西湖区转塘科技园', '阿里巴巴集团面向企业的云计算与数字化基础设施平台。', 'https://www.alibabacloud.com', 1),
  (3004, '美团', '生活服务', '10000人以上', '北京', '北京市朝阳区望京东路4号', '连接到店、到家、出行与零售等场景的生活服务科技公司。', 'https://www.meituan.com', 1),
  (3005, '华为', 'ICT', '10000人以上', '深圳', '广东省深圳市龙岗区坂田华为基地', '覆盖通信设备、云、终端与数字能源等业务的 ICT 企业。', 'https://www.huawei.com', 1);

REPLACE INTO ref_alumni_info (
  id, user_id, real_name, gender, graduation_year, college, major, company_id, company_name,
  industry, position_name, city, referral_permission, intro, verify_status
) VALUES
  (1001, 101, '张宇辰', 1, 2021, '计算机与通信学院', '计算机科学与技术', 3001, '腾讯',
   '互联网', '后端开发工程师', '深圳', 1, '参与企业协同与招聘平台服务端建设，可提供后端研发岗位内推与简历建议。', 1),
  (1002, 102, '李安然', 2, 2020, '计算机与通信学院', '软件工程', 3002, '字节跳动',
   '互联网', '推荐算法工程师', '上海', 1, '从事推荐系统与搜索排序方向，擅长评估算法、数据和工程岗位简历。', 1),
  (1003, 103, '陈嘉豪', 1, 2019, '信息工程学院', '网络工程', 3003, '阿里云',
   '云计算', '云平台研发工程师', '杭州', 1, '负责云平台基础服务与可观测性建设，可对接云计算与后端开发方向岗位。', 1),
  (1004, 104, '周梦溪', 2, 2018, '电子信息学院', '电子信息工程', 3004, '美团',
   '生活服务', '前端开发工程师', '北京', 1, '负责中后台与营销活动前端研发，可帮助学生完善前端项目展示与岗位理解。', 1),
  (1005, 105, '王博文', 1, 2017, '自动化学院', '自动化', 3005, '华为',
   'ICT', '软件开发工程师', '深圳', 1, '长期参与终端软件与平台工程建设，可提供软件开发和测试方向岗位经验分享。', 1);

REPLACE INTO ref_student_info (
  id, user_id, real_name, gender, student_no, college, major, grade, education,
  expected_industry, expected_job, expected_city, skill_tags, resume_url, intro
) VALUES
  (2001, 201, '王同学', 1, '2022001001', '计算机与通信学院', '计算机科学与技术', '2022级', '本科',
   '互联网', 'Java后端开发', '上海', 'Java,Spring Boot,MySQL,Redis', '/uploads/demo/resume/wang.pdf', '做过校内管理系统和招聘平台项目，希望从事后端开发岗位。'),
  (2002, 202, '赵同学', 2, '2022001002', '计算机与通信学院', '软件工程', '2022级', '本科',
   '人工智能', '推荐算法工程师', '杭州', 'Python,机器学习,推荐系统,数据分析', '/uploads/demo/resume/zhao.pdf', '做过推荐算法课程项目，希望尝试真实业务场景。'),
  (2003, 203, '刘同学', 1, '2022001003', '信息工程学院', '网络工程', '2022级', '本科',
   '云计算', '云平台开发', '杭州', 'Java,Go,Docker,Kubernetes', '/uploads/demo/resume/wang.pdf', '熟悉容器化部署和服务治理，期望从事云平台与基础设施研发。'),
  (2004, 204, '孙同学', 2, '2022001004', '电子信息学院', '数字媒体技术', '2022级', '本科',
   '互联网', '前端开发工程师', '北京', 'Vue3,TypeScript,Element Plus,工程化', '/uploads/demo/resume/zhao.pdf', '有活动页和管理后台开发经验，关注前端体验与组件设计。'),
  (2005, 205, '黄同学', 1, '2022001005', '自动化学院', '自动化', '2022级', '本科',
   'ICT', '软件开发工程师', '深圳', 'C++,Java,操作系统,网络协议', '/uploads/demo/resume/wang.pdf', '做过设备侧软件课程设计，希望进入大型研发团队。');

REPLACE INTO ref_auth_account (
  id, username, password, role, user_id, profile_id
) VALUES
  (1, 'admin', 'admin123', 'ADMIN', 1, 1),
  (2, 'alumni', 'alumni123', 'ALUMNI', 101, 1001),
  (3, 'alumni2', 'alumni123', 'ALUMNI', 102, 1002),
  (4, 'alumni3', 'alumni123', 'ALUMNI', 103, 1003),
  (5, 'student', 'student123', 'STUDENT', 201, 2001),
  (6, 'student2', 'student123', 'STUDENT', 202, 2002),
  (7, 'student3', 'student123', 'STUDENT', 203, 2003),
  (8, 'student4', 'student123', 'STUDENT', 204, 2004),
  (9, 'student5', 'student123', 'STUDENT', 205, 2005);

REPLACE INTO ref_job_info (
  id, alumni_id, company_id, job_title, job_type, industry, city, salary_range,
  education_requirement, experience_requirement, skill_requirement, job_desc, contact_type,
  referral_quota, status, audit_status, publish_time, expire_time
) VALUES
  (4001, 1001, 3001, 'Java后端开发实习生', '实习', '互联网', '深圳', '220-300元/天',
   '本科', '熟悉Spring Boot和MySQL', 'Java,Spring Boot,MySQL,Redis', '参与招聘与协同平台后端接口开发、联调与数据治理。', '站内沟通',
   3, 2, 1, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY)),
  (4002, 1002, 3002, '推荐算法工程师', '校招', '互联网', '上海', '22k-35k',
   '本科及以上', '有推荐或搜索项目经验', 'Python,机器学习,推荐系统,特征工程', '参与推荐排序链路、特征构建和离线评估。', '站内沟通',
   2, 2, 1, NOW(), DATE_ADD(NOW(), INTERVAL 25 DAY)),
  (4003, 1003, 3003, '云平台研发工程师', '校招', '云计算', '杭州', '20k-32k',
   '本科及以上', '熟悉Linux和分布式基础', 'Java,Go,Docker,Kubernetes,微服务', '负责云平台基础服务、可观测性和工程交付能力建设。', '站内沟通',
   2, 2, 1, NOW(), DATE_ADD(NOW(), INTERVAL 25 DAY)),
  (4004, 1004, 3004, '前端开发工程师', '校招', '生活服务', '北京', '18k-28k',
   '本科', '熟悉Vue3或React', 'Vue3,TypeScript,工程化,交互设计', '负责中后台与运营活动页面开发，关注性能与交互体验。', '站内沟通',
   2, 2, 1, NOW(), DATE_ADD(NOW(), INTERVAL 20 DAY)),
  (4005, 1005, 3005, '软件开发工程师', '校招', 'ICT', '深圳', '19k-30k',
   '本科及以上', '有扎实的数据结构与操作系统基础', 'C++,Java,网络协议,操作系统', '参与终端与平台软件研发、模块设计和工程交付。', '站内沟通',
   3, 2, 1, NOW(), DATE_ADD(NOW(), INTERVAL 20 DAY)),
  (4006, 1001, 3001, '数据平台开发工程师', '校招', '互联网', '深圳', '20k-30k',
   '本科', '熟悉ETL或数据仓库基础', 'Java,Spark,Flink,MySQL', '参与数据链路与报表平台建设，支持业务分析和效果评估。', '站内沟通',
   2, 0, 0, NOW(), DATE_ADD(NOW(), INTERVAL 18 DAY)),
  (4007, 1003, 3003, '测试开发工程师', '校招', '云计算', '杭州', '18k-26k',
   '本科', '熟悉自动化测试和脚本开发', 'Python,自动化测试,接口测试,CI/CD', '负责核心云服务的自动化测试与发布质量保障。', '站内沟通',
   2, 2, 1, NOW(), DATE_ADD(NOW(), INTERVAL 18 DAY));

REPLACE INTO ref_referral_application (
  id, job_id, student_id, alumni_id, resume_url, self_introduction, match_score, apply_status,
  process_remark, apply_time, process_time
) VALUES
  (5001, 4001, 2001, 1001, '/uploads/demo/resume/wang.pdf', '我有 Java Web 与数据库设计经验，希望从事后端开发岗位。', 89.50, 1,
   '已查看简历，建议补充项目中的接口性能优化细节。', NOW(), NOW()),
  (5002, 4002, 2002, 1002, '/uploads/demo/resume/zhao.pdf', '做过推荐算法课程项目，希望尝试真实推荐业务链路。', 92.00, 2,
   '已转入部门面试流程，请继续准备项目复盘。', NOW(), NOW()),
  (5003, 4003, 2003, 1003, '/uploads/demo/resume/wang.pdf', '熟悉容器编排和服务治理，希望进入云平台研发方向。', 90.00, 0,
   '待校友查看。', NOW(), NULL),
  (5004, 4004, 2004, 1004, '/uploads/demo/resume/zhao.pdf', '有管理后台和活动页开发经历，希望进入前端工程岗位。', 87.00, 4,
   '流程已完成，建议继续跟进正式 offer。', NOW(), NOW());

REPLACE INTO ref_consult_message (
  id, job_id, sender_user_id, receiver_user_id, sender_role, receiver_role, content, read_status, send_time
) VALUES
  (6001, 4001, 201, 101, 2, 1, '学长您好，请问这个岗位对实习时长有要求吗？', 1, NOW()),
  (6002, 4001, 101, 201, 1, 2, '建议至少保证 3 个月，每周到岗 4 天及以上。', 1, NOW()),
  (6003, 4002, 202, 102, 2, 1, '请问推荐算法岗位更关注竞赛经历还是业务项目经历？', 1, NOW()),
  (6004, 4002, 102, 202, 1, 2, '优先看业务问题建模能力，其次再看竞赛或论文经历。', 1, NOW()),
  (6005, 4003, 203, 103, 2, 1, '云平台岗位会看容器和服务治理经验吗？', 0, NOW()),
  (6006, 4004, 104, 204, 1, 2, '如果你方便的话，可以把一个完整前端项目的架构拆解写进简历。', 1, NOW());

REPLACE INTO ref_job_favorite (id, student_id, job_id) VALUES
  (7001, 2001, 4001),
  (7002, 2001, 4003),
  (7003, 2004, 4004);

SET FOREIGN_KEY_CHECKS = 1;
