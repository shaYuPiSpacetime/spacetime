package com.spacetime.miniapp.dto.response;

import lombok.Data;

/** 悄悄话详情页可执行动作，由后端按方向和状态统一裁决。 */
@Data
public class MessageWhisperActionsVO {
    private Boolean canReply;
    private Boolean canDelete;
    private Boolean canReportWhisperContent;
    private Boolean canReportPeerUser;
    private Boolean canReverseApply;
    private Boolean canEnterConversation;
    private Boolean canOpenProfile;
}
