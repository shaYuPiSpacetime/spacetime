package com.spacetime.miniapp.service;

import com.spacetime.miniapp.dto.request.WhisperCreateReq;
import com.spacetime.miniapp.dto.request.WhisperPrecheckReq;
import com.spacetime.miniapp.dto.response.WhisperCreateVO;
import com.spacetime.miniapp.dto.response.WhisperPrecheckVO;

/** 小程序悄悄话服务。 */
public interface WhisperService {
    /** 只读检查发送资格、运行时单价和资产余额。 */
    WhisperPrecheckVO precheck(Long senderUserId, WhisperPrecheckReq req);

    /** 幂等创建悄悄话并在同一事务内消费免费权益或成家币。 */
    WhisperCreateVO create(Long senderUserId, String idempotencyKey, WhisperCreateReq req);
}
