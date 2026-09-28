package com.spacetime.admin.service;

import com.spacetime.common.website.WebsiteData;

import java.time.LocalDateTime;
import java.util.List;

/** 官网审核后台服务。 */
public interface WebsiteAdminService {
    record AdminActivityView(WebsiteData.Activity activity, String authorName, List<String> imageUrls) {}
    record AdminMessageView(Long id, Long conversationId, Long senderId, String messageType,
                            String status, LocalDateTime createTime) {}
    record SensitiveMessageView(Long id, String messageType, String content, String imageUrl) {}
    List<AdminActivityView> activities(int page, int size);
    void moderateActivity(Long id, String status, String reason);
    List<AdminMessageView> messages(int page, int size);
    SensitiveMessageView viewMessage(Long id, String reason);
    void moderateMessage(Long id, String status, String reason);
    String exportMessages(String reason);
    List<WebsiteData.Report> reports(int page, int size);
    void resolveReport(Long id, String resolution);
    List<WebsiteData.AuditLog> audits(int page, int size);
}
