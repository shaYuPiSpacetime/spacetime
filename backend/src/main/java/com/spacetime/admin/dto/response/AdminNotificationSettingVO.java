package com.spacetime.admin.dto.response;

import lombok.Data;

/**
 * 后台用户通知设置查看 VO
 */
@Data
public class AdminNotificationSettingVO {
    private Boolean interaction;
    private Boolean community;
    private Boolean dailyRecommend;
    private Boolean appExit;
    private Boolean matchSuccess;
    private Boolean chat;
    private Boolean whisper;
    private Boolean certification;
    private Boolean report;
    private Boolean asset;
    private Boolean bannerInApp;
}
