package cn.iocoder.yudao.module.referral.service.referral;

import cn.iocoder.yudao.module.referral.controller.admin.referral.vo.ApplicationProgressStepRespVO;
import cn.iocoder.yudao.module.referral.enums.ReferralApplicationStatusEnum;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

public final class ApplicationProgressHelper {

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private ApplicationProgressHelper() {
    }

    public static List<ApplicationProgressStepRespVO> build(Integer status,
                                                            LocalDateTime applyTime,
                                                            LocalDateTime processTime,
                                                            String processRemark) {
        List<ApplicationProgressStepRespVO> steps = new ArrayList<>();
        steps.add(new ApplicationProgressStepRespVO(1, "已投递", "学生已提交申请，等待校友查看。", "completed", format(applyTime)));

        int current = status == null ? ReferralApplicationStatusEnum.PENDING.getStatus() : status;
        steps.add(new ApplicationProgressStepRespVO(
                2,
                "校友查看",
                current >= ReferralApplicationStatusEnum.VIEWED.getStatus() && current <= ReferralApplicationStatusEnum.FINISHED.getStatus()
                        ? defaultText(processRemark, "校友已查看申请并进入后续处理。")
                        : "等待校友查阅简历与自我介绍。",
                current >= ReferralApplicationStatusEnum.VIEWED.getStatus() && current <= ReferralApplicationStatusEnum.FINISHED.getStatus() ? "completed" : "current",
                current >= ReferralApplicationStatusEnum.VIEWED.getStatus() ? format(processTime) : null));

        steps.add(new ApplicationProgressStepRespVO(
                3,
                current == ReferralApplicationStatusEnum.VIEWED.getStatus() ? "待补充/沟通中" : "推荐中",
                stepThreeDescription(current, processRemark),
                stepThreeState(current),
                current >= ReferralApplicationStatusEnum.VIEWED.getStatus() ? format(processTime) : null));

        steps.add(new ApplicationProgressStepRespVO(
                4,
                finalTitle(current),
                finalDescription(current, processRemark),
                finalState(current),
                current >= ReferralApplicationStatusEnum.REFERRED.getStatus() ? format(processTime) : null));
        return steps;
    }

    private static String stepThreeDescription(int status, String remark) {
        if (status == ReferralApplicationStatusEnum.VIEWED.getStatus()) {
            return defaultText(remark, "校友已查看，正在补充信息或安排沟通。");
        }
        if (status == ReferralApplicationStatusEnum.REFERRED.getStatus()) {
            return defaultText(remark, "校友已将申请推进到企业或用人部门。");
        }
        if (status == ReferralApplicationStatusEnum.FINISHED.getStatus()) {
            return defaultText(remark, "推荐流程已完成。");
        }
        if (status == ReferralApplicationStatusEnum.REJECTED.getStatus()) {
            return defaultText(remark, "流程在推荐阶段前终止。");
        }
        if (status == ReferralApplicationStatusEnum.CANCELLED.getStatus()) {
            return "学生已主动撤回申请。";
        }
        return "等待进入沟通或推荐阶段。";
    }

    private static String stepThreeState(int status) {
        if (status == ReferralApplicationStatusEnum.REJECTED.getStatus()) {
            return "rejected";
        }
        if (status == ReferralApplicationStatusEnum.CANCELLED.getStatus()) {
            return "cancelled";
        }
        if (status >= ReferralApplicationStatusEnum.REFERRED.getStatus() && status <= ReferralApplicationStatusEnum.FINISHED.getStatus()) {
            return "completed";
        }
        if (status == ReferralApplicationStatusEnum.VIEWED.getStatus()) {
            return "current";
        }
        return "pending";
    }

    private static String finalTitle(int status) {
        if (status == ReferralApplicationStatusEnum.REJECTED.getStatus()) {
            return "未通过";
        }
        if (status == ReferralApplicationStatusEnum.CANCELLED.getStatus()) {
            return "已撤回";
        }
        if (status == ReferralApplicationStatusEnum.FINISHED.getStatus()) {
            return "已完成";
        }
        return "结果反馈";
    }

    private static String finalDescription(int status, String remark) {
        if (status == ReferralApplicationStatusEnum.REJECTED.getStatus()) {
            return defaultText(remark, "本次申请未通过。");
        }
        if (status == ReferralApplicationStatusEnum.CANCELLED.getStatus()) {
            return "学生已主动结束本次投递。";
        }
        if (status == ReferralApplicationStatusEnum.FINISHED.getStatus()) {
            return defaultText(remark, "本次内推流程已闭环完成。");
        }
        return "等待最终处理结果。";
    }

    private static String finalState(int status) {
        if (status == ReferralApplicationStatusEnum.REJECTED.getStatus()) {
            return "rejected";
        }
        if (status == ReferralApplicationStatusEnum.CANCELLED.getStatus()) {
            return "cancelled";
        }
        if (status == ReferralApplicationStatusEnum.FINISHED.getStatus()) {
            return "completed";
        }
        return "pending";
    }

    private static String defaultText(String remark, String fallback) {
        return remark == null || remark.isBlank() ? fallback : remark;
    }

    private static String format(LocalDateTime value) {
        return value == null ? null : value.format(FORMATTER);
    }
}
