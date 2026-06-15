-- Clean rebuild script for yudao_referral_demo.
-- Usage: mysql -u root -p --default-character-set=utf8mb4 < code/deployment/mysql/00-reset-and-import.sql

DROP DATABASE IF EXISTS yudao_referral_demo;

CREATE DATABASE IF NOT EXISTS yudao_referral_demo
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE yudao_referral_demo;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS ref_job_favorite;
DROP TABLE IF EXISTS ref_consult_message;
DROP TABLE IF EXISTS ref_referral_application;
DROP TABLE IF EXISTS ref_job_info;
DROP TABLE IF EXISTS ref_company_info;
DROP TABLE IF EXISTS ref_student_info;
DROP TABLE IF EXISTS ref_alumni_info;
DROP TABLE IF EXISTS ref_auth_account;

CREATE TABLE ref_auth_account (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(64) NOT NULL UNIQUE,
    password VARCHAR(128) NOT NULL,
    role VARCHAR(32) NOT NULL,
    user_id BIGINT,
    profile_id BIGINT,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_role (role),
    KEY idx_user_profile (user_id, profile_id)
);

CREATE TABLE ref_company_info (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    company_name VARCHAR(128) NOT NULL,
    industry VARCHAR(64),
    company_size VARCHAR(64),
    city VARCHAR(64),
    address VARCHAR(255),
    company_desc VARCHAR(500),
    logo_url VARCHAR(500),
    official_website VARCHAR(255),
    status TINYINT DEFAULT 1,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_company_city (city),
    KEY idx_company_industry (industry),
    KEY idx_company_status (status)
);

CREATE TABLE ref_alumni_info (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    real_name VARCHAR(64) NOT NULL,
    gender TINYINT,
    graduation_year INT,
    college VARCHAR(100),
    major VARCHAR(100),
    company_id BIGINT,
    company_name VARCHAR(128),
    industry VARCHAR(64),
    position_name VARCHAR(100),
    city VARCHAR(64),
    referral_permission TINYINT DEFAULT 1,
    intro VARCHAR(500),
    verify_status TINYINT DEFAULT 1,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_alumni_user (user_id),
    KEY idx_alumni_company (company_id),
    KEY idx_alumni_city (city),
    KEY idx_alumni_verify (verify_status),
    CONSTRAINT fk_alumni_company FOREIGN KEY (company_id) REFERENCES ref_company_info(id)
);

CREATE TABLE ref_student_info (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    real_name VARCHAR(64) NOT NULL,
    gender TINYINT,
    student_no VARCHAR(64),
    college VARCHAR(100),
    major VARCHAR(100),
    grade VARCHAR(32),
    education VARCHAR(32),
    expected_industry VARCHAR(64),
    expected_job VARCHAR(100),
    expected_city VARCHAR(64),
    skill_tags VARCHAR(255),
    resume_url VARCHAR(255),
    intro VARCHAR(500),
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_student_user (user_id),
    UNIQUE KEY uk_student_no (student_no),
    KEY idx_student_city (expected_city),
    KEY idx_student_job (expected_job)
);

CREATE TABLE ref_job_info (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    alumni_id BIGINT NOT NULL,
    company_id BIGINT NOT NULL,
    job_title VARCHAR(100) NOT NULL,
    job_type VARCHAR(64),
    industry VARCHAR(64),
    city VARCHAR(64),
    salary_range VARCHAR(64),
    education_requirement VARCHAR(64),
    experience_requirement VARCHAR(128),
    skill_requirement VARCHAR(255),
    job_desc VARCHAR(1000),
    contact_type VARCHAR(32),
    referral_quota INT DEFAULT 1,
    status TINYINT DEFAULT 0,
    audit_status TINYINT DEFAULT 0,
    publish_time DATETIME,
    expire_time DATETIME,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_job_alumni (alumni_id),
    KEY idx_job_company (company_id),
    KEY idx_job_city (city),
    KEY idx_job_industry (industry),
    KEY idx_job_audit_status (audit_status, status),
    CONSTRAINT fk_job_alumni FOREIGN KEY (alumni_id) REFERENCES ref_alumni_info(id),
    CONSTRAINT fk_job_company FOREIGN KEY (company_id) REFERENCES ref_company_info(id)
);

CREATE TABLE ref_referral_application (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    job_id BIGINT NOT NULL,
    student_id BIGINT NOT NULL,
    alumni_id BIGINT NOT NULL,
    resume_url VARCHAR(255),
    self_introduction VARCHAR(500),
    match_score DECIMAL(5,2),
    apply_status TINYINT DEFAULT 0,
    process_remark VARCHAR(500),
    apply_time DATETIME,
    process_time DATETIME,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_referral_job (job_id),
    KEY idx_referral_student (student_id),
    KEY idx_referral_alumni (alumni_id),
    KEY idx_referral_status (apply_status),
    CONSTRAINT fk_referral_job FOREIGN KEY (job_id) REFERENCES ref_job_info(id),
    CONSTRAINT fk_referral_student FOREIGN KEY (student_id) REFERENCES ref_student_info(id),
    CONSTRAINT fk_referral_alumni FOREIGN KEY (alumni_id) REFERENCES ref_alumni_info(id)
);

CREATE TABLE ref_consult_message (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    job_id BIGINT,
    sender_user_id BIGINT NOT NULL,
    receiver_user_id BIGINT NOT NULL,
    sender_role TINYINT NOT NULL,
    receiver_role TINYINT NOT NULL,
    content VARCHAR(1000) NOT NULL,
    read_status TINYINT DEFAULT 0,
    send_time DATETIME,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_consult_job (job_id),
    KEY idx_consult_sender (sender_user_id),
    KEY idx_consult_receiver (receiver_user_id),
    KEY idx_consult_read (read_status),
    CONSTRAINT fk_consult_job FOREIGN KEY (job_id) REFERENCES ref_job_info(id)
);

CREATE TABLE ref_job_favorite (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    student_id BIGINT NOT NULL,
    job_id BIGINT NOT NULL,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_student_job (student_id, job_id),
    KEY idx_favorite_job (job_id),
    CONSTRAINT fk_favorite_student FOREIGN KEY (student_id) REFERENCES ref_student_info(id),
    CONSTRAINT fk_favorite_job FOREIGN KEY (job_id) REFERENCES ref_job_info(id)
);

SET FOREIGN_KEY_CHECKS = 1;

-- Seed demo data
USE yudao_referral_demo;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

REPLACE INTO ref_company_info (
  id, company_name, industry, company_size, city, address, company_desc, logo_url, official_website, status
) VALUES
  (3001, '腾讯', '互联网', '10000人以上', '深圳', '广东省深圳市南山区海天二路33号腾讯滨海大厦', '综合互联网科技企业，覆盖社交、内容、云服务与企业数字化等业务。', '/assets/company/tencent.png', 'https://www.tencent.com', 1),
  (3002, '字节跳动', '互联网', '10000人以上', '上海', '上海市杨浦区政立路489号创智天地', '以内容平台、协同办公和全球化产品为核心的科技企业。', '/assets/company/bytedance.png', 'https://www.bytedance.com', 1),
  (3003, '阿里云', '云计算', '10000人以上', '杭州', '浙江省杭州市西湖区转塘科技园', '阿里巴巴集团面向企业的云计算与数字化基础设施平台。', '/assets/company/alibabacloud.png', 'https://www.alibabacloud.com', 1),
  (3004, '美团', '生活服务', '10000人以上', '北京', '北京市朝阳区望京东路4号', '连接到店、到家、出行与零售等场景的生活服务科技公司。', '/assets/company/meituan.png', 'https://www.meituan.com', 1),
  (3005, '华为', 'ICT', '10000人以上', '深圳', '广东省深圳市龙岗区坂田华为基地', '覆盖通信设备、云、终端与数字能源等业务的 ICT 企业。', '/assets/company/huawei.png', 'https://www.huawei.com', 1);

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
   '互联网', 'Java后端开发', '上海', 'Java,Spring Boot,MySQL,Redis', '/uploads/demo/resume/wang_backend_resume.pdf', '做过校内管理系统和招聘平台项目，希望从事后端开发岗位。'),
  (2002, 202, '赵同学', 2, '2022001002', '计算机与通信学院', '软件工程', '2022级', '本科',
   '人工智能', '推荐算法工程师', '杭州', 'Python,机器学习,推荐系统,数据分析', '/uploads/demo/resume/zhao_algorithm_resume.pdf', '做过推荐算法课程项目，希望尝试真实业务场景。'),
  (2003, 203, '刘同学', 1, '2022001003', '信息工程学院', '网络工程', '2022级', '本科',
   '云计算', '云平台开发', '杭州', 'Java,Go,Docker,Kubernetes', '/uploads/demo/resume/liu_cloud_resume.pdf', '熟悉容器化部署和服务治理，期望从事云平台与基础设施研发。'),
  (2004, 204, '孙同学', 2, '2022001004', '电子信息学院', '数字媒体技术', '2022级', '本科',
   '互联网', '前端开发工程师', '北京', 'Vue3,TypeScript,Element Plus,工程化', '/uploads/demo/resume/sun_frontend_resume.pdf', '有活动页和管理后台开发经验，关注前端体验与组件设计。'),
  (2005, 205, '黄同学', 1, '2022001005', '自动化学院', '自动化', '2022级', '本科',
   'ICT', '软件开发工程师', '深圳', 'C++,Java,操作系统,网络协议', '/uploads/demo/resume/huang_software_resume.pdf', '做过设备侧软件课程设计，希望进入大型研发团队。');

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
  (5001, 4001, 2001, 1001, '/uploads/demo/resume/wang_backend_resume.pdf', '我有 Java Web 与数据库设计经验，希望从事后端开发岗位。', 89.50, 1,
   '已查看简历，建议补充项目中的接口性能优化细节。', NOW(), NOW()),
  (5002, 4002, 2002, 1002, '/uploads/demo/resume/zhao_algorithm_resume.pdf', '做过推荐算法课程项目，希望尝试真实推荐业务链路。', 92.00, 2,
   '已转入部门面试流程，请继续准备项目复盘。', NOW(), NOW()),
  (5003, 4003, 2003, 1003, '/uploads/demo/resume/liu_cloud_resume.pdf', '熟悉容器编排和服务治理，希望进入云平台研发方向。', 90.00, 0,
   '待校友查看。', NOW(), NULL),
  (5004, 4004, 2004, 1004, '/uploads/demo/resume/sun_frontend_resume.pdf', '有管理后台和活动页开发经历，希望进入前端工程岗位。', 87.00, 4,
   '流程已完成，建议继续跟进正式 offer。', NOW(), NOW()),
  (5005, 4010, 2001, 1002, '/uploads/demo/resume/wang_data_resume.pdf', '我可以补充数据分析、指标拆解和业务汇报相关经历，适配偏数据策略的岗位。', 84.00, 1,
   '已查看补充简历，建议继续突出分析框架和结果表达。', NOW(), NOW()),
  (5006, 4011, 2001, 1003, '/uploads/demo/resume/wang_platform_resume.pdf', '这版简历更突出平台后端、接口治理和稳定性优化经验，适合基础平台研发岗位。', 88.00, 0,
   '等待校友查看平台向版本简历。', NOW(), NULL);

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
