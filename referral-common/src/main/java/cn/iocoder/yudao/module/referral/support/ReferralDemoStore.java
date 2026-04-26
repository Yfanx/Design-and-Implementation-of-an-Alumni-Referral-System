package cn.iocoder.yudao.module.referral.support;

import cn.iocoder.yudao.module.referral.dal.dataobject.alumni.AlumniInfoDO;
import cn.iocoder.yudao.module.referral.dal.dataobject.auth.AuthAccountDO;
import cn.iocoder.yudao.module.referral.dal.dataobject.company.CompanyInfoDO;
import cn.iocoder.yudao.module.referral.dal.dataobject.consult.ConsultMessageDO;
import cn.iocoder.yudao.module.referral.dal.dataobject.favorite.JobFavoriteDO;
import cn.iocoder.yudao.module.referral.dal.dataobject.job.JobInfoDO;
import cn.iocoder.yudao.module.referral.dal.dataobject.referral.ReferralApplicationDO;
import cn.iocoder.yudao.module.referral.dal.dataobject.student.StudentInfoDO;
import cn.iocoder.yudao.module.referral.enums.JobAuditStatusEnum;
import cn.iocoder.yudao.module.referral.enums.JobStatusEnum;
import cn.iocoder.yudao.module.referral.enums.ReferralApplicationStatusEnum;
import cn.iocoder.yudao.module.referral.enums.UserRoleEnum;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.Resource;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;

@Component
public class ReferralDemoStore {

    private PasswordEncoder passwordEncoder;

    @Resource
    public void setPasswordEncoder(PasswordEncoder passwordEncoder) {
        this.passwordEncoder = passwordEncoder;
    }

    private final AtomicLong alumniIdGenerator = new AtomicLong(1000);
    private final AtomicLong studentIdGenerator = new AtomicLong(2000);
    private final AtomicLong companyIdGenerator = new AtomicLong(3000);
    private final AtomicLong jobIdGenerator = new AtomicLong(4000);
    private final AtomicLong referralIdGenerator = new AtomicLong(5000);
    private final AtomicLong consultIdGenerator = new AtomicLong(6000);
    private final AtomicLong favoriteIdGenerator = new AtomicLong(7000);

    private final Map<Long, AlumniInfoDO> alumniStore = new LinkedHashMap<>();
    private final Map<Long, AuthAccountDO> authAccountStore = new LinkedHashMap<>();
    private final Map<Long, StudentInfoDO> studentStore = new LinkedHashMap<>();
    private final Map<Long, CompanyInfoDO> companyStore = new LinkedHashMap<>();
    private final Map<Long, JobInfoDO> jobStore = new LinkedHashMap<>();
    private final Map<Long, ReferralApplicationDO> referralStore = new LinkedHashMap<>();
    private final Map<Long, ConsultMessageDO> consultStore = new LinkedHashMap<>();
    private final Map<Long, JobFavoriteDO> favoriteStore = new LinkedHashMap<>();

    @PostConstruct
    public void init() {
        seedCompanies();
        seedAlumni();
        seedStudents();
        seedAuthAccounts();
        seedJobs();
        seedReferrals();
        seedConsults();
        seedFavorites();
    }

    public synchronized AuthAccountDO saveAuthAccount(AuthAccountDO account) {
        if (account.getId() == null) {
            account.setId((long) (authAccountStore.size() + 1));
            account.setCreateTime(LocalDateTime.now());
        }
        account.setUpdateTime(LocalDateTime.now());
        authAccountStore.put(account.getId(), account);
        return account;
    }

    public synchronized AlumniInfoDO saveAlumni(AlumniInfoDO alumniInfo) {
        if (alumniInfo.getId() == null) {
            alumniInfo.setId(alumniIdGenerator.incrementAndGet());
            alumniInfo.setCreateTime(LocalDateTime.now());
        }
        alumniInfo.setUpdateTime(LocalDateTime.now());
        alumniStore.put(alumniInfo.getId(), alumniInfo);
        return alumniInfo;
    }

    public synchronized StudentInfoDO saveStudent(StudentInfoDO studentInfo) {
        if (studentInfo.getId() == null) {
            studentInfo.setId(studentIdGenerator.incrementAndGet());
            studentInfo.setCreateTime(LocalDateTime.now());
        }
        studentInfo.setUpdateTime(LocalDateTime.now());
        studentStore.put(studentInfo.getId(), studentInfo);
        return studentInfo;
    }

    public synchronized CompanyInfoDO saveCompany(CompanyInfoDO companyInfo) {
        if (companyInfo.getId() == null) {
            companyInfo.setId(companyIdGenerator.incrementAndGet());
            companyInfo.setCreateTime(LocalDateTime.now());
        }
        companyInfo.setUpdateTime(LocalDateTime.now());
        companyStore.put(companyInfo.getId(), companyInfo);
        return companyInfo;
    }

    public synchronized JobInfoDO saveJob(JobInfoDO jobInfo) {
        if (jobInfo.getId() == null) {
            jobInfo.setId(jobIdGenerator.incrementAndGet());
            jobInfo.setCreateTime(LocalDateTime.now());
        }
        jobInfo.setUpdateTime(LocalDateTime.now());
        jobStore.put(jobInfo.getId(), jobInfo);
        return jobInfo;
    }

    public synchronized ReferralApplicationDO saveReferral(ReferralApplicationDO referralApplication) {
        if (referralApplication.getId() == null) {
            referralApplication.setId(referralIdGenerator.incrementAndGet());
            referralApplication.setCreateTime(LocalDateTime.now());
        }
        referralApplication.setUpdateTime(LocalDateTime.now());
        referralStore.put(referralApplication.getId(), referralApplication);
        return referralApplication;
    }

    public synchronized ConsultMessageDO saveConsult(ConsultMessageDO consultMessage) {
        if (consultMessage.getId() == null) {
            consultMessage.setId(consultIdGenerator.incrementAndGet());
            consultMessage.setCreateTime(LocalDateTime.now());
        }
        consultMessage.setUpdateTime(LocalDateTime.now());
        consultStore.put(consultMessage.getId(), consultMessage);
        return consultMessage;
    }

    public synchronized JobFavoriteDO saveFavorite(JobFavoriteDO favorite) {
        if (favorite.getId() == null) {
            favorite.setId(favoriteIdGenerator.incrementAndGet());
            favorite.setCreateTime(LocalDateTime.now());
        }
        favorite.setUpdateTime(LocalDateTime.now());
        favoriteStore.put(favorite.getId(), favorite);
        return favorite;
    }

    public synchronized void removeFavorite(Long id) {
        favoriteStore.remove(id);
    }

    public synchronized void removeJob(Long id) {
        jobStore.remove(id);
    }

    public synchronized void removeCompany(Long id) {
        companyStore.remove(id);
    }

    public synchronized void removeReferral(Long id) {
        referralStore.remove(id);
    }

    public synchronized void removeConsult(Long id) {
        consultStore.remove(id);
    }

    public List<AlumniInfoDO> listAlumni() {
        return sortByIdDesc(alumniStore);
    }

    public List<StudentInfoDO> listStudents() {
        return sortByIdDesc(studentStore);
    }

    public List<CompanyInfoDO> listCompanies() {
        return sortByIdDesc(companyStore);
    }

    public List<JobInfoDO> listJobs() {
        return sortByIdDesc(jobStore);
    }

    public List<ReferralApplicationDO> listReferrals() {
        return sortByIdDesc(referralStore);
    }

    public List<ConsultMessageDO> listConsults() {
        return sortByIdDesc(consultStore);
    }

    public List<JobFavoriteDO> listFavorites() {
        return sortByIdDesc(favoriteStore);
    }

    public AlumniInfoDO getAlumni(Long id) {
        return alumniStore.get(id);
    }

    public AuthAccountDO getAuthAccount(String username) {
        return authAccountStore.values().stream()
                .filter(a -> a.getUsername().equals(username))
                .findFirst()
                .orElse(null);
    }

    public AuthAccountDO getAuthAccountById(Long id) {
        return authAccountStore.get(id);
    }

    public StudentInfoDO getStudent(Long id) {
        return studentStore.get(id);
    }

    public CompanyInfoDO getCompany(Long id) {
        return companyStore.get(id);
    }

    public JobInfoDO getJob(Long id) {
        return jobStore.get(id);
    }

    public ReferralApplicationDO getReferral(Long id) {
        return referralStore.get(id);
    }

    public ConsultMessageDO getConsult(Long id) {
        return consultStore.get(id);
    }

    public JobFavoriteDO getFavoriteByStudentAndJob(Long studentId, Long jobId) {
        return favoriteStore.values().stream()
                .filter(item -> item.getStudentId().equals(studentId) && item.getJobId().equals(jobId))
                .findFirst()
                .orElse(null);
    }

    private <T> List<T> sortByIdDesc(Map<Long, T> source) {
        return source.entrySet().stream()
                .sorted(Map.Entry.<Long, T>comparingByKey(Comparator.reverseOrder()))
                .map(Map.Entry::getValue)
                .toList();
    }

    private void seedCompanies() {
        CompanyInfoDO company1 = new CompanyInfoDO();
        company1.setCompanyName("华星科技");
        company1.setIndustry("互联网");
        company1.setCompanySize("500-1000人");
        company1.setCity("上海");
        company1.setAddress("浦东新区张江高科技园");
        company1.setCompanyDesc("聚焦校园招聘与企业人力资源数字化。");
        company1.setOfficialWebsite("https://example.com/huaxing");
        company1.setStatus(1);
        saveCompany(company1);

        CompanyInfoDO company2 = new CompanyInfoDO();
        company2.setCompanyName("云拓智能");
        company2.setIndustry("人工智能");
        company2.setCompanySize("100-500人");
        company2.setCity("杭州");
        company2.setAddress("余杭区未来科技城");
        company2.setCompanyDesc("从事企业智能推荐与人才匹配服务。");
        company2.setOfficialWebsite("https://example.com/yuntuo");
        company2.setStatus(1);
        saveCompany(company2);
    }

    private void seedAlumni() {
        AlumniInfoDO alumni1 = new AlumniInfoDO();
        alumni1.setUserId(101L);
        alumni1.setRealName("张学长");
        alumni1.setGender(1);
        alumni1.setGraduationYear(2021);
        alumni1.setCollege("计算机与通信学院");
        alumni1.setMajor("计算机科学与技术");
        alumni1.setCompanyId(3001L);
        alumni1.setCompanyName("华星科技");
        alumni1.setIndustry("互联网");
        alumni1.setPositionName("Java开发工程师");
        alumni1.setCity("上海");
        alumni1.setReferralPermission(1);
        alumni1.setIntro("负责校园招聘技术平台开发。");
        alumni1.setVerifyStatus(1);
        saveAlumni(alumni1);

        AlumniInfoDO alumni2 = new AlumniInfoDO();
        alumni2.setUserId(102L);
        alumni2.setRealName("李学姐");
        alumni2.setGender(2);
        alumni2.setGraduationYear(2020);
        alumni2.setCollege("计算机与通信学院");
        alumni2.setMajor("软件工程");
        alumni2.setCompanyId(3002L);
        alumni2.setCompanyName("云拓智能");
        alumni2.setIndustry("人工智能");
        alumni2.setPositionName("算法工程师");
        alumni2.setCity("杭州");
        alumni2.setReferralPermission(1);
        alumni2.setIntro("从事推荐系统和画像建模。");
        alumni2.setVerifyStatus(1);
        saveAlumni(alumni2);
    }

    private void seedStudents() {
        StudentInfoDO student1 = new StudentInfoDO();
        student1.setUserId(201L);
        student1.setRealName("王同学");
        student1.setGender(1);
        student1.setStudentNo("2022001001");
        student1.setCollege("计算机与通信学院");
        student1.setMajor("计算机科学与技术");
        student1.setGrade("22级");
        student1.setEducation("本科");
        student1.setExpectedIndustry("互联网");
        student1.setExpectedJob("Java开发");
        student1.setExpectedCity("上海");
        student1.setSkillTags("Java,Spring Boot,MySQL");
        student1.setResumeUrl("/uploads/demo/resume/wang.pdf");
        student1.setIntro("希望从事后端开发岗位。");
        saveStudent(student1);

        StudentInfoDO student2 = new StudentInfoDO();
        student2.setUserId(202L);
        student2.setRealName("赵同学");
        student2.setGender(2);
        student2.setStudentNo("2022001002");
        student2.setCollege("计算机与通信学院");
        student2.setMajor("软件工程");
        student2.setGrade("22级");
        student2.setEducation("本科");
        student2.setExpectedIndustry("人工智能");
        student2.setExpectedJob("算法工程师");
        student2.setExpectedCity("杭州");
        student2.setSkillTags("Python,机器学习,数据分析");
        student2.setResumeUrl("/uploads/demo/resume/zhao.pdf");
        student2.setIntro("希望从事推荐算法和数据分析相关工作。");
        saveStudent(student2);
    }

    private void seedAuthAccounts() {
        saveAuthAccount(makeAccount("admin", "admin123", "ADMIN", 1L, 1L));
        saveAuthAccount(makeAccount("alumni", "alumni123", "ALUMNI", 101L, 1001L));
        saveAuthAccount(makeAccount("student", "student123", "STUDENT", 201L, 2001L));
    }

    private AuthAccountDO makeAccount(String username, String password, String role, Long userId, Long profileId) {
        AuthAccountDO account = new AuthAccountDO();
        account.setUsername(username);
        account.setPassword(passwordEncoder.encode(password));
        account.setRole(role);
        account.setUserId(userId);
        account.setProfileId(profileId);
        return account;
    }

    private void seedJobs() {
        JobInfoDO job1 = new JobInfoDO();
        job1.setAlumniId(1001L);
        job1.setCompanyId(3001L);
        job1.setJobTitle("Java后端开发实习生");
        job1.setJobType("实习");
        job1.setIndustry("互联网");
        job1.setCity("上海");
        job1.setSalaryRange("150-200元/天");
        job1.setEducationRequirement("本科");
        job1.setExperienceRequirement("熟悉Spring Boot");
        job1.setSkillRequirement("Java,MySQL,Redis");
        job1.setJobDesc("参与招聘平台后端接口开发。");
        job1.setContactType("站内联系");
        job1.setReferralQuota(2);
        job1.setStatus(JobStatusEnum.PUBLISHED.getStatus());
        job1.setAuditStatus(JobAuditStatusEnum.APPROVED.getStatus());
        job1.setPublishTime(LocalDateTime.now().minusDays(3));
        job1.setExpireTime(LocalDateTime.now().plusDays(20));
        saveJob(job1);

        JobInfoDO job2 = new JobInfoDO();
        job2.setAlumniId(1002L);
        job2.setCompanyId(3002L);
        job2.setJobTitle("推荐算法工程师");
        job2.setJobType("校招");
        job2.setIndustry("人工智能");
        job2.setCity("杭州");
        job2.setSalaryRange("18k-25k");
        job2.setEducationRequirement("本科及以上");
        job2.setExperienceRequirement("有机器学习项目经验");
        job2.setSkillRequirement("Python,机器学习,推荐系统");
        job2.setJobDesc("参与人才匹配推荐模块设计。");
        job2.setContactType("邮箱");
        job2.setReferralQuota(3);
        job2.setStatus(JobStatusEnum.PUBLISHED.getStatus());
        job2.setAuditStatus(JobAuditStatusEnum.APPROVED.getStatus());
        job2.setPublishTime(LocalDateTime.now().minusDays(5));
        job2.setExpireTime(LocalDateTime.now().plusDays(15));
        saveJob(job2);

        JobInfoDO job3 = new JobInfoDO();
        job3.setAlumniId(1001L);
        job3.setCompanyId(3001L);
        job3.setJobTitle("前端开发工程师");
        job3.setJobType("校招");
        job3.setIndustry("互联网");
        job3.setCity("上海");
        job3.setSalaryRange("14k-20k");
        job3.setEducationRequirement("本科");
        job3.setExperienceRequirement("熟悉Vue3");
        job3.setSkillRequirement("Vue3,TypeScript,Element Plus");
        job3.setJobDesc("负责管理后台与可视化页面。");
        job3.setContactType("站内联系");
        job3.setReferralQuota(1);
        job3.setStatus(JobStatusEnum.PENDING.getStatus());
        job3.setAuditStatus(JobAuditStatusEnum.WAITING.getStatus());
        job3.setPublishTime(LocalDateTime.now().minusDays(1));
        job3.setExpireTime(LocalDateTime.now().plusDays(12));
        saveJob(job3);
    }

    private void seedReferrals() {
        ReferralApplicationDO referral1 = new ReferralApplicationDO();
        referral1.setJobId(4001L);
        referral1.setStudentId(2001L);
        referral1.setAlumniId(1001L);
        referral1.setResumeUrl("/uploads/demo/resume/wang.pdf");
        referral1.setSelfIntroduction("有 Java Web 项目经验，希望加入后端开发团队。");
        referral1.setMatchScore(new java.math.BigDecimal("88.50"));
        referral1.setApplyStatus(ReferralApplicationStatusEnum.VIEWED.getStatus());
        referral1.setProcessRemark("已查看简历，等待进一步沟通。");
        referral1.setApplyTime(LocalDateTime.now().minusDays(2));
        referral1.setProcessTime(LocalDateTime.now().minusDays(1));
        saveReferral(referral1);

        ReferralApplicationDO referral2 = new ReferralApplicationDO();
        referral2.setJobId(4002L);
        referral2.setStudentId(2002L);
        referral2.setAlumniId(1002L);
        referral2.setResumeUrl("/uploads/demo/resume/zhao.pdf");
        referral2.setSelfIntroduction("做过推荐算法课程项目，希望尝试真实业务场景。");
        referral2.setMatchScore(new java.math.BigDecimal("92.00"));
        referral2.setApplyStatus(ReferralApplicationStatusEnum.REFERRED.getStatus());
        referral2.setProcessRemark("已转交用人部门。");
        referral2.setApplyTime(LocalDateTime.now().minusDays(4));
        referral2.setProcessTime(LocalDateTime.now().minusDays(2));
        saveReferral(referral2);
    }

    private void seedConsults() {
        ConsultMessageDO consult1 = new ConsultMessageDO();
        consult1.setJobId(4001L);
        consult1.setSenderUserId(201L);
        consult1.setReceiverUserId(101L);
        consult1.setSenderRole(UserRoleEnum.STUDENT.getRole());
        consult1.setReceiverRole(UserRoleEnum.ALUMNI.getRole());
        consult1.setContent("学长您好，请问这个岗位对实习时长有要求吗？");
        consult1.setReadStatus(1);
        consult1.setSendTime(LocalDateTime.now().minusHours(10));
        saveConsult(consult1);

        ConsultMessageDO consult2 = new ConsultMessageDO();
        consult2.setJobId(4001L);
        consult2.setSenderUserId(101L);
        consult2.setReceiverUserId(201L);
        consult2.setSenderRole(UserRoleEnum.ALUMNI.getRole());
        consult2.setReceiverRole(UserRoleEnum.STUDENT.getRole());
        consult2.setContent("建议至少保证 3 个月，每周到岗 4 天以上。");
        consult2.setReadStatus(1);
        consult2.setSendTime(LocalDateTime.now().minusHours(9));
        saveConsult(consult2);
    }

    private void seedFavorites() {
        JobFavoriteDO favorite = new JobFavoriteDO();
        favorite.setStudentId(2001L);
        favorite.setJobId(4001L);
        saveFavorite(favorite);
    }

    public List<Map.Entry<String, Long>> countByIndustry() {
        Map<String, Long> result = new LinkedHashMap<>();
        for (CompanyInfoDO company : companyStore.values()) {
            result.merge(company.getIndustry(), 1L, Long::sum);
        }
        return new ArrayList<>(result.entrySet());
    }

    public List<Map.Entry<String, Long>> countByCity() {
        Map<String, Long> result = new LinkedHashMap<>();
        for (JobInfoDO job : jobStore.values()) {
            result.merge(job.getCity(), 1L, Long::sum);
        }
        return new ArrayList<>(result.entrySet());
    }

    public List<Map.Entry<String, Long>> countHotJobs() {
        Map<String, Long> result = new LinkedHashMap<>();
        for (ReferralApplicationDO referral : referralStore.values()) {
            JobInfoDO job = jobStore.get(referral.getJobId());
            if (job != null) {
                result.merge(job.getJobTitle(), 1L, Long::sum);
            }
        }
        return result.entrySet().stream()
                .sorted((a, b) -> Long.compare(b.getValue(), a.getValue()))
                .toList();
    }
}
