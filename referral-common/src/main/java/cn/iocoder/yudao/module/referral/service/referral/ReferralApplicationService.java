package cn.iocoder.yudao.module.referral.service.referral;

import cn.iocoder.yudao.framework.common.pojo.PageResult;
import cn.iocoder.yudao.module.referral.controller.admin.referral.vo.ReferralApplicationCreateReqVO;
import cn.iocoder.yudao.module.referral.controller.admin.referral.vo.ReferralApplicationPageReqVO;
import cn.iocoder.yudao.module.referral.controller.admin.referral.vo.ReferralApplicationRespVO;
import cn.iocoder.yudao.module.referral.controller.admin.referral.vo.ReferralApplicationUpdateStatusReqVO;

public interface ReferralApplicationService {

    Long createReferralApplication(ReferralApplicationCreateReqVO createReqVO);

    ReferralApplicationRespVO getReferralApplication(Long id);

    PageResult<ReferralApplicationRespVO> getReferralApplicationPage(ReferralApplicationPageReqVO pageReqVO);

    void processReferralApplication(ReferralApplicationUpdateStatusReqVO updateReqVO);

    void pushReferralApplication(ReferralApplicationUpdateStatusReqVO updateReqVO);

    void deleteReferralApplication(Long id);

    void cancelReferralApplication(Long id);
}
