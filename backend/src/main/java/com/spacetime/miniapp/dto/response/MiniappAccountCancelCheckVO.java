package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * 账号注销实时校验结果。
 */
@Data
public class MiniappAccountCancelCheckVO {
    /** 是否允许用户确认风险后提交。 */
    private Boolean canSubmit;
    /** 后悔期天数。 */
    private Integer coolingDays;
    /** 注销说明，来自动态配置。 */
    private String description;
    /** 注销原因选项，来自动态配置。 */
    private List<String> reasons = new ArrayList<>();
    /** 本次校验凭证，提交时用于识别是否重新打开过弹窗。 */
    private String recheckToken;
    /** 不允许继续提交的硬阻断项。 */
    private List<RiskItem> hardBlocks = new ArrayList<>();
    /** 用户确认后允许继续提交的风险项。 */
    private List<RiskItem> risks = new ArrayList<>();

    /**
     * 注销风险项。
     */
    @Data
    public static class RiskItem {
        private String code;
        private String title;
        private String description;
        /** BLOCK 或 WARNING。 */
        private String severity;
    }
}
