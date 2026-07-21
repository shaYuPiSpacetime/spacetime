package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.spacetime.common.enums.RelationInvalidReasonEnum;
import com.spacetime.common.enums.RelationMatchSourceStatusEnum;
import com.spacetime.common.enums.RelationMatchSourceTypeEnum;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/** 匹配生命周期下可并存的来源事实。 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("app_relation_match_source")
public class AppRelationMatchSource extends BaseEntity {
    /** 匹配来源明细编号，前缀 MTS-。 */
    private String sourceNo;
    /** 所属匹配生命周期 ID。 */
    private Long matchId;
    /** 匹配来源类型。 @see RelationMatchSourceTypeEnum */
    private String sourceType;
    /** 上游来源事件唯一编号。 */
    private String sourceEventNo;
    /** 来源状态。 @see RelationMatchSourceStatusEnum */
    private String sourceStatus;
    /** 来源生效时间。 */
    private LocalDateTime effectiveTime;
    /** 来源撤销时间。 */
    private LocalDateTime revokedTime;
    /** 撤销或失效原因。 @see RelationInvalidReasonEnum */
    private String invalidReason;
}
