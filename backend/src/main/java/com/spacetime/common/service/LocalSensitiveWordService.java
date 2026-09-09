package com.spacetime.common.service;
import com.spacetime.common.community.CommunitySecurityResult;
/** 本地词库预检；不可用时由调用方继续微信审核。 */
public interface LocalSensitiveWordService {
    /** 检查正文并返回独立内部证据。 */
    CommunitySecurityResult checkText(String content);
    /** 非阻塞提交刷新请求。 */
    void requestRefresh();
}
