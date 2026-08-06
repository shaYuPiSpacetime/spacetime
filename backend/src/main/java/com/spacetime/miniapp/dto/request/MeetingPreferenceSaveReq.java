package com.spacetime.miniapp.dto.request;

import lombok.Data;

import java.util.List;

/** 见面偏好页面级保存请求。 */
@Data
public class MeetingPreferenceSaveReq {
    /** 见面偏好字典 code，空值表示清空。 */
    private String meetingPreference;
    /** 喜欢的见面活动字典 code，多选、去重。 */
    private List<String> preferredActivities;
}
