package com.spacetime.common.entity;
import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import lombok.EqualsAndHashCode;
/** 可维护的原始敏感词。 */
@Data @EqualsAndHashCode(callSuper = true) @TableName("content_sensitive_word")
public class ContentSensitiveWord extends BaseEntity {
    /** 原词，精确查重，不规范化。 */
    private String word;
    /** 唯一分类。 */
    private String categoryCode;
    /** 启停状态，见 SensitiveWordStatus。 */
    private String status;
    /** 管理备注，允许清空。 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String remark;
}
