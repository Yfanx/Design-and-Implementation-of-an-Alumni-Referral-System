package cn.iocoder.yudao.module.referral.controller.admin.referral;

import cn.iocoder.yudao.framework.common.pojo.CommonResult;
import cn.iocoder.yudao.framework.common.pojo.PageResult;
import cn.iocoder.yudao.module.referral.controller.admin.referral.vo.ReferralApplicationCreateReqVO;
import cn.iocoder.yudao.module.referral.controller.admin.referral.vo.ReferralApplicationPageReqVO;
import cn.iocoder.yudao.module.referral.controller.admin.referral.vo.ReferralApplicationRespVO;
import cn.iocoder.yudao.module.referral.controller.admin.referral.vo.ReferralApplicationUpdateStatusReqVO;
import cn.iocoder.yudao.module.referral.service.referral.ReferralApplicationService;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.*;

import jakarta.annotation.Resource;

import static cn.iocoder.yudao.framework.common.pojo.CommonResult.success;

@RestController
@RequestMapping("/referral/referral-application")
public class ReferralApplicationController {

    @Resource
    private ReferralApplicationService referralApplicationService;

    @PostMapping("/create")
    public CommonResult<Long> create(@RequestBody ReferralApplicationCreateReqVO createReqVO) {
        return success(referralApplicationService.createReferralApplication(createReqVO));
    }

    @GetMapping("/get")
    public CommonResult<ReferralApplicationRespVO> get(@RequestParam("id") Long id) {
        return success(referralApplicationService.getReferralApplication(id));
    }

    @GetMapping("/list")
    public CommonResult<PageResult<ReferralApplicationRespVO>> list(ReferralApplicationPageReqVO pageReqVO) {
        return success(referralApplicationService.getReferralApplicationPage(pageReqVO));
    }

    @PostMapping("/process")
    public CommonResult<Boolean> process(@RequestBody ReferralApplicationUpdateStatusReqVO updateReqVO) {
        referralApplicationService.processReferralApplication(updateReqVO);
        return success(true);
    }

    @PostMapping("/push")
    public CommonResult<Boolean> push(@RequestBody ReferralApplicationUpdateStatusReqVO updateReqVO) {
        referralApplicationService.pushReferralApplication(updateReqVO);
        return success(true);
    }

    @DeleteMapping("/delete")
    public CommonResult<Boolean> delete(@RequestParam("id") Long id) {
        referralApplicationService.deleteReferralApplication(id);
        return success(true);
    }

    @PostMapping("/cancel")
    public CommonResult<Boolean> cancel(@RequestParam("id") Long id) {
        referralApplicationService.cancelReferralApplication(id);
        return success(true);
    }
}
