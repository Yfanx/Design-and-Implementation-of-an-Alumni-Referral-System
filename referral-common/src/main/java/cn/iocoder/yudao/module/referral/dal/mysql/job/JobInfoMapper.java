package cn.iocoder.yudao.module.referral.dal.mysql.job;

import cn.iocoder.yudao.framework.mybatis.core.mapper.BaseMapperX;
import cn.iocoder.yudao.module.referral.dal.dataobject.job.JobInfoDO;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface JobInfoMapper extends BaseMapperX<JobInfoDO> {
}
