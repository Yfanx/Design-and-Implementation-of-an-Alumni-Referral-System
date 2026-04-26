package cn.iocoder.yudao.module.referral.controller.app.file;

import cn.iocoder.yudao.framework.common.pojo.CommonResult;
import cn.iocoder.yudao.module.referral.controller.app.file.vo.ReferralFilePreviewRespVO;
import cn.iocoder.yudao.module.referral.controller.app.file.vo.ReferralFileUploadRespVO;
import cn.iocoder.yudao.module.referral.service.file.ReferralFileService;
import jakarta.annotation.Resource;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import static cn.iocoder.yudao.framework.common.pojo.CommonResult.success;

@RestController
@RequestMapping("/referral/file")
public class ReferralFileController {

    @Resource
    private ReferralFileService referralFileService;

    @PostMapping("/upload")
    public CommonResult<ReferralFileUploadRespVO> upload(@RequestParam("file") MultipartFile file,
                                                         @RequestParam(value = "category", required = false) String category) {
        return success(referralFileService.uploadFile(file, category));
    }

    @GetMapping("/preview-content")
    public CommonResult<ReferralFilePreviewRespVO> previewContent(@RequestParam("url") String fileUrl) {
        return success(referralFileService.getPreviewContent(fileUrl));
    }
}
