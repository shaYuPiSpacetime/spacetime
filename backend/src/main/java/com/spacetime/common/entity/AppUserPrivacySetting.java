package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 用户隐私设置实体
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("app_user_privacy_setting")
public class AppUserPrivacySetting extends BaseEntity {
    /** 用户ID */
    private Long userId;
    /** 是否展示距离 1=是 0=否 */
    private Integer showDistance;
    /** 是否隐藏活跃时间 1=是 0=否 */
    private Integer hideActiveTime;
    /** 是否展示婚恋状态 1=是 0=否 */
    private Integer showMaritalStatus;
    /** 资料更新是否可见 1=是 0=否 */
    private Integer profileUpdateVisible;
    /** 只接受异性互动 1=是 0=否 */
    private Integer onlyOppositeInteraction;
    /** 个性化推荐/推送 1=是 0=否 */
    private Integer personalizedPush;
    /** 匹配聊天提示 1=是 0=否 */
    private Integer matchChatHint;
    /** 智能回复 1=是 0=否 */
    private Integer smartReply;
}
