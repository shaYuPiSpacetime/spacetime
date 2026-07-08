package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("app_user_voice_intro_record")
public class AppUserVoiceIntroRecord extends BaseEntity {
    private Long userId;
    private String voiceUrl;
    private Integer duration;
    private String auditStatus;
    private Long providerTaskId;
    private String machineSignalJson;
    private String rejectReason;
    private LocalDateTime submitTime;
    private LocalDateTime auditTime;
    private Boolean currentEffective;
}
