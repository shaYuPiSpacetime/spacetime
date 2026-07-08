package com.spacetime.miniapp.service;

import com.spacetime.miniapp.dto.request.ProfileMediaSubmitReq;
import com.spacetime.miniapp.dto.response.ProfileMediaVO;

public interface ProfileMediaService {
    ProfileMediaVO submitMedia(Long userId, ProfileMediaSubmitReq req);
    void deleteMedia(Long userId, Long mediaId);
}
