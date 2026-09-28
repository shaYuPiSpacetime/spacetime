package com.spacetime.common.mapper;

import com.spacetime.common.website.WebsiteData;
import org.apache.ibatis.annotations.*;

import java.util.List;

/** 官网活动业务 SQL；所有查询显式限制删除状态。 */
@Mapper
public interface WebsiteMapper {
    @Select("SELECT * FROM website_user WHERE id=#{id} AND deleted=0")
    WebsiteData.User user(@Param("id") Long id);

    @Select("SELECT * FROM website_user WHERE phone=#{phone} AND deleted=0")
    WebsiteData.User userByPhone(@Param("phone") String phone);

    @Insert("INSERT IGNORE INTO website_user(phone,nickname,status,create_time,update_time,deleted) " +
            "VALUES(#{phone},#{nickname},'ACTIVE',NOW(),NOW(),0)")
    @Options(useGeneratedKeys = true, keyProperty = "id")
    void insertUser(WebsiteData.User user);

    @Insert("INSERT INTO website_agreement_acceptance(user_id,agreement_version,privacy_version,request_ip,accepted_at,create_time,update_time,deleted) " +
            "VALUES(#{userId},#{agreementVersion},#{privacyVersion},#{ip},NOW(),NOW(),NOW(),0)")
    void acceptAgreement(@Param("userId") Long userId, @Param("agreementVersion") String agreementVersion,
                         @Param("privacyVersion") String privacyVersion, @Param("ip") String ip);

    @Select("SELECT * FROM website_legal_document WHERE document_type=#{type} AND status='PUBLISHED' AND deleted=0 ORDER BY id DESC LIMIT 1")
    WebsiteData.LegalDocument legal(@Param("type") String type);

    @Select("SELECT * FROM website_activity WHERE id=#{id} AND deleted=0")
    WebsiteData.Activity activity(@Param("id") Long id);

    @Select("SELECT * FROM website_activity WHERE status='APPROVED' AND start_time>NOW() AND deleted=0 ORDER BY start_time ASC LIMIT #{offset},#{size}")
    List<WebsiteData.Activity> publicActivities(@Param("offset") int offset, @Param("size") int size);

    @Select("SELECT * FROM website_activity WHERE author_id=#{userId} AND deleted=0 ORDER BY id DESC LIMIT 100")
    List<WebsiteData.Activity> userActivities(@Param("userId") Long userId);

    @Select("SELECT * FROM website_activity WHERE deleted=0 ORDER BY id DESC LIMIT #{offset},#{size}")
    List<WebsiteData.Activity> adminActivities(@Param("offset") int offset, @Param("size") int size);

    @Insert("INSERT INTO website_activity(author_id,title,content,start_time,location,estimated_cost,status,create_time,update_time,created_by,deleted) " +
            "VALUES(#{authorId},#{title},#{content},#{startTime},#{location},#{estimatedCost},#{status},NOW(),NOW(),#{authorId},0)")
    @Options(useGeneratedKeys = true, keyProperty = "id")
    void insertActivity(WebsiteData.Activity activity);

    @Update("UPDATE website_activity SET status=#{status},audit_note=#{note},update_time=NOW() WHERE id=#{id} AND deleted=0")
    void updateActivityStatus(@Param("id") Long id, @Param("status") String status, @Param("note") String note);

    @Select("SELECT * FROM website_registration WHERE activity_id=#{activityId} AND user_id=#{userId} AND deleted=0")
    WebsiteData.Registration registration(@Param("activityId") Long activityId, @Param("userId") Long userId);

    @Select("SELECT * FROM website_registration WHERE user_id=#{userId} AND deleted=0 ORDER BY id DESC LIMIT 100")
    List<WebsiteData.Registration> registrations(@Param("userId") Long userId);

    @Select("SELECT u.* FROM website_user u JOIN website_registration r ON r.user_id=u.id " +
            "WHERE r.activity_id=#{activityId} AND r.status='REGISTERED' AND r.deleted=0 AND u.deleted=0 ORDER BY r.id DESC LIMIT 100")
    List<WebsiteData.User> participants(@Param("activityId") Long activityId);

    @Insert("INSERT IGNORE INTO website_registration(activity_id,user_id,status,create_time,update_time,created_by,deleted) " +
            "VALUES(#{activityId},#{userId},'REGISTERED',NOW(),NOW(),#{userId},0)")
    @Options(useGeneratedKeys = true, keyProperty = "id")
    void insertRegistration(WebsiteData.Registration registration);

    @Select("SELECT * FROM website_conversation WHERE id=#{id} AND deleted=0")
    WebsiteData.Conversation conversation(@Param("id") Long id);

    @Select("SELECT * FROM website_conversation WHERE activity_id=#{activityId} AND user_low_id=#{lowId} AND user_high_id=#{highId} AND deleted=0")
    WebsiteData.Conversation conversationByPair(@Param("activityId") Long activityId,
                                                @Param("lowId") Long lowId, @Param("highId") Long highId);

    @Select("SELECT * FROM website_conversation WHERE (user_low_id=#{userId} OR user_high_id=#{userId}) AND deleted=0 ORDER BY id DESC LIMIT 100")
    List<WebsiteData.Conversation> conversations(@Param("userId") Long userId);

    @Insert("INSERT IGNORE INTO website_conversation(activity_id,user_low_id,user_high_id,create_time,update_time,deleted) " +
            "VALUES(#{activityId},#{userLowId},#{userHighId},NOW(),NOW(),0)")
    @Options(useGeneratedKeys = true, keyProperty = "id")
    void insertConversation(WebsiteData.Conversation conversation);

    @Select("SELECT * FROM website_message WHERE id=#{id} AND deleted=0")
    WebsiteData.Message message(@Param("id") Long id);

    @Select("SELECT * FROM (SELECT * FROM website_message WHERE conversation_id=#{conversationId} AND deleted=0 ORDER BY id DESC LIMIT 200) latest ORDER BY id ASC")
    List<WebsiteData.Message> messages(@Param("conversationId") Long conversationId);

    @Select("SELECT * FROM website_message WHERE deleted=0 ORDER BY id DESC LIMIT #{offset},#{size}")
    List<WebsiteData.Message> adminMessages(@Param("offset") int offset, @Param("size") int size);

    @Insert("INSERT INTO website_message(conversation_id,sender_id,message_type,content_text,media_id,status,create_time,update_time,created_by,deleted) " +
            "VALUES(#{conversationId},#{senderId},#{messageType},#{contentText},#{mediaId},#{status},NOW(),NOW(),#{senderId},0)")
    @Options(useGeneratedKeys = true, keyProperty = "id")
    void insertMessage(WebsiteData.Message message);

    @Update("UPDATE website_message SET status=#{status},update_time=NOW() WHERE id=#{id} AND deleted=0")
    void updateMessageStatus(@Param("id") Long id, @Param("status") String status);

    @Select("SELECT * FROM website_media WHERE id=#{id} AND deleted=0")
    WebsiteData.Media media(@Param("id") Long id);

    @Select("SELECT * FROM website_media WHERE target_type=#{targetType} AND target_id=#{targetId} AND deleted=0 ORDER BY id ASC")
    List<WebsiteData.Media> mediaFor(@Param("targetType") String targetType, @Param("targetId") Long targetId);

    @Insert("INSERT INTO website_media(owner_id,object_key,status,create_time,update_time,created_by,deleted) " +
            "VALUES(#{ownerId},#{objectKey},'UPLOADED',NOW(),NOW(),#{ownerId},0)")
    @Options(useGeneratedKeys = true, keyProperty = "id")
    void insertMedia(WebsiteData.Media media);

    @Update("UPDATE website_media SET target_type=#{targetType},target_id=#{targetId},status='PENDING',update_time=NOW() " +
            "WHERE id=#{id} AND status='UPLOADED' AND deleted=0")
    int bindMedia(@Param("id") Long id, @Param("targetType") String targetType, @Param("targetId") Long targetId);

    @Update("UPDATE website_media SET status=#{status},update_time=NOW() WHERE id=#{id} AND deleted=0")
    void updateMediaStatus(@Param("id") Long id, @Param("status") String status);

    @Select("SELECT * FROM website_report WHERE id=#{id} AND deleted=0")
    WebsiteData.Report report(@Param("id") Long id);

    @Select("SELECT * FROM website_report WHERE deleted=0 ORDER BY id DESC LIMIT #{offset},#{size}")
    List<WebsiteData.Report> reports(@Param("offset") int offset, @Param("size") int size);

    @Insert("INSERT INTO website_report(reporter_id,target_type,target_id,reason,contact,status,create_time,update_time,created_by,deleted) " +
            "VALUES(#{reporterId},#{targetType},#{targetId},#{reason},#{contact},'OPEN',NOW(),NOW(),#{reporterId},0)")
    @Options(useGeneratedKeys = true, keyProperty = "id")
    void insertReport(WebsiteData.Report report);

    @Update("UPDATE website_report SET status='RESOLVED',resolution=#{resolution},update_time=NOW() WHERE id=#{id} AND deleted=0")
    void resolveReport(@Param("id") Long id, @Param("resolution") String resolution);

    @Insert("INSERT INTO website_audit_log(actor_type,actor_id,action,target_type,target_id,request_ip,user_agent,remark,retain_until,create_time,update_time,deleted) " +
            "VALUES(#{actorType},#{actorId},#{action},#{targetType},#{targetId},#{requestIp},#{userAgent},#{remark},#{retainUntil},NOW(),NOW(),0)")
    void insertAudit(WebsiteData.AuditLog log);

    @Select("SELECT * FROM website_audit_log WHERE deleted=0 ORDER BY id DESC LIMIT #{offset},#{size}")
    List<WebsiteData.AuditLog> audits(@Param("offset") int offset, @Param("size") int size);
}
