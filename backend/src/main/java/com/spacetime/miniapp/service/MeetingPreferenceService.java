package com.spacetime.miniapp.service;

import com.spacetime.miniapp.dto.request.MeetingPreferenceSaveReq;
import com.spacetime.miniapp.dto.response.MeetingPreferenceVO;

/** 见面偏好资料服务。 */
public interface MeetingPreferenceService {
    MeetingPreferenceVO get(Long userId);
    MeetingPreferenceVO save(Long userId, MeetingPreferenceSaveReq req);
}
