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
