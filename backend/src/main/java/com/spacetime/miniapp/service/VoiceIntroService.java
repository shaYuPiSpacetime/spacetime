package com.spacetime.miniapp.service;

import com.spacetime.miniapp.dto.request.VoiceIntroSubmitReq;
import com.spacetime.miniapp.dto.response.VoiceIntroVO;

public interface VoiceIntroService {
    VoiceIntroVO submitVoiceIntro(Long userId, VoiceIntroSubmitReq req);
    void deleteVoiceIntro(Long userId);
}
