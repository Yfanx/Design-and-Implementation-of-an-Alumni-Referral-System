package cn.iocoder.yudao.module.referral.controller.admin.student;

import cn.iocoder.yudao.framework.common.pojo.CommonResult;
import cn.iocoder.yudao.framework.common.pojo.PageResult;
import cn.iocoder.yudao.module.referral.controller.admin.student.vo.StudentInfoCreateReqVO;
import cn.iocoder.yudao.module.referral.controller.admin.student.vo.StudentInfoPageReqVO;
import cn.iocoder.yudao.module.referral.controller.admin.student.vo.StudentInfoRespVO;
import cn.iocoder.yudao.module.referral.controller.admin.student.vo.StudentInfoUpdateReqVO;
import cn.iocoder.yudao.module.referral.service.student.StudentInfoService;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.*;

import jakarta.annotation.Resource;

import static cn.iocoder.yudao.framework.common.pojo.CommonResult.success;

@RestController
@RequestMapping("/referral/student-info")
public class StudentInfoController {

    @Resource
    private StudentInfoService studentInfoService;

    @PostMapping("/create")
    public CommonResult<Long> create(@RequestBody StudentInfoCreateReqVO createReqVO) {
        return success(studentInfoService.createStudentInfo(createReqVO));
    }

    @PutMapping("/update")
    public CommonResult<Boolean> update(@RequestBody StudentInfoUpdateReqVO updateReqVO) {
        studentInfoService.updateStudentInfo(updateReqVO);
        return success(true);
    }

    @GetMapping("/get")
    public CommonResult<StudentInfoRespVO> get(@RequestParam("id") Long id) {
        return success(studentInfoService.getStudentInfo(id));
    }

    @GetMapping("/list")
    public CommonResult<PageResult<StudentInfoRespVO>> list(StudentInfoPageReqVO pageReqVO) {
        return success(studentInfoService.getStudentInfoPage(pageReqVO));
    }
}
