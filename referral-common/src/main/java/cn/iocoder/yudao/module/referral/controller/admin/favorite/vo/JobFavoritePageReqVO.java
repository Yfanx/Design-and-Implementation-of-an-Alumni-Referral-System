package cn.iocoder.yudao.module.referral.controller.admin.favorite.vo;

import cn.iocoder.yudao.framework.common.pojo.PageParam;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class JobFavoritePageReqVO extends PageParam {

    private Long studentId;
    private Long jobId;
}
