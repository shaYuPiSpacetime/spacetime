package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.spacetime.common.enums.RelationInvalidReasonEnum;
import com.spacetime.common.enums.RelationMatchSourceTypeEnum;
import com.spacetime.common.enums.RelationMatchStatusEnum;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/** 无序用户对的匹配生命周期。 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("app_relation_match")
public class AppRelationMatch extends BaseEntity {
    /** 匹配生命周期编号，前缀 MAT-。 */
    private String matchNo;
    /** 双方中较小的用户 ID。 */
    private Long userLowId;
    /** 双方中较大的用户 ID。 */
    private Long userHighId;
    /** 首次触发该生命周期的来源。 @see RelationMatchSourceTypeEnum */
    private String primarySource;
    /** 匹配生命周期状态。 @see RelationMatchStatusEnum */
    private String matchStatus;
    /** 有效唯一标记：有效时为 1，失效后为空。 */
    private Integer activeMarker;
    /** 匹配生命周期建立时间。 */
    private LocalDateTime matchedTime;
    /** 失效原因。 @see RelationInvalidReasonEnum */
    private String invalidReason;
    /** 匹配失效业务时间。 */
    private LocalDateTime invalidTime;
}
