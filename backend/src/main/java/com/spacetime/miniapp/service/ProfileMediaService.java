package com.spacetime.miniapp.service;

import com.spacetime.miniapp.dto.request.AvatarSubmitReq;
import com.spacetime.miniapp.dto.request.ProfileMediaSubmitReq;
import com.spacetime.miniapp.dto.response.AvatarSubmitVO;
import com.spacetime.miniapp.dto.response.ProfileMediaVO;

public interface ProfileMediaService {
    /** 提交裁剪后的主头像，并生成头像审核记录。 */
    AvatarSubmitVO submitAvatar(Long userId, AvatarSubmitReq req);

    ProfileMediaVO submitMedia(Long userId, ProfileMediaSubmitReq req);

    void deleteMedia(Long userId, Long mediaId);
}
