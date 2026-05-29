package com.spacetime.admin.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.response.*;

import java.util.List;

public interface UserSecurityAdminService {
    AdminUserSecuritySummaryVO summary(Long userId);
    AdminPrivacySettingVO privacy(Long userId);
    AdminNotificationSettingVO notifications(Long userId);
    Page<AdminRelationBlockVO> blacklist(Long userId, int page, int size);
    Page<AdminRelationBlockVO> hiddenDynamics(Long userId, int page, int size);
    List<AdminUserKeywordVO> keywordBlocks(Long userId);
}
