package cn.iocoder.yudao.module.referral.service.favorite;

import cn.iocoder.yudao.framework.common.pojo.PageResult;
import cn.iocoder.yudao.module.referral.controller.admin.favorite.vo.JobFavoritePageReqVO;
import cn.iocoder.yudao.module.referral.controller.admin.favorite.vo.JobFavoriteRespVO;
import cn.iocoder.yudao.module.referral.controller.admin.favorite.vo.JobFavoriteToggleReqVO;
import cn.iocoder.yudao.module.referral.controller.admin.favorite.vo.JobFavoriteToggleRespVO;

public interface JobFavoriteService {

    JobFavoriteToggleRespVO toggleFavorite(JobFavoriteToggleReqVO reqVO);

    PageResult<JobFavoriteRespVO> getFavoritePage(JobFavoritePageReqVO pageReqVO);
}
