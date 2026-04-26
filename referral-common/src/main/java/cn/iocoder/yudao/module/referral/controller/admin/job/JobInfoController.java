package cn.iocoder.yudao.module.referral.controller.admin.job;

import cn.iocoder.yudao.framework.common.pojo.CommonResult;
import cn.iocoder.yudao.framework.common.pojo.PageResult;
import cn.iocoder.yudao.module.referral.controller.admin.job.vo.JobInfoCreateReqVO;
import cn.iocoder.yudao.module.referral.controller.admin.job.vo.JobInfoMatchPageReqVO;
import cn.iocoder.yudao.module.referral.controller.admin.job.vo.JobInfoPageReqVO;
import cn.iocoder.yudao.module.referral.controller.admin.job.vo.JobInfoRespVO;
import cn.iocoder.yudao.module.referral.controller.admin.job.vo.JobInfoUpdateReqVO;
import cn.iocoder.yudao.module.referral.service.job.JobInfoService;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.*;

import jakarta.annotation.Resource;

import static cn.iocoder.yudao.framework.common.pojo.CommonResult.success;

@RestController
@RequestMapping("/referral/job-info")
public class JobInfoController {

    @Resource
    private JobInfoService jobInfoService;

    @PostMapping("/create")
    public CommonResult<Long> create(@RequestBody JobInfoCreateReqVO createReqVO) {
        return success(jobInfoService.createJobInfo(createReqVO));
    }

    @PutMapping("/update")
    public CommonResult<Boolean> update(@RequestBody JobInfoUpdateReqVO updateReqVO) {
        jobInfoService.updateJobInfo(updateReqVO);
        return success(true);
    }

    @GetMapping("/get")
    public CommonResult<JobInfoRespVO> get(@RequestParam("id") Long id) {
        return success(jobInfoService.getJobInfo(id));
    }

    @GetMapping("/list")
    public CommonResult<PageResult<JobInfoRespVO>> list(JobInfoPageReqVO pageReqVO) {
        return success(jobInfoService.getJobInfoPage(pageReqVO));
    }

    @PostMapping("/audit")
    public CommonResult<Boolean> audit(@RequestParam("id") Long id,
                                       @RequestParam("auditStatus") Integer auditStatus) {
        jobInfoService.auditJobInfo(id, auditStatus);
        return success(true);
    }

    @GetMapping("/match-list")
    public CommonResult<PageResult<JobInfoRespVO>> matchList(JobInfoMatchPageReqVO pageReqVO) {
        return success(jobInfoService.getJobMatchPage(pageReqVO));
    }

    @DeleteMapping("/delete")
    public CommonResult<Boolean> delete(@RequestParam("id") Long id) {
        jobInfoService.deleteJobInfo(id);
        return success(true);
    }
}
