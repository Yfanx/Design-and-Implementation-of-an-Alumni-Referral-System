package cn.iocoder.yudao.module.referral.service.alumni;

import cn.iocoder.yudao.framework.common.pojo.PageResult;
import cn.iocoder.yudao.module.referral.controller.admin.alumni.vo.AlumniInfoCreateReqVO;
import cn.iocoder.yudao.module.referral.controller.admin.alumni.vo.AlumniInfoPageReqVO;
import cn.iocoder.yudao.module.referral.controller.admin.alumni.vo.AlumniInfoRespVO;
import cn.iocoder.yudao.module.referral.controller.admin.alumni.vo.AlumniInfoUpdateReqVO;

public interface AlumniInfoService {

    Long createAlumniInfo(AlumniInfoCreateReqVO createReqVO);

    void updateAlumniInfo(AlumniInfoUpdateReqVO updateReqVO);

    AlumniInfoRespVO getAlumniInfo(Long id);

    PageResult<AlumniInfoRespVO> getAlumniInfoPage(AlumniInfoPageReqVO pageReqVO);
}
