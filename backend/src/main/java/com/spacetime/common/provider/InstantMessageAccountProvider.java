package com.spacetime.common.provider;

/** 即时通信账号导入与登录凭证能力。 */
public interface InstantMessageAccountProvider {
    void syncAccount(Long userId, String nickname, String avatarUrl);

    ImAccountCredential issueCredential(Long userId, String nickname, String avatarUrl);
}
