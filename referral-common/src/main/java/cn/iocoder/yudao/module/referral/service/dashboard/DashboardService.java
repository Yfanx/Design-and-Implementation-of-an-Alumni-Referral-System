package cn.iocoder.yudao.module.referral.service.dashboard;

import cn.iocoder.yudao.module.referral.controller.admin.dashboard.vo.ApplicationTrendRespVO;
import cn.iocoder.yudao.module.referral.controller.admin.dashboard.vo.CityDistributionRespVO;
import cn.iocoder.yudao.module.referral.controller.admin.dashboard.vo.HotJobRespVO;
import cn.iocoder.yudao.module.referral.controller.admin.dashboard.vo.IndustryDistributionRespVO;
import cn.iocoder.yudao.module.referral.controller.admin.dashboard.vo.ReferralOverviewRespVO;

import java.util.List;

public interface DashboardService {

    ReferralOverviewRespVO getReferralOverview();

    List<IndustryDistributionRespVO> getIndustryDistribution();

    List<CityDistributionRespVO> getCityDistribution();

    List<HotJobRespVO> getHotJobs();

    List<ApplicationTrendRespVO> getApplicationTrend();
}
