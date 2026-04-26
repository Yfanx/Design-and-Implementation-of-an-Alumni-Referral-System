package cn.iocoder.yudao.module.referral.controller.admin.company;

import cn.iocoder.yudao.framework.common.pojo.CommonResult;
import cn.iocoder.yudao.framework.common.pojo.PageResult;
import cn.iocoder.yudao.module.referral.controller.admin.company.vo.CompanyInfoCreateReqVO;
import cn.iocoder.yudao.module.referral.controller.admin.company.vo.CompanyInfoPageReqVO;
import cn.iocoder.yudao.module.referral.controller.admin.company.vo.CompanyInfoRespVO;
import cn.iocoder.yudao.module.referral.controller.admin.company.vo.CompanyInfoUpdateReqVO;
import cn.iocoder.yudao.module.referral.service.company.CompanyInfoService;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.*;

import jakarta.annotation.Resource;

import java.util.List;

import static cn.iocoder.yudao.framework.common.pojo.CommonResult.success;

@RestController
@RequestMapping("/referral/company-info")
public class CompanyInfoController {

    @Resource
    private CompanyInfoService companyInfoService;

    @PostMapping("/create")
    public CommonResult<Long> create(@RequestBody CompanyInfoCreateReqVO createReqVO) {
        return success(companyInfoService.createCompanyInfo(createReqVO));
    }

    @PutMapping("/update")
    public CommonResult<Boolean> update(@RequestBody CompanyInfoUpdateReqVO updateReqVO) {
        companyInfoService.updateCompanyInfo(updateReqVO);
        return success(true);
    }

    @GetMapping("/get")
    public CommonResult<CompanyInfoRespVO> get(@RequestParam("id") Long id) {
        return success(companyInfoService.getCompanyInfo(id));
    }

    @GetMapping("/list")
    public CommonResult<PageResult<CompanyInfoRespVO>> list(CompanyInfoPageReqVO pageReqVO) {
        return success(companyInfoService.getCompanyInfoPage(pageReqVO));
    }

    @GetMapping("/simple-list")
    public CommonResult<List<CompanyInfoRespVO>> simpleList() {
        return success(companyInfoService.listCompanyInfos());
    }

    @DeleteMapping("/delete")
    public CommonResult<Boolean> delete(@RequestParam("id") Long id) {
        companyInfoService.deleteCompanyInfo(id);
        return success(true);
    }
}
