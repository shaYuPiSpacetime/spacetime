package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/** 见面偏好页面回显与动态字典。 */
@Data
public class MeetingPreferenceVO {
    private String meetingPreference;
    private String meetingPreferenceLabel;
    private List<String> preferredActivities;
    private List<String> preferredActivityLabels;
    private List<MeetingPreferenceOptionVO> meetingPreferenceOptions;
    private List<MeetingPreferenceOptionVO> preferredActivityOptions;
    private Integer maxActivities;
    private LocalDateTime updatedAt;
    /** 字典加载失败时为 false，客户端保留历史值并禁用保存。 */
    private Boolean dictionaryAvailable;
}
