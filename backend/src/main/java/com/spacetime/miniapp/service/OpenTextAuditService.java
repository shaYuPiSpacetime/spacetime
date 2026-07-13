package com.spacetime.miniapp.service;

import com.spacetime.miniapp.dto.request.IntroductionSubmitReq;
import com.spacetime.miniapp.dto.request.OpenTextSubmitReq;
import com.spacetime.miniapp.dto.response.OpenTextAuditVO;

public interface OpenTextAuditService {
    /** 提交强引导自我介绍，固定按 ABOUT_ME 进入开放文本审核。 */
    OpenTextAuditVO submitIntroduction(Long userId, IntroductionSubmitReq req);

    OpenTextAuditVO submitOpenText(Long userId, OpenTextSubmitReq req);
}
