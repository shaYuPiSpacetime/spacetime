package com.spacetime.miniapp.dto.response;

import lombok.Data;

/**
 * 首登资料状态响应
 */
@Data
public class ProfileInitStatusVO {
    /** 是否已完成首登 */
    private Boolean firstLoginCompleted;
    /** 当前步骤 1/2/3 */
    private Integer currentStep;
    /** 下一步步骤号，已完成时为 null */
    private Integer nextStep;
    /** 已保存的字段 */
    private ProfileDetailVO savedFields;
}
