package cn.iocoder.yudao.module.referral.controller.admin.favorite.vo;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class JobFavoriteRespVO {

    private Long id;
    private Long studentId;
    private Long jobId;
    private LocalDateTime createTime;
}
