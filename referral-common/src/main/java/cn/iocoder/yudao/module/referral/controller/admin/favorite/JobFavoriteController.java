package cn.iocoder.yudao.module.referral.controller.admin.favorite;

import cn.iocoder.yudao.framework.common.pojo.CommonResult;
import cn.iocoder.yudao.framework.common.pojo.PageResult;
import cn.iocoder.yudao.module.referral.controller.admin.favorite.vo.JobFavoritePageReqVO;
import cn.iocoder.yudao.module.referral.controller.admin.favorite.vo.JobFavoriteRespVO;
import cn.iocoder.yudao.module.referral.controller.admin.favorite.vo.JobFavoriteToggleReqVO;
import cn.iocoder.yudao.module.referral.controller.admin.favorite.vo.JobFavoriteToggleRespVO;
import cn.iocoder.yudao.module.referral.service.favorite.JobFavoriteService;
import jakarta.annotation.Resource;
import org.springframework.web.bind.annotation.*;

import static cn.iocoder.yudao.framework.common.pojo.CommonResult.success;

@RestController
@RequestMapping("/referral/job-favorite")
public class JobFavoriteController {

    @Resource
    private JobFavoriteService jobFavoriteService;

    @PostMapping("/toggle")
    public CommonResult<JobFavoriteToggleRespVO> toggle(@RequestBody JobFavoriteToggleReqVO reqVO) {
        return success(jobFavoriteService.toggleFavorite(reqVO));
    }

    @GetMapping("/list")
    public CommonResult<PageResult<JobFavoriteRespVO>> list(JobFavoritePageReqVO pageReqVO) {
        return success(jobFavoriteService.getFavoritePage(pageReqVO));
    }
}
