package com.spacetime.miniapp.service;

import com.spacetime.miniapp.dto.request.MiniappAccountCancelReq;
import com.spacetime.miniapp.dto.response.MiniappAccountCancelCheckVO;
import com.spacetime.miniapp.dto.response.MiniappAccountCancelStatusVO;

public interface MiniappAccountSecurityService {
    MiniappAccountCancelStatusVO cancelStatus(Long userId);
    MiniappAccountCancelCheckVO cancelCheck(Long userId);
    Long applyCancel(Long userId, MiniappAccountCancelReq req);
    void revokeCancel(Long userId);
    int executeDueCancellations();
    void logout(String token);
}
