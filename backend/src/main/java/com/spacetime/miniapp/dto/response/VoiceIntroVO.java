package com.spacetime.miniapp.dto.response;

import lombok.Data;

/**
 * 语音介绍提交结果。
 */
@Data
public class VoiceIntroVO {
    /** 审核通过后对外可展示的语音 URL；未通过或待审时为空。 */
    private String voiceIntroUrl;
    /** 语音时长，单位秒。 */
    private Integer voiceIntroDuration;
    /** 语音介绍审核状态。 */
    private String voiceIntroAuditStatus;
    /** 驳回原因。 */
    private String voiceIntroRejectReason;
    /** 是否允许移动端公开资料页展示播放器。 */
    private Boolean visibleToPublic;
    /** 当前状态是否允许再次提交，前端不得自行枚举审核状态推断。 */
    private Boolean canSubmit;
}
