package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 用户通知设置实体
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("app_user_notification_setting")
public class AppUserNotificationSetting extends BaseEntity {
    /** 用户ID */
    private Long userId;
    /** 互动通知 1=开 0=关 */
    private Integer interaction;
    /** 社区通知 1=开 0=关 */
    private Integer community;
    /** 每日推荐 1=开 0=关 */
    private Integer dailyRecommend;
    /** 离开应用提醒 1=开 0=关 */
    private Integer appExit;
    /** 匹配成功 1=开 0=关 */
    private Integer matchSuccess;
    /** 聊天消息 1=开 0=关 */
    private Integer chat;
    /** 悄悄话 1=开 0=关 */
    private Integer whisper;
    /** 认证通知 1=开 0=关 */
    private Integer certification;
    /** 举报/申诉通知 1=开 0=关 */
    private Integer report;
    /** 资产通知 1=开 0=关 */
    private Integer asset;
    /** 站内横幅 1=开 0=关 */
    private Integer bannerInApp;
}
