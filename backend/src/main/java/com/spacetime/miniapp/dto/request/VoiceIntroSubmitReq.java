package com.spacetime.miniapp.dto.request;

import lombok.Data;

/**
 * 语音介绍提交请求。
 */
@Data
public class VoiceIntroSubmitReq {
    /** 语音文件 URL。 */
    private String voiceUrl;

    /** 语音时长，单位秒。 */
    private Integer duration;
}
