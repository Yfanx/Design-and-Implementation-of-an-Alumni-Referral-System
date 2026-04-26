package cn.iocoder.yudao.module.referral.controller.admin.favorite.vo;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class JobFavoriteToggleRespVO {

    private Boolean favorited;
    private Long favoriteId;
}
