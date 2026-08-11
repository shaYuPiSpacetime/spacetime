package com.spacetime.admin.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.response.AdminConversationVO;
import com.spacetime.admin.dto.request.SensitiveContentViewReq;
import com.spacetime.admin.dto.response.AdminPlatformMessageVO;
import com.spacetime.admin.dto.response.AdminPrivateMessageVO;
import com.spacetime.admin.dto.response.AdminSensitiveMessageContentVO;
import com.spacetime.admin.dto.response.AdminReportLinkVO;
import com.spacetime.admin.dto.response.AdminSystemMessageVO;
import com.spacetime.admin.dto.response.AdminWhisperVO;
import com.spacetime.admin.dto.response.UserMessageSummaryVO;
import com.spacetime.common.dto.PageReq;

/** App 用户管理中的消息互动只读查询。 */
public interface AppUserMessageAdminService {
    UserMessageSummaryVO summary(Long userId);
    Page<AdminPrivateMessageVO> privateMessages(Long userId, PageReq req);
    Page<AdminConversationVO> conversations(Long userId, PageReq req);
    Page<AdminWhisperVO> whispers(Long userId, PageReq req);
    Page<AdminPlatformMessageVO> platformMessages(Long userId, PageReq req);
    Page<AdminSystemMessageVO> systemMessages(Long userId, PageReq req);
    Page<AdminReportLinkVO> reports(Long userId, PageReq req);
    AdminSensitiveMessageContentVO viewPrivateMessageContent(
            Long userId, String messageNo, SensitiveContentViewReq req);
    AdminSensitiveMessageContentVO viewWhisperContent(
            Long userId, String whisperNo, SensitiveContentViewReq req);
}
