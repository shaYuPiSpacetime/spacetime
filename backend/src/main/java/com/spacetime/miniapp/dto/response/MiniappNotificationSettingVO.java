package com.spacetime.miniapp.dto.response;

import lombok.Data;

@Data
public class MiniappNotificationSettingVO {
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
