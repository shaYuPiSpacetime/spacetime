package com.spacetime.miniapp.service;

import com.spacetime.miniapp.dto.response.PublicProfileVO;

/** 小程序关系链路公开资料服务。 */
public interface MiniappPublicProfileService {
    /** 查询审核公开资料；游客只读入口传空当前用户，登录入口校验准入、屏蔽及解锁。 */
    PublicProfileVO getPublicProfile(Long currentUserId, Long targetUserId);
}
