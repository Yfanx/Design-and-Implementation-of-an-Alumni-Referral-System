package cn.iocoder.yudao.module.referral.service.consult;

import cn.iocoder.yudao.framework.common.pojo.PageResult;
import cn.iocoder.yudao.module.referral.controller.admin.consult.vo.ConsultMessagePageReqVO;
import cn.iocoder.yudao.module.referral.controller.admin.consult.vo.ConsultMessageRespVO;
import cn.iocoder.yudao.module.referral.controller.admin.consult.vo.ConsultMessageSendReqVO;

public interface ConsultMessageService {

    Long sendConsultMessage(ConsultMessageSendReqVO sendReqVO);

    PageResult<ConsultMessageRespVO> getConsultMessagePage(ConsultMessagePageReqVO pageReqVO);

    void deleteConsultMessage(Long id);

    void markAsRead(Long id);
}
