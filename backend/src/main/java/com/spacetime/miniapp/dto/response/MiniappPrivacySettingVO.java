package com.spacetime.miniapp.dto.response;

import lombok.Data;

@Data
public class MiniappPrivacySettingVO {
    private Boolean showDistance;
    private Boolean hideActiveTime;
    private Boolean showMaritalStatus;
    private Boolean profileUpdateVisible;
    private Boolean onlyOppositeInteraction;
    private Boolean personalizedPush;
    private Boolean matchChatHint;
    private Boolean smartReply;
}
