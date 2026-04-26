package cn.iocoder.yudao.module.referral.controller.admin.dashboard;

import cn.iocoder.yudao.framework.common.pojo.CommonResult;
import cn.iocoder.yudao.module.referral.controller.admin.dashboard.vo.ApplicationTrendRespVO;
import cn.iocoder.yudao.module.referral.controller.admin.dashboard.vo.CityDistributionRespVO;
import cn.iocoder.yudao.module.referral.controller.admin.dashboard.vo.HotJobRespVO;
import cn.iocoder.yudao.module.referral.controller.admin.dashboard.vo.IndustryDistributionRespVO;
import cn.iocoder.yudao.module.referral.controller.admin.dashboard.vo.ReferralOverviewRespVO;
import cn.iocoder.yudao.module.referral.service.dashboard.DashboardService;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.GetMapping;

import jakarta.annotation.Resource;

import java.util.List;

import static cn.iocoder.yudao.framework.common.pojo.CommonResult.success;

@RestController
@RequestMapping("/referral/dashboard")
public class DashboardController {

    @Resource
    private DashboardService dashboardService;

    @GetMapping("/overview")
    public CommonResult<ReferralOverviewRespVO> overview() {
        return success(dashboardService.getReferralOverview());
    }

    @GetMapping("/industry-distribution")
    public CommonResult<List<IndustryDistributionRespVO>> industryDistribution() {
        return success(dashboardService.getIndustryDistribution());
    }

    @GetMapping("/city-distribution")
    public CommonResult<List<CityDistributionRespVO>> cityDistribution() {
        return success(dashboardService.getCityDistribution());
    }

    @GetMapping("/hot-jobs")
    public CommonResult<List<HotJobRespVO>> hotJobs() {
        return success(dashboardService.getHotJobs());
    }

    @GetMapping("/application-trend")
    public CommonResult<List<ApplicationTrendRespVO>> applicationTrend() {
        return success(dashboardService.getApplicationTrend());
    }
}
