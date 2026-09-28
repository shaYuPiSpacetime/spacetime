package com.spacetime.website.service.impl;

import com.spacetime.common.dao.WebsiteDao;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.provider.SmsCodeProvider;
import com.spacetime.common.service.LocalSensitiveWordService;
import com.spacetime.common.util.OssUtil;
import com.spacetime.common.website.WebsiteData;
import com.spacetime.website.WebsitePolicy;
import com.spacetime.common.website.WebsiteRequestInfo;
import com.spacetime.website.auth.WebsiteSessionInterceptor;
import com.spacetime.website.service.WebsiteService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;

/** 官网独立业务服务；网站用户、帖子与聊天均不引用小程序数据。 */
@Service
@RequiredArgsConstructor
public class WebsiteServiceImpl implements WebsiteService {
    private static final String CODE_PREFIX = "website:sms:code:";
    private static final String COOLDOWN_PREFIX = "website:sms:cooldown:";
    private static final String ATTEMPT_PREFIX = "website:sms:attempt:";
    private static final int MAX_IMAGE_BYTES = 5 * 1024 * 1024;
    private final WebsiteDao dao;
    private final StringRedisTemplate redis;
    private final SmsCodeProvider sms;
    private final LocalSensitiveWordService sensitiveWords;
    private final OssUtil oss;
    private final WebsiteFailureAuditService failureAudit;

    @Override
    public LegalView legal(String type) {
        if (!"USER_AGREEMENT".equals(type) && !"PRIVACY_POLICY".equals(type)) {
            throw new BusinessException("协议类型不存在");
        }
        WebsiteData.LegalDocument document = dao.legal(type);
        if (document == null || document.getContent() == null || document.getContent().isBlank()) {
            throw new BusinessException("协议正文尚未发布");
        }
        return new LegalView(type, document.getTitle(), document.getVersion(), document.getContent());
    }

    @Override
    public void sendCode(String phone) {
        requirePhone(phone);
        boolean cooldown = Boolean.TRUE.equals(redis.opsForValue().setIfAbsent(COOLDOWN_PREFIX + phone, "1", Duration.ofSeconds(60)));
        if (!cooldown) throw new BusinessException("请稍后再获取验证码");
        String dailyKey = "website:sms:daily:" + LocalDateTime.now().toLocalDate() + ":" + phone;
        Long count = redis.opsForValue().increment(dailyKey);
        if (count != null && count == 1) redis.expire(dailyKey, Duration.ofDays(2));
        if (count == null || count > 10) throw new BusinessException("今日验证码次数已达上限");
        String code = sms.generateCode();
        try {
            sms.sendLoginCode(phone, code, 5);
            redis.opsForValue().set(CODE_PREFIX + phone, code, Duration.ofMinutes(5));
            audit("USER", null, "SMS_SENT", "USER", null);
        } catch (RuntimeException ex) {
            redis.delete(COOLDOWN_PREFIX + phone);
            throw new BusinessException("验证码发送失败，请稍后重试");
        }
    }

    @Override
    @Transactional
    public LoginSession login(LoginRequest request) {
        if (request == null) throw new BusinessException("登录信息不能为空");
        requirePhone(request.phone());
        if (!request.agreementAccepted()) throw new BusinessException("请先阅读并同意用户协议和隐私政策");
        LegalView agreement = legal("USER_AGREEMENT");
        LegalView privacy = legal("PRIVACY_POLICY");
        if (!agreement.version().equals(request.agreementVersion()) || !privacy.version().equals(request.privacyVersion())) {
            throw new BusinessException("协议已更新，请重新阅读并同意");
        }
        String phone = request.phone();
        Long attempts = redis.opsForValue().increment(ATTEMPT_PREFIX + phone);
        if (attempts != null && attempts == 1) redis.expire(ATTEMPT_PREFIX + phone, Duration.ofMinutes(5));
        if (attempts == null || attempts > 5) throw new BusinessException("验证码尝试次数过多，请稍后再试");
        String saved = redis.opsForValue().get(CODE_PREFIX + phone);
        if (saved == null || request.code() == null || !saved.equals(request.code().trim())) {
            HttpServletRequest httpRequest = currentRequest();
            failureAudit.loginFailed(requestIp(), httpRequest == null ? null : httpRequest.getHeader("User-Agent"));
            throw new BusinessException("验证码错误或已过期");
        }
        WebsiteData.User user = dao.userByPhone(phone);
        if (user == null) {
            user = new WebsiteData.User();
            user.setPhone(phone);
            user.setNickname("活动用户" + phone.substring(7));
            user.setStatus("ACTIVE");
            dao.insertUser(user);
            user = dao.userByPhone(phone);
            if (user == null) throw new BusinessException("注册失败，请稍后重试");
        }
        if (!"ACTIVE".equals(user.getStatus())) throw new BusinessException("账号已被停用");
        dao.acceptAgreement(user.getId(), agreement.version(), privacy.version(), requestIp());
        String token = randomToken();
        String csrf = randomToken();
        redis.opsForValue().set(WebsiteSessionInterceptor.REDIS_PREFIX + token,
                user.getId() + "|" + csrf, Duration.ofDays(7));
        redis.delete(CODE_PREFIX + phone);
        redis.delete(ATTEMPT_PREFIX + phone);
        audit("USER", user.getId(), "LOGIN", "USER", user.getId());
        return new LoginSession(token, csrf, userView(user));
    }

    @Override
    public void logout(String token) {
        if (token != null && token.matches("[a-f0-9]{32}")) redis.delete(WebsiteSessionInterceptor.REDIS_PREFIX + token);
    }

    @Override
    public UserView me(Long userId) { return userView(requireActiveUser(userId)); }

    @Override
    public List<ActivityView> activities(int page, int size) {
        int normalizedSize = Math.min(Math.max(size, 1), 50);
        int offset = (Math.max(page, 1) - 1) * normalizedSize;
        return dao.publicActivities(offset, normalizedSize).stream().map(item -> activityView(item, false)).toList();
    }

    @Override
    public ActivityView activity(Long id, Long viewerId) {
        WebsiteData.Activity item = requireActivity(id);
        boolean owner = viewerId != null && viewerId.equals(item.getAuthorId());
        if (!"APPROVED".equals(item.getStatus()) && !owner) throw new BusinessException(404, "活动不存在或待审核");
        return activityView(item, owner);
    }

    @Override
    public List<ActivityView> myActivities(Long userId) {
        requireActiveUser(userId);
        return dao.userActivities(userId).stream().map(item -> activityView(item, true)).toList();
    }

    @Override
    @Transactional
    public ActivityView publish(Long userId, ActivityCreateRequest request) {
        requireActiveUser(userId);
        if (request == null) throw new BusinessException("活动信息不能为空");
        WebsitePolicy.validateActivity(request.title(), request.content(), request.startTime(), request.location(),
                request.estimatedCost(), request.imageIds());
        if (new HashSet<>(request.imageIds()).size() != request.imageIds().size()) throw new BusinessException("图片不能重复");
        safe(request.title() + " " + request.content() + " " + request.location());
        for (Long mediaId : request.imageIds()) requireUnboundMedia(userId, mediaId);
        WebsiteData.Activity item = new WebsiteData.Activity();
        item.setAuthorId(userId);
        item.setTitle(request.title().trim());
        item.setContent(request.content().trim());
        item.setStartTime(request.startTime());
        item.setLocation(request.location().trim());
        item.setEstimatedCost(request.estimatedCost());
        item.setStatus("PENDING");
        dao.insertActivity(item);
        for (Long mediaId : request.imageIds()) {
            if (dao.bindMedia(mediaId, "ACTIVITY", item.getId()) != 1) throw new BusinessException("图片已被使用，请重新上传");
        }
        audit("USER", userId, "ACTIVITY_PUBLISHED", "ACTIVITY", item.getId());
        return activityView(item, true);
    }

    @Override
    @Transactional
    public RegistrationView register(Long userId, Long activityId) {
        requireActiveUser(userId);
        WebsiteData.Activity item = requireActivity(activityId);
        if (!"APPROVED".equals(item.getStatus()) || !item.getStartTime().isAfter(LocalDateTime.now())) {
            throw new BusinessException("活动不可报名");
        }
        if (userId.equals(item.getAuthorId())) throw new BusinessException("不能报名自己发布的活动");
        WebsiteData.Registration registration = dao.registration(activityId, userId);
        if (registration == null) {
            registration = new WebsiteData.Registration();
            registration.setActivityId(activityId);
            registration.setUserId(userId);
            dao.insertRegistration(registration);
            registration = dao.registration(activityId, userId);
            audit("USER", userId, "ACTIVITY_REGISTERED", "ACTIVITY", activityId);
        }
        return new RegistrationView(registration.getId(), registration.getStatus(), activityView(item, false));
    }

    @Override
    public List<RegistrationView> myRegistrations(Long userId) {
        requireActiveUser(userId);
        return dao.registrations(userId).stream().map(r -> {
            WebsiteData.Activity item = dao.activity(r.getActivityId());
            return new RegistrationView(r.getId(), r.getStatus(), item == null ? null : activityView(item, false));
        }).toList();
    }

    @Override
    public List<UserView> participants(Long userId, Long activityId) {
        requireActiveUser(userId);
        WebsiteData.Activity item = requireActivity(activityId);
        if (!"APPROVED".equals(item.getStatus())) throw new BusinessException("活动未开放");
        if (!userId.equals(item.getAuthorId()) && dao.registration(activityId, userId) == null) {
            throw new BusinessException(403, "报名后才可查看参与者");
        }
        return dao.participants(activityId).stream().map(this::userView).toList();
    }

    @Override
    @Transactional
    public ConversationView startConversation(Long userId, Long activityId, Long peerId) {
        requireActiveUser(userId);
        WebsiteData.User peer = requireActiveUser(peerId);
        WebsiteData.Activity item = requireActivity(activityId);
        if (!"APPROVED".equals(item.getStatus())) throw new BusinessException("活动未开放");
        boolean currentRegistered = dao.registration(activityId, userId) != null;
        boolean peerRegistered = dao.registration(activityId, peerId) != null;
        if (!WebsitePolicy.canChat(userId, peerId, item.getAuthorId(), currentRegistered, peerRegistered)) {
            throw new BusinessException(403, "仅能与活动发布者或同场报名者沟通");
        }
        Long low = Math.min(userId, peerId), high = Math.max(userId, peerId);
        WebsiteData.Conversation conversation = dao.conversationByPair(activityId, low, high);
        if (conversation == null) {
            conversation = new WebsiteData.Conversation();
            conversation.setActivityId(activityId);
            conversation.setUserLowId(low);
            conversation.setUserHighId(high);
            dao.insertConversation(conversation);
            conversation = dao.conversationByPair(activityId, low, high);
            audit("USER", userId, "CHAT_STARTED", "CONVERSATION", conversation.getId());
        }
        return new ConversationView(conversation.getId(), activityId, item.getTitle(), peerId, peer.getNickname());
    }

    @Override
    public List<ConversationView> conversations(Long userId) {
        requireActiveUser(userId);
        return dao.conversations(userId).stream().map(item -> conversationView(item, userId)).toList();
    }

    @Override
    public List<MessageView> messages(Long userId, Long conversationId) {
        requireMember(conversationId, userId);
        return dao.messages(conversationId).stream()
                .filter(item -> "APPROVED".equals(item.getStatus())
                        || ("PENDING".equals(item.getStatus()) && userId.equals(item.getSenderId())))
                .map(this::messageView).toList();
    }

    @Override
    @Transactional
    public MessageView sendMessage(Long userId, Long conversationId, MessageCreateRequest request) {
        requireActiveUser(userId);
        WebsiteData.Conversation conversation = requireMember(conversationId, userId);
        WebsiteData.Activity activity = requireActivity(conversation.getActivityId());
        if (!"APPROVED".equals(activity.getStatus())) throw new BusinessException("活动已下架，不能继续发消息");
        if (request == null || request.type() == null) throw new BusinessException("消息类型不能为空");
        WebsiteData.Message message = new WebsiteData.Message();
        message.setConversationId(conversationId);
        message.setSenderId(userId);
        if ("TEXT".equals(request.type())) {
            if (request.content() == null || request.content().isBlank() || request.content().length() > 500) {
                throw new BusinessException("文字消息长度应为1至500字");
            }
            safe(request.content());
            message.setMessageType("TEXT");
            message.setContentText(request.content().trim());
            message.setStatus("APPROVED");
        } else if ("IMAGE".equals(request.type())) {
            requireUnboundMedia(userId, request.mediaId());
            message.setMessageType("IMAGE");
            message.setMediaId(request.mediaId());
            message.setStatus("PENDING");
        } else throw new BusinessException("不支持的消息类型");
        dao.insertMessage(message);
        if (message.getMediaId() != null && dao.bindMedia(message.getMediaId(), "MESSAGE", message.getId()) != 1) {
            throw new BusinessException("图片已被使用，请重新上传");
        }
        audit("USER", userId, "MESSAGE_SENT", "MESSAGE", message.getId());
        return messageView(message);
    }

    @Override
    public MediaUploadView upload(Long userId, MultipartFile file) {
        requireActiveUser(userId);
        if (file == null || file.isEmpty() || file.getSize() > MAX_IMAGE_BYTES) {
            throw new BusinessException("图片必须小于5MB");
        }
        String original = file.getOriginalFilename();
        if (original == null || !original.toLowerCase(Locale.ROOT).matches(".*\\.(png|jpg|jpeg)$")) {
            throw new BusinessException("仅支持 PNG 或 JPEG 图片");
        }
        try {
            byte[] bytes = file.getBytes();
            if (bytes.length > MAX_IMAGE_BYTES) throw new BusinessException("图片必须小于5MB");
            try (ImageInputStream imageStream = ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
                if (imageStream == null) throw new BusinessException("图片格式不正确");
                Iterator<ImageReader> readers = ImageIO.getImageReaders(imageStream);
                if (!readers.hasNext()) throw new BusinessException("图片格式不正确");
                ImageReader reader = readers.next();
                try {
                    reader.setInput(imageStream);
                    String format = reader.getFormatName().toLowerCase(Locale.ROOT);
                    if (!Set.of("png", "jpeg", "jpg").contains(format)) throw new BusinessException("仅支持 PNG 或 JPEG 图片");
                    boolean pngName = original.toLowerCase(Locale.ROOT).endsWith(".png");
                    if (pngName != "png".equals(format)) throw new BusinessException("图片扩展名与实际格式不一致");
                    if (reader.getWidth(0) > 10000 || reader.getHeight(0) > 10000) {
                        throw new BusinessException("图片尺寸过大");
                    }
                } finally { reader.dispose(); }
            }
            String key = oss.uploadWithKey(new ByteArrayInputStream(bytes), original, "website/" + userId);
            WebsiteData.Media media = new WebsiteData.Media();
            media.setOwnerId(userId);
            media.setObjectKey(key);
            media.setStatus("UPLOADED");
            dao.insertMedia(media);
            audit("USER", userId, "MEDIA_UPLOADED", "MEDIA", media.getId());
            return new MediaUploadView(media.getId(), "/api/website/private-media/" + media.getId());
        } catch (IOException ex) {
            throw new BusinessException("图片读取失败，请重试");
        }
    }

    @Override
    public PublicMediaView publicMedia(Long mediaId) {
        WebsiteData.Media media = mediaId == null ? null : dao.media(mediaId);
        if (media == null || !"APPROVED".equals(media.getStatus())) {
            throw new BusinessException(404, "图片不存在或未审核");
        }
        if (!"ACTIVITY".equals(media.getTargetType())) throw new BusinessException(404, "图片不可公开访问");
        WebsiteData.Activity activity = dao.activity(media.getTargetId());
        if (activity == null || !"APPROVED".equals(activity.getStatus())) {
            throw new BusinessException(404, "活动图片不可用");
        }
        return readMedia(media);
    }

    @Override
    public PublicMediaView privateMedia(Long userId, Long mediaId) {
        requireActiveUser(userId);
        WebsiteData.Media media = mediaId == null ? null : dao.media(mediaId);
        if (media == null) throw new BusinessException(404, "图片不存在");
        if (media.getTargetType() == null && userId.equals(media.getOwnerId())
                && "UPLOADED".equals(media.getStatus())) return readMedia(media);
        if ("ACTIVITY".equals(media.getTargetType())) {
            WebsiteData.Activity activity = dao.activity(media.getTargetId());
            if (activity != null && userId.equals(activity.getAuthorId())
                    && Set.of("PENDING", "APPROVED").contains(media.getStatus())) return readMedia(media);
            throw new BusinessException(403, "无权查看活动图片");
        }
        if (!"MESSAGE".equals(media.getTargetType())) throw new BusinessException(404, "图片不存在");
        WebsiteData.Message message = dao.message(media.getTargetId());
        if (message == null || !mediaId.equals(message.getMediaId())) throw new BusinessException(404, "图片不存在");
        requireMember(message.getConversationId(), userId);
        if (!("APPROVED".equals(message.getStatus()) && "APPROVED".equals(media.getStatus())) &&
                !("PENDING".equals(message.getStatus()) && "PENDING".equals(media.getStatus())
                        && userId.equals(message.getSenderId()))) {
            throw new BusinessException(403, "图片尚未送达或已移除");
        }
        return readMedia(media);
    }

    private PublicMediaView readMedia(WebsiteData.Media media) {
        String contentType = media.getObjectKey().toLowerCase(Locale.ROOT).endsWith(".png") ? "image/png" : "image/jpeg";
        return new PublicMediaView(contentType, oss.readWebsiteObject(media.getObjectKey(), MAX_IMAGE_BYTES));
    }

    @Override
    @Transactional
    public Long report(Long userId, ReportRequest request) {
        requireActiveUser(userId);
        if (request == null || request.targetType() == null ||
                !Set.of("ACTIVITY", "MESSAGE", "USER", "OTHER").contains(request.targetType()) ||
                request.reason() == null || request.reason().isBlank() || request.reason().length() > 1000) {
            throw new BusinessException("请填写举报对象和原因");
        }
        if (!"OTHER".equals(request.targetType()) && (request.targetId() == null || request.targetId() <= 0)) {
            throw new BusinessException("请选择有效的举报对象");
        }
        if ("MESSAGE".equals(request.targetType())) {
            WebsiteData.Message message = dao.message(request.targetId());
            if (message == null) throw new BusinessException("消息不存在");
            requireMember(message.getConversationId(), userId);
        } else if ("ACTIVITY".equals(request.targetType()) && dao.activity(request.targetId()) == null) {
            throw new BusinessException("活动不存在");
        } else if ("USER".equals(request.targetType()) && dao.user(request.targetId()) == null) {
            throw new BusinessException("用户不存在");
        }
        WebsiteData.Report report = new WebsiteData.Report();
        report.setReporterId(userId);
        report.setTargetType(request.targetType());
        report.setTargetId(request.targetId());
        report.setReason(request.reason().trim());
        report.setStatus("OPEN");
        dao.insertReport(report);
        audit("USER", userId, "REPORT_SUBMITTED", "REPORT", report.getId());
        return report.getId();
    }

    private void safe(String text) { WebsitePolicy.requireSafeText(sensitiveWords.checkText(text)); }

    private WebsiteData.User requireActiveUser(Long id) {
        WebsiteData.User user = id == null ? null : dao.user(id);
        if (user == null || !"ACTIVE".equals(user.getStatus())) throw new BusinessException(401, "网站用户不存在或已停用");
        return user;
    }

    private WebsiteData.Activity requireActivity(Long id) {
        WebsiteData.Activity item = id == null ? null : dao.activity(id);
        if (item == null) throw new BusinessException(404, "活动不存在");
        return item;
    }

    private WebsiteData.Conversation requireMember(Long id, Long userId) {
        WebsiteData.Conversation item = id == null ? null : dao.conversation(id);
        if (item == null || (!userId.equals(item.getUserLowId()) && !userId.equals(item.getUserHighId()))) {
            throw new BusinessException(403, "无权访问该会话");
        }
        return item;
    }

    private WebsiteData.Media requireUnboundMedia(Long userId, Long mediaId) {
        WebsiteData.Media media = mediaId == null ? null : dao.media(mediaId);
        if (media == null || !userId.equals(media.getOwnerId()) || !"UPLOADED".equals(media.getStatus())
                || media.getTargetId() != null) throw new BusinessException("图片不存在或已使用");
        return media;
    }

    private ActivityView activityView(WebsiteData.Activity item, boolean owner) {
        WebsiteData.User author = dao.user(item.getAuthorId());
        List<MediaView> images = dao.mediaFor("ACTIVITY", item.getId()).stream()
                .filter(media -> "APPROVED".equals(media.getStatus())
                        || (owner && "PENDING".equals(media.getStatus())))
                .map(media -> new MediaView(media.getId(), mediaUrl(media), media.getStatus())).toList();
        return new ActivityView(item.getId(), item.getAuthorId(), author == null ? "活动用户" : author.getNickname(),
                item.getTitle(), item.getContent(), item.getStartTime(), item.getLocation(), item.getEstimatedCost(),
                item.getStatus(), owner ? item.getAuditNote() : null, images);
    }

    private ConversationView conversationView(WebsiteData.Conversation conversation, Long userId) {
        Long peerId = userId.equals(conversation.getUserLowId()) ? conversation.getUserHighId() : conversation.getUserLowId();
        WebsiteData.User peer = dao.user(peerId);
        WebsiteData.Activity activity = dao.activity(conversation.getActivityId());
        return new ConversationView(conversation.getId(), conversation.getActivityId(),
                activity == null ? "活动已移除" : activity.getTitle(), peerId,
                peer == null ? "用户已注销" : peer.getNickname());
    }

    private MessageView messageView(WebsiteData.Message message) {
        String imageUrl = null;
        if (message.getMediaId() != null) {
            WebsiteData.Media media = dao.media(message.getMediaId());
            if (media != null) imageUrl = "/api/website/private-media/" + media.getId();
        }
        return new MessageView(message.getId(), message.getConversationId(), message.getSenderId(),
                message.getMessageType(), message.getContentText(), imageUrl, message.getStatus(), message.getCreateTime());
    }

    private String mediaUrl(WebsiteData.Media media) {
        return "APPROVED".equals(media.getStatus())
                ? "/api/website/public-media/" + media.getId()
                : "/api/website/private-media/" + media.getId();
    }

    private UserView userView(WebsiteData.User user) {
        String phone = user.getPhone();
        return new UserView(user.getId(), user.getNickname(), phone == null || phone.length() != 11 ? "" : phone.substring(0, 3) + "****" + phone.substring(7));
    }

    private static void requirePhone(String phone) {
        if (phone == null || !phone.matches("1[3-9]\\d{9}")) throw new BusinessException("手机号格式不正确");
    }

    private static String randomToken() { return UUID.randomUUID().toString().replace("-", ""); }

    private void audit(String actorType, Long actorId, String action, String targetType, Long targetId) {
        WebsiteData.AuditLog log = new WebsiteData.AuditLog();
        log.setActorType(actorType);
        log.setActorId(actorId);
        log.setAction(action);
        log.setTargetType(targetType);
        log.setTargetId(targetId);
        log.setRequestIp(requestIp());
        HttpServletRequest request = currentRequest();
        if (request != null && request.getHeader("User-Agent") != null) {
            log.setUserAgent(request.getHeader("User-Agent").substring(0, Math.min(255, request.getHeader("User-Agent").length())));
        }
        log.setRetainUntil(LocalDateTime.now().plusDays(190));
        dao.insertAudit(log);
    }

    private static HttpServletRequest currentRequest() {
        return RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attrs ? attrs.getRequest() : null;
    }

    private static String requestIp() {
        HttpServletRequest request = currentRequest();
        return WebsiteRequestInfo.clientIp(request);
    }
}
