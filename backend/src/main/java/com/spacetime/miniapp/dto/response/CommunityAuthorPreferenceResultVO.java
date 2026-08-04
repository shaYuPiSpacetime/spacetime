package com.spacetime.miniapp.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;

/** 作者级“不看 TA 动态”最终态。 */
@Data
@AllArgsConstructor
public class CommunityAuthorPreferenceResultVO {
    private String authorUserNo;
    private Boolean hidden;
    private String message;
}
