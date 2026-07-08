package com.spacetime.miniapp.service;

import com.spacetime.miniapp.dto.request.OpenTextSubmitReq;
import com.spacetime.miniapp.dto.response.OpenTextAuditVO;

public interface OpenTextAuditService {
    OpenTextAuditVO submitOpenText(Long userId, OpenTextSubmitReq req);
}
