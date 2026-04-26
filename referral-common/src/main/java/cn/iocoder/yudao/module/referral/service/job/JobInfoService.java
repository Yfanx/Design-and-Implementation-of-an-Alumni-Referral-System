package cn.iocoder.yudao.module.referral.service.job;

import cn.iocoder.yudao.framework.common.pojo.PageResult;
import cn.iocoder.yudao.module.referral.controller.admin.job.vo.JobInfoCreateReqVO;
import cn.iocoder.yudao.module.referral.controller.admin.job.vo.JobInfoMatchPageReqVO;
import cn.iocoder.yudao.module.referral.controller.admin.job.vo.JobInfoPageReqVO;
import cn.iocoder.yudao.module.referral.controller.admin.job.vo.JobInfoRespVO;
import cn.iocoder.yudao.module.referral.controller.admin.job.vo.JobInfoUpdateReqVO;

public interface JobInfoService {

    Long createJobInfo(JobInfoCreateReqVO createReqVO);

    void updateJobInfo(JobInfoUpdateReqVO updateReqVO);

    JobInfoRespVO getJobInfo(Long id);

    PageResult<JobInfoRespVO> getJobInfoPage(JobInfoPageReqVO pageReqVO);

    void auditJobInfo(Long id, Integer auditStatus);

    PageResult<JobInfoRespVO> getJobMatchPage(JobInfoMatchPageReqVO pageReqVO);

    void deleteJobInfo(Long id);
}
