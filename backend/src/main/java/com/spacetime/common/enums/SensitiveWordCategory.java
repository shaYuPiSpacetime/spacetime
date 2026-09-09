package com.spacetime.common.enums;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
/** 附件词库的固定十八类，名称不含扩展名。 */
@Getter @RequiredArgsConstructor
public enum SensitiveWordCategory {
    SENSITIVE_LEXICON("SensitiveLexicon"),
    COVID_19("COVID-19词库"),
    GFW_SUPPLEMENT("GFW补充词库"),
    OTHER("其他词库"),
    REACTIONARY("反动词库"),
    ADVERTISEMENT("广告类型"),
    POLITICS("政治类型"),
    NEW_THOUGHT("新思想启蒙"),
    TERRORISM("暴恐词库"),
    LIVELIHOOD("民生词库"),
    WEAPONS("涉枪涉爆"),
    NETEASE("网易前端过滤敏感词库"),
    PORNOGRAPHY_TYPE("色情类型"),
    PORNOGRAPHY("色情词库"),
    SUPPLEMENT("补充词库"),
    CORRUPTION("贪腐词库"),
    TENCENT("零时-Tencent"),
    ILLEGAL_URL("非法网址");
    /** 展示名称。 */
    private final String displayName;
}
