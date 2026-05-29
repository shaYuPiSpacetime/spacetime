package com.spacetime.miniapp.service;

import com.spacetime.miniapp.dto.request.MiniappFeedbackSubmitReq;

public interface MiniappFeedbackService {
    Long submit(Long userId, MiniappFeedbackSubmitReq req);
}
