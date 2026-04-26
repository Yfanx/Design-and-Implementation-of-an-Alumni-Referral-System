package cn.iocoder.yudao.module.referral.controller.admin.consult;

import cn.iocoder.yudao.framework.common.pojo.CommonResult;
import cn.iocoder.yudao.framework.common.pojo.PageResult;
import cn.iocoder.yudao.module.referral.controller.admin.consult.vo.ConsultMessagePageReqVO;
import cn.iocoder.yudao.module.referral.controller.admin.consult.vo.ConsultMessageRespVO;
import cn.iocoder.yudao.module.referral.controller.admin.consult.vo.ConsultMessageSendReqVO;
import cn.iocoder.yudao.module.referral.service.consult.ConsultMessageService;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.*;

import jakarta.annotation.Resource;

import static cn.iocoder.yudao.framework.common.pojo.CommonResult.success;

@RestController
@RequestMapping("/referral/consult-message")
public class ConsultMessageController {

    @Resource
    private ConsultMessageService consultMessageService;

    @PostMapping("/send")
    public CommonResult<Long> send(@RequestBody ConsultMessageSendReqVO sendReqVO) {
        return success(consultMessageService.sendConsultMessage(sendReqVO));
    }

    @GetMapping("/list")
    public CommonResult<PageResult<ConsultMessageRespVO>> list(ConsultMessagePageReqVO pageReqVO) {
        return success(consultMessageService.getConsultMessagePage(pageReqVO));
    }

    @DeleteMapping("/delete")
    public CommonResult<Boolean> delete(@RequestParam("id") Long id) {
        consultMessageService.deleteConsultMessage(id);
        return success(true);
    }

    @PutMapping("/mark-read")
    public CommonResult<Boolean> markRead(@RequestParam("id") Long id) {
        consultMessageService.markAsRead(id);
        return success(true);
    }
}
