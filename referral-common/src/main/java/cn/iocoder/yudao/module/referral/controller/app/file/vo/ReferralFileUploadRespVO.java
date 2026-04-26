package cn.iocoder.yudao.module.referral.controller.app.file.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReferralFileUploadRespVO {

    private String fileName;
    private String originalFileName;
    private String contentType;
    private Long size;
    private String url;
    private String previewType;
}
