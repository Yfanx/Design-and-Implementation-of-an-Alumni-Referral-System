package cn.iocoder.yudao.module.referral.controller.admin.referral.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MatchDimensionRespVO {

    private String key;
    private String label;
    private Integer score;
    private String reason;
}
