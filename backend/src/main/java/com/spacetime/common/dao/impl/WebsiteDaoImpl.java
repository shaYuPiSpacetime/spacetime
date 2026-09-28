package com.spacetime.common.dao.impl;

import com.spacetime.common.dao.WebsiteDao;
import com.spacetime.common.mapper.WebsiteMapper;
import com.spacetime.common.website.WebsiteData;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;

/** 官网业务 DAO 实现。 */
@Repository
@RequiredArgsConstructor
public class WebsiteDaoImpl implements WebsiteDao {
    private final WebsiteMapper mapper;
    public WebsiteData.User user(Long id) { return mapper.user(id); }
    public WebsiteData.User userByPhone(String phone) { return mapper.userByPhone(phone); }
    public void insertUser(WebsiteData.User user) { mapper.insertUser(user); }
    public void acceptAgreement(Long userId, String agreementVersion, String privacyVersion, String ip) {
        mapper.acceptAgreement(userId, agreementVersion, privacyVersion, ip);
    }
    public WebsiteData.LegalDocument legal(String type) { return mapper.legal(type); }
    public WebsiteData.Activity activity(Long id) { return mapper.activity(id); }
    public List<WebsiteData.Activity> publicActivities(int offset, int size) { return mapper.publicActivities(offset, size); }
    public List<WebsiteData.Activity> userActivities(Long userId) { return mapper.userActivities(userId); }
    public List<WebsiteData.Activity> adminActivities(int offset, int size) { return mapper.adminActivities(offset, size); }
    public void insertActivity(WebsiteData.Activity activity) { mapper.insertActivity(activity); }
    public void updateActivityStatus(Long id, String status, String note) { mapper.updateActivityStatus(id, status, note); }
    public WebsiteData.Registration registration(Long activityId, Long userId) { return mapper.registration(activityId, userId); }
    public List<WebsiteData.Registration> registrations(Long userId) { return mapper.registrations(userId); }
    public List<WebsiteData.User> participants(Long activityId) { return mapper.participants(activityId); }
    public void insertRegistration(WebsiteData.Registration registration) { mapper.insertRegistration(registration); }
    public WebsiteData.Conversation conversation(Long id) { return mapper.conversation(id); }
    public WebsiteData.Conversation conversationByPair(Long activityId, Long lowId, Long highId) {
        return mapper.conversationByPair(activityId, lowId, highId);
    }
    public List<WebsiteData.Conversation> conversations(Long userId) { return mapper.conversations(userId); }
    public void insertConversation(WebsiteData.Conversation conversation) { mapper.insertConversation(conversation); }
    public WebsiteData.Message message(Long id) { return mapper.message(id); }
    public List<WebsiteData.Message> messages(Long conversationId) { return mapper.messages(conversationId); }
    public List<WebsiteData.Message> adminMessages(int offset, int size) { return mapper.adminMessages(offset, size); }
    public void insertMessage(WebsiteData.Message message) { mapper.insertMessage(message); }
    public void updateMessageStatus(Long id, String status) { mapper.updateMessageStatus(id, status); }
    public WebsiteData.Media media(Long id) { return mapper.media(id); }
    public List<WebsiteData.Media> mediaFor(String targetType, Long targetId) { return mapper.mediaFor(targetType, targetId); }
    public void insertMedia(WebsiteData.Media media) { mapper.insertMedia(media); }
    public int bindMedia(Long id, String targetType, Long targetId) { return mapper.bindMedia(id, targetType, targetId); }
    public void updateMediaStatus(Long id, String status) { mapper.updateMediaStatus(id, status); }
    public WebsiteData.Report report(Long id) { return mapper.report(id); }
    public List<WebsiteData.Report> reports(int offset, int size) { return mapper.reports(offset, size); }
    public void insertReport(WebsiteData.Report report) { mapper.insertReport(report); }
    public void resolveReport(Long id, String resolution) { mapper.resolveReport(id, resolution); }
    public void insertAudit(WebsiteData.AuditLog log) { mapper.insertAudit(log); }
    public List<WebsiteData.AuditLog> audits(int offset, int size) { return mapper.audits(offset, size); }
}
