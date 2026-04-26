package cn.iocoder.yudao.module.referral.service.student;

import cn.iocoder.yudao.framework.common.pojo.PageResult;
import cn.iocoder.yudao.module.referral.controller.admin.student.vo.StudentInfoCreateReqVO;
import cn.iocoder.yudao.module.referral.controller.admin.student.vo.StudentInfoPageReqVO;
import cn.iocoder.yudao.module.referral.controller.admin.student.vo.StudentInfoRespVO;
import cn.iocoder.yudao.module.referral.controller.admin.student.vo.StudentInfoUpdateReqVO;

public interface StudentInfoService {

    Long createStudentInfo(StudentInfoCreateReqVO createReqVO);

    void updateStudentInfo(StudentInfoUpdateReqVO updateReqVO);

    StudentInfoRespVO getStudentInfo(Long id);

    PageResult<StudentInfoRespVO> getStudentInfoPage(StudentInfoPageReqVO pageReqVO);
}
