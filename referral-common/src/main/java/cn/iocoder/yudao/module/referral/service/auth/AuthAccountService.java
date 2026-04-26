package cn.iocoder.yudao.module.referral.service.auth;

import cn.iocoder.yudao.module.referral.dal.dataobject.auth.AuthAccountDO;

public interface AuthAccountService {

    AuthAccountDO getByUsername(String username);

    Long createAccount(String username, String password, String role, Long userId, Long profileId);

    void updateAccountLink(Long accountId, Long userId, Long profileId);

    boolean verifyPassword(String username, String password);
}
