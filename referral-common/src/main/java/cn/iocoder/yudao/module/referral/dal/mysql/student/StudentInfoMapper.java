package cn.iocoder.yudao.module.referral.dal.mysql.student;

import cn.iocoder.yudao.framework.mybatis.core.mapper.BaseMapperX;
import cn.iocoder.yudao.module.referral.dal.dataobject.student.StudentInfoDO;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface StudentInfoMapper extends BaseMapperX<StudentInfoDO> {
}
