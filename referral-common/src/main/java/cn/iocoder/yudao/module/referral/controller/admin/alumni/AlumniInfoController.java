package cn.iocoder.yudao.module.referral.controller.admin.alumni;

import cn.iocoder.yudao.framework.common.pojo.CommonResult;
import cn.iocoder.yudao.framework.common.pojo.PageResult;
import cn.iocoder.yudao.module.referral.controller.admin.alumni.vo.AlumniInfoCreateReqVO;
import cn.iocoder.yudao.module.referral.controller.admin.alumni.vo.AlumniInfoPageReqVO;
import cn.iocoder.yudao.module.referral.controller.admin.alumni.vo.AlumniInfoRespVO;
import cn.iocoder.yudao.module.referral.controller.admin.alumni.vo.AlumniInfoUpdateReqVO;
import cn.iocoder.yudao.module.referral.service.alumni.AlumniInfoService;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.*;

import jakarta.annotation.Resource;

import static cn.iocoder.yudao.framework.common.pojo.CommonResult.success;

@RestController
@RequestMapping("/referral/alumni-info")
public class AlumniInfoController {

    @Resource
    private AlumniInfoService alumniInfoService;

    @PostMapping("/create")
    public CommonResult<Long> create(@RequestBody AlumniInfoCreateReqVO createReqVO) {
        return success(alumniInfoService.createAlumniInfo(createReqVO));
    }

    @PutMapping("/update")
    public CommonResult<Boolean> update(@RequestBody AlumniInfoUpdateReqVO updateReqVO) {
        alumniInfoService.updateAlumniInfo(updateReqVO);
        return success(true);
    }

    @GetMapping("/get")
    public CommonResult<AlumniInfoRespVO> get(@RequestParam("id") Long id) {
        return success(alumniInfoService.getAlumniInfo(id));
    }

    @GetMapping("/list")
    public CommonResult<PageResult<AlumniInfoRespVO>> list(AlumniInfoPageReqVO pageReqVO) {
        return success(alumniInfoService.getAlumniInfoPage(pageReqVO));
    }
}
