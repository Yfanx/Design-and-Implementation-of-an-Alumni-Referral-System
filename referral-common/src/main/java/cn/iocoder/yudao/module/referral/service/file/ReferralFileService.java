package cn.iocoder.yudao.module.referral.service.file;

import cn.iocoder.yudao.module.referral.controller.app.file.vo.ReferralFileUploadRespVO;
import cn.iocoder.yudao.module.referral.controller.app.file.vo.ReferralFilePreviewRespVO;
import org.springframework.web.multipart.MultipartFile;

public interface ReferralFileService {

    ReferralFileUploadRespVO uploadFile(MultipartFile file, String category);

    ReferralFilePreviewRespVO getPreviewContent(String fileUrl);
}
