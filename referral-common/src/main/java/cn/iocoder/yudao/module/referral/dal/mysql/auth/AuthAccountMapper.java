package cn.iocoder.yudao.module.referral.dal.mysql.auth;

import cn.iocoder.yudao.framework.mybatis.core.mapper.BaseMapperX;
import cn.iocoder.yudao.module.referral.dal.dataobject.auth.AuthAccountDO;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface AuthAccountMapper extends BaseMapperX<AuthAccountDO> {
}