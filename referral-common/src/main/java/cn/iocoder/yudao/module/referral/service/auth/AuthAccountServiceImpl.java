package cn.iocoder.yudao.module.referral.service.auth;

import cn.iocoder.yudao.module.referral.config.ReferralStorageProperties;
import cn.iocoder.yudao.module.referral.dal.dataobject.auth.AuthAccountDO;
import cn.iocoder.yudao.module.referral.support.PasswordEncoder;
import cn.iocoder.yudao.module.referral.support.ReferralDemoStore;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;

import jakarta.annotation.Resource;
import java.sql.PreparedStatement;
import java.sql.Statement;

@Service
public class AuthAccountServiceImpl implements AuthAccountService {

    @Resource
    private ReferralDemoStore referralDemoStore;

    @Resource
    private ReferralStorageProperties storageProperties;

    @Resource
    private PasswordEncoder passwordEncoder;

    @Autowired(required = false)
    private JdbcTemplate jdbcTemplate;

    @Override
    public AuthAccountDO getByUsername(String username) {
        if (storageProperties.isMysqlMode()) {
            var list = jdbcTemplate.query(
                    "SELECT id, username, password, role, user_id, profile_id FROM ref_auth_account WHERE username = ?",
                    (rs, rowNum) -> {
                        AuthAccountDO account = new AuthAccountDO();
                        account.setId(rs.getLong("id"));
                        account.setUsername(rs.getString("username"));
                        account.setPassword(rs.getString("password"));
                        account.setRole(rs.getString("role"));
                        account.setUserId(rs.getLong("user_id"));
                        account.setProfileId(rs.getLong("profile_id"));
                        return account;
                    }, username);
            return list.isEmpty() ? null : list.get(0);
        }
        return referralDemoStore.getAuthAccount(username);
    }

    @Override
    public Long createAccount(String username, String password, String role, Long userId, Long profileId) {
        String encoded = passwordEncoder.encode(password);
        if (storageProperties.isMysqlMode()) {
            KeyHolder keyHolder = new GeneratedKeyHolder();
            jdbcTemplate.update(connection -> {
                PreparedStatement ps = connection.prepareStatement(
                        "INSERT INTO ref_auth_account (username, password, role, user_id, profile_id) VALUES (?, ?, ?, ?, ?)",
                        Statement.RETURN_GENERATED_KEYS);
                ps.setString(1, username);
                ps.setString(2, encoded);
                ps.setString(3, role);
                ps.setObject(4, userId);
                ps.setObject(5, profileId);
                return ps;
            }, keyHolder);
            return keyHolder.getKey().longValue();
        }
        AuthAccountDO account = new AuthAccountDO();
        account.setUsername(username);
        account.setPassword(encoded);
        account.setRole(role);
        account.setUserId(userId);
        account.setProfileId(profileId);
        return referralDemoStore.saveAuthAccount(account).getId();
    }

    @Override
    public void updateAccountLink(Long accountId, Long userId, Long profileId) {
        if (accountId == null) {
            return;
        }
        if (storageProperties.isMysqlMode()) {
            jdbcTemplate.update("""
                    UPDATE ref_auth_account
                    SET user_id = ?, profile_id = ?
                    WHERE id = ?
                    """, userId, profileId, accountId);
            return;
        }
        AuthAccountDO account = referralDemoStore.getAuthAccountById(accountId);
        if (account == null) {
            return;
        }
        account.setUserId(userId);
        account.setProfileId(profileId);
        referralDemoStore.saveAuthAccount(account);
    }

    @Override
    public boolean verifyPassword(String username, String password) {
        AuthAccountDO account = getByUsername(username);
        if (account == null) {
            return false;
        }
        return passwordEncoder.matches(password, account.getPassword());
    }
}
