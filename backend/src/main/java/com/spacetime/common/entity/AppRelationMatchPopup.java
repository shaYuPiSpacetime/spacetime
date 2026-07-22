package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.spacetime.common.enums.RelationMatchPopupActionEnum;
import com.spacetime.common.enums.RelationMatchPopupStatusEnum;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/** 匹配成功弹窗按用户独立保存的展示状态。 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("app_relation_match_popup")
public class AppRelationMatchPopup extends BaseEntity {
    /** 所属匹配生命周期 ID。 */
    private Long matchId;
    /** 匹配生命周期业务编号。 */
    private String matchNo;
    /** 弹窗所属用户 ID。 */
    private Long userId;
    /** 弹窗状态。 @see RelationMatchPopupStatusEnum */
    private String popupStatus;
    /** 待展示接口成功返回时间，不代表已读。 */
    private LocalDateTime deliveredTime;
    /** 用户主动动作回执时间。 */
    private LocalDateTime readTime;
    /** 用户已读动作。 @see RelationMatchPopupActionEnum */
    private String readAction;
    /** 匹配在展示前失效的时间。 */
    private LocalDateTime cancelledTime;
}
