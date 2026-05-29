package com.spacetime.miniapp.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.miniapp.dto.request.MiniappKeywordBlockReq;
import com.spacetime.miniapp.dto.request.MiniappNotificationSettingReq;
import com.spacetime.miniapp.dto.request.MiniappPrivacySettingReq;
import com.spacetime.miniapp.dto.request.MiniappRelationBlockReq;
import com.spacetime.miniapp.dto.response.*;

import java.util.List;

public interface MiniappSettingService {
    MiniappSettingsHomeVO home(Long userId);
    MiniappPrivacySettingVO getPrivacy(Long userId);
    void savePrivacy(Long userId, MiniappPrivacySettingReq req);
    MiniappNotificationSettingVO getNotifications(Long userId);
    void saveNotifications(Long userId, MiniappNotificationSettingReq req);
    Page<MiniappBlockedUserVO> listBlocks(Long userId, String blockType, int page, int size);
    Long addBlock(Long userId, String blockType, MiniappRelationBlockReq req);
    void removeBlock(Long userId, String blockType, Long id);
    List<MiniappUserKeywordVO> listKeywords(Long userId);
    Long addKeyword(Long userId, MiniappKeywordBlockReq req);
    void removeKeyword(Long userId, Long id);
}
