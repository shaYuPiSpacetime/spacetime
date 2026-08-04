package com.spacetime.common.util;

/** 为未主动设置昵称的用户生成稳定、非敏感的默认昵称。 */
public final class DefaultNicknameGenerator {

    private static final String PREFIX = "用户";

    private DefaultNicknameGenerator() {
    }

    /** 使用用户 ID 的末四位生成昵称，同一账号重复调用结果一致。 */
    public static String fromUserId(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("生成默认昵称前用户ID不能为空");
        }
        long suffix = Math.floorMod(userId, 10_000L);
        return PREFIX + String.format("%04d", suffix);
    }
}
