package cn.iocoder.yudao.module.referral.controller.admin.favorite.vo;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class JobFavoriteToggleReqVO {

    @NotNull
    private Long studentId;

    @NotNull
    private Long jobId;
}
