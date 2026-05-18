package cn.iocoder.yudao.module.referral.controller.admin.dashboard.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AlumniProcessingTrendRespVO {

    private String label;
    private Long receivedCount;
    private Long viewedCount;
    private Long referredCount;
    private Long finishedCount;
}
