package cn.iocoder.yudao.module.referral.dal.dataobject.favorite;

import cn.iocoder.yudao.framework.mybatis.core.dataobject.BaseDO;
import com.baomidou.mybatisplus.annotation.KeySequence;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

@TableName("ref_job_favorite")
@KeySequence("ref_job_favorite_seq")
@Data
@EqualsAndHashCode(callSuper = true)
public class JobFavoriteDO extends BaseDO {

    private Long id;
    private Long studentId;
    private Long jobId;
}
