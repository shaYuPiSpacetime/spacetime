package com.spacetime.common.service;

import java.time.LocalDateTime;

/** 收敛已经投递或已终止、但仍卡在回复预占状态的悄悄话。 */
public interface MessageWhisperReplyReconcileService {
    /**
     * 完成已投递回复的会话状态，并释放永久失败的回复预占。
     *
     * @return 本轮收敛的悄悄话数量
     */
    int reconcile(LocalDateTime now, int limit);
}
