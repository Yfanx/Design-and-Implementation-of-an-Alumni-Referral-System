package cn.iocoder.yudao.module.referral.service.company;

import cn.iocoder.yudao.framework.common.pojo.PageResult;
import cn.iocoder.yudao.module.referral.config.ReferralStorageProperties;
import cn.iocoder.yudao.module.referral.controller.admin.company.vo.CompanyInfoCreateReqVO;
import cn.iocoder.yudao.module.referral.controller.admin.company.vo.CompanyInfoPageReqVO;
import cn.iocoder.yudao.module.referral.controller.admin.company.vo.CompanyInfoRespVO;
import cn.iocoder.yudao.module.referral.controller.admin.company.vo.CompanyInfoUpdateReqVO;
import cn.iocoder.yudao.module.referral.dal.dataobject.company.CompanyInfoDO;
import cn.iocoder.yudao.module.referral.support.ReferralDemoStore;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;

import jakarta.annotation.Resource;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.List;

@Service
public class CompanyInfoServiceImpl implements CompanyInfoService {

    @Resource
    private ReferralDemoStore referralDemoStore;

    @Resource
    private ReferralStorageProperties storageProperties;

    @Autowired(required = false)
    private JdbcTemplate jdbcTemplate;

    @Override
    public Long createCompanyInfo(CompanyInfoCreateReqVO createReqVO) {
        if (storageProperties.isMysqlMode()) {
            KeyHolder keyHolder = new GeneratedKeyHolder();
            jdbcTemplate.update(connection -> {
                PreparedStatement ps = connection.prepareStatement("""
                        INSERT INTO ref_company_info
                        (company_name, industry, company_size, city, address, company_desc, official_website, status)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        """, Statement.RETURN_GENERATED_KEYS);
                ps.setString(1, createReqVO.getCompanyName());
                ps.setString(2, createReqVO.getIndustry());
                ps.setString(3, createReqVO.getCompanySize());
                ps.setString(4, createReqVO.getCity());
                ps.setString(5, createReqVO.getAddress());
                ps.setString(6, createReqVO.getCompanyDesc());
                ps.setString(7, createReqVO.getOfficialWebsite());
                ps.setObject(8, createReqVO.getStatus() == null ? 1 : createReqVO.getStatus());
                return ps;
            }, keyHolder);
            return keyHolder.getKey().longValue();
        }
        CompanyInfoDO companyInfo = new CompanyInfoDO();
        copyFields(createReqVO, companyInfo);
        return referralDemoStore.saveCompany(companyInfo).getId();
    }

    @Override
    public void updateCompanyInfo(CompanyInfoUpdateReqVO updateReqVO) {
        if (storageProperties.isMysqlMode()) {
            jdbcTemplate.update("""
                    UPDATE ref_company_info
                    SET company_name = ?, industry = ?, company_size = ?, city = ?, address = ?,
                        company_desc = ?, official_website = ?, status = ?
                    WHERE id = ?
                    """,
                    updateReqVO.getCompanyName(), updateReqVO.getIndustry(), updateReqVO.getCompanySize(),
                    updateReqVO.getCity(), updateReqVO.getAddress(), updateReqVO.getCompanyDesc(),
                    updateReqVO.getOfficialWebsite(), updateReqVO.getStatus() == null ? 1 : updateReqVO.getStatus(),
                    updateReqVO.getId());
            return;
        }
        CompanyInfoDO companyInfo = referralDemoStore.getCompany(updateReqVO.getId());
        if (companyInfo == null) {
            return;
        }
        copyFields(updateReqVO, companyInfo);
        referralDemoStore.saveCompany(companyInfo);
    }

    @Override
    public CompanyInfoRespVO getCompanyInfo(Long id) {
        if (storageProperties.isMysqlMode()) {
            List<CompanyInfoRespVO> list = jdbcTemplate.query("""
                    SELECT id, company_name, industry, company_size, city, address, company_desc, official_website, status, create_time
                    FROM ref_company_info WHERE id = ?
                    """, (rs, rowNum) -> {
                CompanyInfoRespVO target = new CompanyInfoRespVO();
                target.setId(rs.getLong("id"));
                target.setCompanyName(rs.getString("company_name"));
                target.setIndustry(rs.getString("industry"));
                target.setCompanySize(rs.getString("company_size"));
                target.setCity(rs.getString("city"));
                target.setAddress(rs.getString("address"));
                target.setCompanyDesc(rs.getString("company_desc"));
                target.setOfficialWebsite(rs.getString("official_website"));
                target.setStatus(rs.getInt("status"));
                if (rs.getTimestamp("create_time") != null) {
                    target.setCreateTime(rs.getTimestamp("create_time").toLocalDateTime());
                }
                return target;
            }, id);
            return list.isEmpty() ? null : list.get(0);
        }
        CompanyInfoDO companyInfo = referralDemoStore.getCompany(id);
        return companyInfo == null ? null : convert(companyInfo);
    }

    @Override
    public PageResult<CompanyInfoRespVO> getCompanyInfoPage(CompanyInfoPageReqVO pageReqVO) {
        if (storageProperties.isMysqlMode()) {
            List<CompanyInfoRespVO> list = jdbcTemplate.query("""
                    SELECT id, company_name, industry, company_size, city, address, company_desc, official_website, status, create_time
                    FROM ref_company_info ORDER BY id DESC
                    """, (rs, rowNum) -> {
                CompanyInfoRespVO target = new CompanyInfoRespVO();
                target.setId(rs.getLong("id"));
                target.setCompanyName(rs.getString("company_name"));
                target.setIndustry(rs.getString("industry"));
                target.setCompanySize(rs.getString("company_size"));
                target.setCity(rs.getString("city"));
                target.setAddress(rs.getString("address"));
                target.setCompanyDesc(rs.getString("company_desc"));
                target.setOfficialWebsite(rs.getString("official_website"));
                target.setStatus(rs.getInt("status"));
                if (rs.getTimestamp("create_time") != null) {
                    target.setCreateTime(rs.getTimestamp("create_time").toLocalDateTime());
                }
                return target;
            }).stream()
                    .filter(item -> pageReqVO.getCompanyName() == null || item.getCompanyName().contains(pageReqVO.getCompanyName()))
                    .filter(item -> pageReqVO.getIndustry() == null || item.getIndustry().contains(pageReqVO.getIndustry()))
                    .filter(item -> pageReqVO.getCity() == null || item.getCity().contains(pageReqVO.getCity()))
                    .toList();
            return new PageResult<>(list, (long) list.size());
        }
        List<CompanyInfoRespVO> filtered = referralDemoStore.listCompanies().stream()
                .filter(item -> pageReqVO.getCompanyName() == null || item.getCompanyName().contains(pageReqVO.getCompanyName()))
                .filter(item -> pageReqVO.getIndustry() == null || item.getIndustry().contains(pageReqVO.getIndustry()))
                .filter(item -> pageReqVO.getCity() == null || item.getCity().contains(pageReqVO.getCity()))
                .map(this::convert)
                .toList();
        return new PageResult<>(filtered, (long) filtered.size());
    }

    @Override
    public void deleteCompanyInfo(Long id) {
        if (storageProperties.isMysqlMode()) {
            jdbcTemplate.update("DELETE FROM ref_company_info WHERE id = ?", id);
            return;
        }
        referralDemoStore.removeCompany(id);
    }

    @Override
    public List<CompanyInfoRespVO> listCompanyInfos() {
        if (storageProperties.isMysqlMode()) {
            return jdbcTemplate.query("""
                    SELECT id, company_name, industry, company_size, city, address, company_desc, official_website, status, create_time
                    FROM ref_company_info WHERE status = 1 ORDER BY id DESC
                    """, (rs, rowNum) -> {
                CompanyInfoRespVO target = new CompanyInfoRespVO();
                target.setId(rs.getLong("id"));
                target.setCompanyName(rs.getString("company_name"));
                target.setIndustry(rs.getString("industry"));
                target.setCompanySize(rs.getString("company_size"));
                target.setCity(rs.getString("city"));
                target.setAddress(rs.getString("address"));
                target.setCompanyDesc(rs.getString("company_desc"));
                target.setOfficialWebsite(rs.getString("official_website"));
                target.setStatus(rs.getInt("status"));
                if (rs.getTimestamp("create_time") != null) {
                    target.setCreateTime(rs.getTimestamp("create_time").toLocalDateTime());
                }
                return target;
            });
        }
        return referralDemoStore.listCompanies().stream()
                .filter(c -> c.getStatus() != null && c.getStatus() == 1)
                .map(this::convert)
                .toList();
    }

    private void copyFields(CompanyInfoCreateReqVO source, CompanyInfoDO target) {
        target.setCompanyName(source.getCompanyName());
        target.setIndustry(source.getIndustry());
        target.setCompanySize(source.getCompanySize());
        target.setCity(source.getCity());
        target.setAddress(source.getAddress());
        target.setCompanyDesc(source.getCompanyDesc());
        target.setOfficialWebsite(source.getOfficialWebsite());
        target.setStatus(source.getStatus() == null ? 1 : source.getStatus());
    }

    private CompanyInfoRespVO convert(CompanyInfoDO source) {
        CompanyInfoRespVO target = new CompanyInfoRespVO();
        target.setId(source.getId());
        target.setCompanyName(source.getCompanyName());
        target.setIndustry(source.getIndustry());
        target.setCompanySize(source.getCompanySize());
        target.setCity(source.getCity());
        target.setAddress(source.getAddress());
        target.setCompanyDesc(source.getCompanyDesc());
        target.setOfficialWebsite(source.getOfficialWebsite());
        target.setStatus(source.getStatus());
        target.setCreateTime(source.getCreateTime());
        return target;
    }
}
