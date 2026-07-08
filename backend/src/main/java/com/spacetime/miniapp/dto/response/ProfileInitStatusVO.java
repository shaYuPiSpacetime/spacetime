package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.util.List;

/**
 * 首登资料初始化状态，按移动端五步轻量资料流程返回。
 */
@Data
public class ProfileInitStatusVO {
    /** 是否已完成首登资料初始化。 */
    private Boolean firstLoginCompleted;
    /** 当前停留步骤。 */
    private Integer currentStep;
    /** 下一步步骤；完成时为空。 */
    private Integer nextStep;
    /** 已完成步骤列表，移动端用于断点续填。 */
    private List<Integer> completedSteps;
    /** 下一步动作：CONTINUE_STEP_N 或 COMPLETED。 */
    private String nextAction;
    /** 已保存的资料字段。 */
    private ProfileDetailVO savedFields;
}
