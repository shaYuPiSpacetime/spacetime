package com.spacetime.admin.dto.response;

import lombok.Data;

/**
 * 后台用户隐私设置查看 VO
 */
@Data
public class AdminPrivacySettingVO {
    private Boolean showDistance;
    private Boolean hideActiveTime;
    private Boolean showMaritalStatus;
    private Boolean profileUpdateVisible;
    private Boolean onlyOppositeInteraction;
    private Boolean personalizedPush;
    private Boolean matchChatHint;
    private Boolean smartReply;
}
