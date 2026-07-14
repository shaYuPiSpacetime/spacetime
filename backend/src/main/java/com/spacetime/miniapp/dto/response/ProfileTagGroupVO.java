package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.util.List;

/** 我的标签分类分组。 */
@Data
public class ProfileTagGroupVO {
    /** 分类 code，例如 ALL、MBTI、PERSONALITY。 */
    private String categoryCode;
    /** 分类名称，例如 全部、MBTI、性格。 */
    private String categoryLabel;
    /** 该分类下的标签选项。 */
    private List<DictOptionVO> options;
}
