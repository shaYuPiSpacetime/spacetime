package com.spacetime.miniapp.service;

import com.spacetime.miniapp.dto.response.PublicProfileVO;

/** 小程序关系链路公开资料服务。 */
public interface MiniappPublicProfileService {
    /** 查询目标用户经过准入、屏蔽和审核投影后的公开资料。 */
    PublicProfileVO getPublicProfile(Long currentUserId, Long targetUserId);
}
