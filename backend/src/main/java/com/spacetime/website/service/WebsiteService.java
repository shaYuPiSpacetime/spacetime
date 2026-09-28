package com.spacetime.website.service;

import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/** 官网用户服务接口。 */
public interface WebsiteService {
    record LegalView(String type, String title, String version, String content) {}
    record UserView(Long id, String nickname, String phoneMasked) {}
    record LoginRequest(String phone, String code, boolean agreementAccepted,
                        String agreementVersion, String privacyVersion) {}
    record LoginSession(String token, String csrfToken, UserView user) {}
    record SessionView(UserView user, String csrfToken) {}
    record ActivityCreateRequest(String title, String content, LocalDateTime startTime,
                                 String location, BigDecimal estimatedCost, List<Long> imageIds) {}
    record MediaView(Long id, String url, String status) {}
    record ActivityView(Long id, Long authorId, String authorName, String title, String content,
                        LocalDateTime startTime, String location, BigDecimal estimatedCost,
                        String status, String auditNote, List<MediaView> images) {}
    record RegistrationView(Long id, String status, ActivityView activity) {}
    record ConversationView(Long id, Long activityId, String activityTitle, Long peerId, String peerName) {}
    record MessageCreateRequest(String type, String content, Long mediaId) {}
    record MessageView(Long id, Long conversationId, Long senderId, String type, String content,
                       String imageUrl, String status, LocalDateTime createTime) {}
    record MediaUploadView(Long id, String previewUrl) {}
    record PublicMediaView(String contentType, byte[] bytes) {}
    record ReportRequest(String targetType, Long targetId, String reason) {}

    LegalView legal(String type);
    void sendCode(String phone);
    LoginSession login(LoginRequest request);
    void logout(String token);
    UserView me(Long userId);
    List<ActivityView> activities(int page, int size);
    ActivityView activity(Long id, Long viewerId);
    List<ActivityView> myActivities(Long userId);
    ActivityView publish(Long userId, ActivityCreateRequest request);
    RegistrationView register(Long userId, Long activityId);
    List<RegistrationView> myRegistrations(Long userId);
    List<UserView> participants(Long userId, Long activityId);
    ConversationView startConversation(Long userId, Long activityId, Long peerId);
    List<ConversationView> conversations(Long userId);
    List<MessageView> messages(Long userId, Long conversationId);
    MessageView sendMessage(Long userId, Long conversationId, MessageCreateRequest request);
    MediaUploadView upload(Long userId, MultipartFile file);
    PublicMediaView publicMedia(Long mediaId);
    PublicMediaView privateMedia(Long userId, Long mediaId);
    Long report(Long userId, ReportRequest request);
}
