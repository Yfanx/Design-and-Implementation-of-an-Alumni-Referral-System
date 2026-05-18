package cn.iocoder.yudao.module.referral.service.match;

import cn.iocoder.yudao.module.referral.controller.admin.job.vo.JobInfoRespVO;
import cn.iocoder.yudao.module.referral.controller.admin.referral.vo.MatchDimensionRespVO;
import cn.iocoder.yudao.module.referral.dal.dataobject.job.JobInfoDO;
import cn.iocoder.yudao.module.referral.dal.dataobject.student.StudentInfoDO;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

@Service
public class JobMatchServiceImpl implements JobMatchService {

    private static final BigDecimal INDUSTRY_WEIGHT = BigDecimal.valueOf(0.22D);
    private static final BigDecimal JOB_WEIGHT = BigDecimal.valueOf(0.28D);
    private static final BigDecimal CITY_WEIGHT = BigDecimal.valueOf(0.20D);
    private static final BigDecimal EDUCATION_WEIGHT = BigDecimal.valueOf(0.12D);
    private static final BigDecimal SKILL_WEIGHT = BigDecimal.valueOf(0.18D);
    private static final Pattern SPLIT_PATTERN = Pattern.compile("[,，/|｜、\\s]+");

    @Override
    public JobMatchResult calculate(JobInfoDO job, StudentInfoDO student) {
        if (job == null || student == null) {
            return emptyResult();
        }
        return calculateInternal(
                job.getIndustry(),
                job.getJobTitle(),
                job.getJobType(),
                job.getCity(),
                job.getEducationRequirement(),
                job.getSkillRequirement(),
                student);
    }

    @Override
    public JobMatchResult calculate(JobInfoRespVO job, StudentInfoDO student) {
        if (job == null || student == null) {
            return emptyResult();
        }
        return calculateInternal(
                job.getIndustry(),
                job.getJobTitle(),
                job.getJobType(),
                job.getCity(),
                job.getEducationRequirement(),
                job.getSkillRequirement(),
                student);
    }

    private JobMatchResult calculateInternal(String industry,
                                             String jobTitle,
                                             String jobType,
                                             String city,
                                             String educationRequirement,
                                             String skillRequirement,
                                             StudentInfoDO student) {
        List<MatchDimensionRespVO> breakdown = new ArrayList<>();

        int industryScore = scoreIndustry(student.getExpectedIndustry(), industry);
        breakdown.add(new MatchDimensionRespVO("industry", "期望行业", industryScore,
                explainContains(student.getExpectedIndustry(), industry, "行业方向高度贴合", "行业有一定重合", "行业跨度较大")));

        int jobScore = scoreJob(student.getExpectedJob(), jobTitle, jobType);
        breakdown.add(new MatchDimensionRespVO("job", "期望岗位", jobScore,
                explainContains(student.getExpectedJob(), join(jobTitle, jobType), "岗位方向高度贴合", "岗位关键词部分重合", "岗位方向偏差较大")));

        int cityScore = scoreCity(student.getExpectedCity(), city);
        breakdown.add(new MatchDimensionRespVO("city", "期望城市", cityScore,
                explainContains(student.getExpectedCity(), city, "工作城市完全匹配", "城市偏好部分匹配", "城市与当前偏好不一致")));

        int educationScore = scoreEducation(student.getEducation(), educationRequirement);
        breakdown.add(new MatchDimensionRespVO("education", "学历要求", educationScore,
                explainEducation(student.getEducation(), educationRequirement, educationScore)));

        int skillScore = scoreSkill(student.getSkillTags(), skillRequirement);
        breakdown.add(new MatchDimensionRespVO("skill", "技能标签", skillScore,
                explainSkill(student.getSkillTags(), skillRequirement, skillScore)));

        BigDecimal total = BigDecimal.valueOf(industryScore).multiply(INDUSTRY_WEIGHT)
                .add(BigDecimal.valueOf(jobScore).multiply(JOB_WEIGHT))
                .add(BigDecimal.valueOf(cityScore).multiply(CITY_WEIGHT))
                .add(BigDecimal.valueOf(educationScore).multiply(EDUCATION_WEIGHT))
                .add(BigDecimal.valueOf(skillScore).multiply(SKILL_WEIGHT))
                .setScale(2, RoundingMode.HALF_UP);

        return new JobMatchResult(total, buildSummary(breakdown), breakdown);
    }

    private JobMatchResult emptyResult() {
        return new JobMatchResult(BigDecimal.ZERO, "等待补充学生画像后生成匹配解释", List.of(
                new MatchDimensionRespVO("industry", "期望行业", 0, "缺少学生画像"),
                new MatchDimensionRespVO("job", "期望岗位", 0, "缺少学生画像"),
                new MatchDimensionRespVO("city", "期望城市", 0, "缺少学生画像"),
                new MatchDimensionRespVO("education", "学历要求", 0, "缺少学生画像"),
                new MatchDimensionRespVO("skill", "技能标签", 0, "缺少学生画像")
        ));
    }

    private int scoreIndustry(String expectedIndustry, String industry) {
        return scoreContains(expectedIndustry, industry, 100, 70, 28, 52);
    }

    private int scoreJob(String expectedJob, String jobTitle, String jobType) {
        return scoreContains(expectedJob, join(jobTitle, jobType), 100, 72, 30, 50);
    }

    private int scoreCity(String expectedCity, String city) {
        return scoreContains(expectedCity, city, 100, 76, 24, 55);
    }

    private int scoreEducation(String studentEducation, String requirement) {
        if (isBlank(studentEducation) || isBlank(requirement)) {
            return 60;
        }
        int studentRank = educationRank(studentEducation);
        int jobRank = educationRank(requirement);
        if (studentRank <= 0 || jobRank <= 0) {
            return containsIgnoreCase(studentEducation, requirement) || containsIgnoreCase(requirement, studentEducation) ? 92 : 58;
        }
        if (studentRank >= jobRank) {
            return 100;
        }
        if (jobRank - studentRank == 1) {
            return 58;
        }
        return 25;
    }

    private int scoreSkill(String studentSkills, String jobSkills) {
        Set<String> left = tokenize(studentSkills);
        Set<String> right = tokenize(jobSkills);
        if (left.isEmpty() || right.isEmpty()) {
            return 55;
        }
        long overlap = left.stream().filter(right::contains).count();
        if (overlap == 0) {
            return 26;
        }
        double ratio = (double) overlap / (double) right.size();
        int score = (int) Math.round(45D + ratio * 55D);
        return Math.max(30, Math.min(100, score));
    }

    private int scoreContains(String expected, String actual, int exactScore, int overlapScore, int mismatchScore, int missingScore) {
        if (isBlank(expected) || isBlank(actual)) {
            return missingScore;
        }
        String left = normalize(expected);
        String right = normalize(actual);
        if (left.equals(right) || right.contains(left) || left.contains(right)) {
            return exactScore;
        }
        Set<String> leftTokens = tokenize(left);
        Set<String> rightTokens = tokenize(right);
        if (!leftTokens.isEmpty() && leftTokens.stream().anyMatch(rightTokens::contains)) {
            return overlapScore;
        }
        return mismatchScore;
    }

    private String buildSummary(List<MatchDimensionRespVO> breakdown) {
        List<MatchDimensionRespVO> strongest = breakdown.stream()
                .sorted(Comparator.comparingInt(MatchDimensionRespVO::getScore).reversed())
                .limit(2)
                .toList();
        if (strongest.isEmpty()) {
            return "匹配解释暂不可用";
        }
        if (strongest.stream().allMatch(item -> item.getScore() >= 80)) {
            return strongest.get(0).getLabel() + "、" + strongest.get(1).getLabel() + "高度匹配";
        }
        if (strongest.get(0).getScore() >= 70) {
            return strongest.get(0).getLabel() + "优势明显，可优先关注";
        }
        return "建议先结合技能与城市偏好综合判断";
    }

    private String explainContains(String expected, String actual, String exact, String overlap, String mismatch) {
        if (isBlank(expected) || isBlank(actual)) {
            return "任一侧信息缺失，采用中性评分";
        }
        String left = normalize(expected);
        String right = normalize(actual);
        if (left.equals(right) || right.contains(left) || left.contains(right)) {
            return exact;
        }
        Set<String> leftTokens = tokenize(left);
        Set<String> rightTokens = tokenize(right);
        return leftTokens.stream().anyMatch(rightTokens::contains) ? overlap : mismatch;
    }

    private String explainEducation(String studentEducation, String requirement, int score) {
        if (isBlank(studentEducation) || isBlank(requirement)) {
            return "学历信息不完整，采用中性评分";
        }
        if (score >= 100) {
            return "学历达到或超过岗位要求";
        }
        if (score >= 58) {
            return "学历接近岗位要求，仍可尝试投递";
        }
        return "学历与岗位要求差距较大";
    }

    private String explainSkill(String studentSkills, String jobSkills, int score) {
        if (isBlank(studentSkills) || isBlank(jobSkills)) {
            return "技能标签不完整，采用中性评分";
        }
        if (score >= 85) {
            return "核心技能与岗位要求重合度高";
        }
        if (score >= 60) {
            return "部分技能已覆盖，仍有补强空间";
        }
        return "技能交集有限，建议谨慎投递";
    }

    private int educationRank(String education) {
        String value = normalize(education);
        if (value.contains("博士")) {
            return 4;
        }
        if (value.contains("硕士") || value.contains("研究生")) {
            return 3;
        }
        if (value.contains("本科")) {
            return 2;
        }
        if (value.contains("专科")) {
            return 1;
        }
        return 0;
    }

    private Set<String> tokenize(String value) {
        if (isBlank(value)) {
            return Set.of();
        }
        return Arrays.stream(SPLIT_PATTERN.split(normalize(value)))
                .map(String::trim)
                .filter(item -> !item.isBlank())
                .collect(LinkedHashSet::new, Set::add, Set::addAll);
    }

    private String join(String first, String second) {
        return (first == null ? "" : first) + " " + (second == null ? "" : second);
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private boolean containsIgnoreCase(String left, String right) {
        return normalize(left).contains(normalize(right));
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
