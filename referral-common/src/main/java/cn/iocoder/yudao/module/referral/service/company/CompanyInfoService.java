package cn.iocoder.yudao.module.referral.service.company;

import cn.iocoder.yudao.framework.common.pojo.PageResult;
import cn.iocoder.yudao.module.referral.controller.admin.company.vo.CompanyInfoCreateReqVO;
import cn.iocoder.yudao.module.referral.controller.admin.company.vo.CompanyInfoPageReqVO;
import cn.iocoder.yudao.module.referral.controller.admin.company.vo.CompanyInfoRespVO;
import cn.iocoder.yudao.module.referral.controller.admin.company.vo.CompanyInfoUpdateReqVO;

import java.util.List;

public interface CompanyInfoService {

    Long createCompanyInfo(CompanyInfoCreateReqVO createReqVO);

    void updateCompanyInfo(CompanyInfoUpdateReqVO updateReqVO);

    CompanyInfoRespVO getCompanyInfo(Long id);

    PageResult<CompanyInfoRespVO> getCompanyInfoPage(CompanyInfoPageReqVO pageReqVO);

    List<CompanyInfoRespVO> listCompanyInfos();

    void deleteCompanyInfo(Long id);
}
