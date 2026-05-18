package cn.iocoder.yudao.module.referral.service.match;

import cn.iocoder.yudao.module.referral.controller.admin.job.vo.JobInfoRespVO;
import cn.iocoder.yudao.module.referral.controller.admin.referral.vo.MatchDimensionRespVO;
import cn.iocoder.yudao.module.referral.dal.dataobject.job.JobInfoDO;
import cn.iocoder.yudao.module.referral.dal.dataobject.student.StudentInfoDO;

import java.math.BigDecimal;
import java.util.List;

public interface JobMatchService {

    JobMatchResult calculate(JobInfoDO job, StudentInfoDO student);

    JobMatchResult calculate(JobInfoRespVO job, StudentInfoDO student);

    record JobMatchResult(BigDecimal matchScore, String matchSummary, List<MatchDimensionRespVO> matchBreakdown) {
    }
}
