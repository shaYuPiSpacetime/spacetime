package com.spacetime.common.dao;

import com.spacetime.common.website.WebsiteData;

import java.util.List;

/** 官网持久化边界；后台和官网共同使用，避免模块互相依赖。 */
public interface WebsiteDao {
    WebsiteData.User user(Long id);
    WebsiteData.User userByPhone(String phone);
    void insertUser(WebsiteData.User user);
    void acceptAgreement(Long userId, String agreementVersion, String privacyVersion, String ip);
    WebsiteData.LegalDocument legal(String type);
    WebsiteData.Activity activity(Long id);
    List<WebsiteData.Activity> publicActivities(int offset, int size);
    List<WebsiteData.Activity> userActivities(Long userId);
    List<WebsiteData.Activity> adminActivities(int offset, int size);
    void insertActivity(WebsiteData.Activity activity);
    void updateActivityStatus(Long id, String status, String note);
    WebsiteData.Registration registration(Long activityId, Long userId);
    List<WebsiteData.Registration> registrations(Long userId);
    List<WebsiteData.User> participants(Long activityId);
    void insertRegistration(WebsiteData.Registration registration);
    WebsiteData.Conversation conversation(Long id);
    WebsiteData.Conversation conversationByPair(Long activityId, Long lowId, Long highId);
    List<WebsiteData.Conversation> conversations(Long userId);
    void insertConversation(WebsiteData.Conversation conversation);
    WebsiteData.Message message(Long id);
    List<WebsiteData.Message> messages(Long conversationId);
    List<WebsiteData.Message> adminMessages(int offset, int size);
    void insertMessage(WebsiteData.Message message);
    void updateMessageStatus(Long id, String status);
    WebsiteData.Media media(Long id);
    List<WebsiteData.Media> mediaFor(String targetType, Long targetId);
    void insertMedia(WebsiteData.Media media);
    int bindMedia(Long id, String targetType, Long targetId);
    void updateMediaStatus(Long id, String status);
    WebsiteData.Report report(Long id);
    List<WebsiteData.Report> reports(int offset, int size);
    void insertReport(WebsiteData.Report report);
    void resolveReport(Long id, String resolution);
    void insertAudit(WebsiteData.AuditLog log);
    List<WebsiteData.AuditLog> audits(int offset, int size);
}
