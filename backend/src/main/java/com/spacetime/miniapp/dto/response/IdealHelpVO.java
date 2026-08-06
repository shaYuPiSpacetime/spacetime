package com.spacetime.miniapp.dto.response;

import lombok.Data;

/** 理想型帮助中心动态正文与商业化摘要。 */
@Data
public class IdealHelpVO {
    private String title;
    private String intro;
    private String resultDescription;
    private String unlockDescription;
    private IdealPricingVO pricing;
}
