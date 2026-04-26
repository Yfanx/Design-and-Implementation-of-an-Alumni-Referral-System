package cn.iocoder.yudao.module.referral.dal.dataobject.auth;

import cn.iocoder.yudao.framework.mybatis.core.dataobject.BaseDO;
import com.baomidou.mybatisplus.annotation.KeySequence;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

@TableName("ref_auth_account")
@KeySequence("ref_auth_account_seq")
@Data
@EqualsAndHashCode(callSuper = true)
public class AuthAccountDO extends BaseDO {

    private Long id;
    private String username;
    private String password;
    private String role;
    private Long userId;
    private Long profileId;
}