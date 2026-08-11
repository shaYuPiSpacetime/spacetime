package com.spacetime.common.enums;

import lombok.Getter;

/** 举报冻结证据严重程度及中文含义。 */
@Getter
public enum ReportEvidenceSeverityEnum {
    NORMAL("normal", "普通违规"),
    SEVERE("severe", "严重违规");

    private final String code;
    private final String desc;

    ReportEvidenceSeverityEnum(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }
}
