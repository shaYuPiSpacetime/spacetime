package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/** 当前用户待展示的匹配成功弹窗。 */
@Data
public class MatchPopupVO {
    private String matchNo;
    private Long matchedUserId;
    private String nickname;
    private String avatar;
    private String matchSource;
    private LocalDateTime matchTime;
    private Boolean canEnterConversation;
    private String popupStatus;
}
