package com.spacetime.common.provider.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.spacetime.common.config.TencentImProperties;
import com.spacetime.common.dao.AppUserImAccountDao;
import com.spacetime.common.entity.AppUserImAccount;
import com.spacetime.common.enums.ImAccountSyncStatusEnum;
import com.spacetime.common.provider.ImAccountCredential;
import com.spacetime.common.provider.InstantMessageAccountProvider;
import com.spacetime.common.provider.InstantMessageCommand;
import com.spacetime.common.provider.InstantMessageException;
import com.spacetime.common.provider.InstantMessageProvider;
import com.spacetime.common.provider.InstantMessageSendResult;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Set;
import java.util.UUID;

/** 腾讯云 TIM 账号、UserSig 与单聊 REST 投递实现。 */
@Component
@ConditionalOnProperty(prefix = "message.tencent-im", name = "enabled", havingValue = "true")
public class TencentInstantMessageProvider implements InstantMessageProvider, InstantMessageAccountProvider {
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Shanghai");
    private static final Set<Integer> RETRYABLE_CODES = Set.of(
            20004, 20005, 70169, 70202, 70500, 90992, 90994, 90995, 91000);

    private final TencentImProperties properties;
    private final ObjectMapper objectMapper;
    private final AppUserImAccountDao accountDao;
    private final TencentImHttpTransport transport;
    private final TencentUserSigSigner signer;
    private final Clock clock;

    @Autowired
    public TencentInstantMessageProvider(TencentImProperties properties, ObjectMapper objectMapper,
                                         AppUserImAccountDao accountDao,
                                         TencentImHttpTransport transport,
                                         TencentUserSigSigner signer) {
        this(properties, objectMapper, accountDao, transport, signer, Clock.systemUTC());
    }

    TencentInstantMessageProvider(TencentImProperties properties, ObjectMapper objectMapper,
                                  AppUserImAccountDao accountDao,
                                  TencentImHttpTransport transport,
                                  TencentUserSigSigner signer, Clock clock) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.accountDao = accountDao;
        this.transport = transport;
        this.signer = signer;
        this.clock = clock;
    }

    @Override
    public InstantMessageSendResult send(InstantMessageCommand command) {
        requireConfigured();
        if (command == null || command.messageRecordId() == null
                || command.senderUserId() == null || command.receiverUserId() == null
                || isBlank(command.contentText())) {
            throw new InstantMessageException("TIM_COMMAND_INVALID", "腾讯云TIM投递命令不完整", false);
        }
        AppUserImAccount sender = ensureAccount(command.senderUserId(), null, null);
        AppUserImAccount receiver = ensureAccount(command.receiverUserId(), null, null);
        ObjectNode request = buildMessageRequest(command, sender.getImUserId(), receiver.getImUserId());
        JsonNode response = call("/v4/openim/sendmsg", request);
        String msgId = text(response, "MsgId");
        String msgKey = text(response, "MsgKey");
        long msgTime = response.path("MsgTime").asLong(0L);
        if (isBlank(msgId) || isBlank(msgKey) || msgTime <= 0) {
            throw new InstantMessageException("TIM_RESPONSE_INVALID",
                    "腾讯云TIM未返回完整消息映射", true);
        }
        return new InstantMessageSendResult(msgId, msgKey,
                LocalDateTime.ofInstant(Instant.ofEpochSecond(msgTime), BUSINESS_ZONE));
    }

    @Override
    public void syncAccount(Long userId, String nickname, String avatarUrl) {
        requireConfigured();
        if (userId == null) {
            throw new InstantMessageException("TIM_ACCOUNT_INVALID", "腾讯云TIM用户不能为空", false);
        }
        ensureAccount(userId, nickname, avatarUrl);
    }

    @Override
    public ImAccountCredential issueCredential(Long userId, String nickname, String avatarUrl) {
        requireConfigured();
        if (userId == null) {
            throw new InstantMessageException("TIM_ACCOUNT_INVALID", "腾讯云TIM用户不能为空", false);
        }
        AppUserImAccount account = ensureAccount(userId, nickname, avatarUrl);
        Instant issuedAt = clock.instant();
        String userSig = signer.generate(properties.getSdkAppId(), account.getImUserId(),
                properties.getSecretKey(), properties.getUserSigExpireSeconds(), issuedAt.getEpochSecond());
        return new ImAccountCredential(properties.getSdkAppId(), account.getImUserId(), userSig,
                issuedAt.plusSeconds(properties.getUserSigExpireSeconds()), properties.getProtocolVersion());
    }

    private AppUserImAccount ensureAccount(Long userId, String nickname, String avatarUrl) {
        AppUserImAccount account = accountDao.selectByUserId(userId);
        if (account == null) account = createAccount(userId);
        if (ImAccountSyncStatusEnum.DISABLED.getCode().equals(account.getSyncStatus())) {
            throw new InstantMessageException("TIM_ACCOUNT_DISABLED", "腾讯云TIM账号已禁用", false);
        }
        if (ImAccountSyncStatusEnum.SYNCED.getCode().equals(account.getSyncStatus())
                && Long.valueOf(properties.getSdkAppId()).equals(account.getSdkAppId())) {
            return account;
        }

        ObjectNode request = objectMapper.createObjectNode();
        request.put("UserID", account.getImUserId());
        if (!isBlank(nickname)) request.put("Nick", nickname);
        if (!isBlank(avatarUrl)) request.put("FaceUrl", avatarUrl);
        try {
            call("/v4/im_open_login_svc/account_import", request);
            account.setSdkAppId(properties.getSdkAppId());
            account.setSyncStatus(ImAccountSyncStatusEnum.SYNCED.getCode());
            account.setSyncedAt(LocalDateTime.ofInstant(clock.instant(), BUSINESS_ZONE));
            account.setLastErrorCode(null);
            account.setLastErrorSummary(null);
            account.setVersion(valueOrZero(account.getVersion()) + 1);
            accountDao.updateById(account);
            return account;
        } catch (InstantMessageException ex) {
            account.setSyncStatus(ImAccountSyncStatusEnum.FAILED.getCode());
            account.setLastErrorCode(ex.getProviderCode());
            account.setLastErrorSummary(sanitize(ex.getMessage()));
            account.setVersion(valueOrZero(account.getVersion()) + 1);
            accountDao.updateById(account);
            throw ex;
        }
    }

    private AppUserImAccount createAccount(Long userId) {
        AppUserImAccount account = new AppUserImAccount();
        account.setUserId(userId);
        account.setImUserId("tu_" + UUID.randomUUID().toString().replace("-", "").substring(0, 24));
        account.setSyncStatus(ImAccountSyncStatusEnum.PENDING.getCode());
        account.setVersion(0);
        try {
            accountDao.insert(account);
            return account;
        } catch (DuplicateKeyException ex) {
            AppUserImAccount concurrent = accountDao.selectByUserId(userId);
            if (concurrent != null) return concurrent;
            throw new InstantMessageException("TIM_ACCOUNT_CREATE_CONFLICT",
                    "腾讯云TIM账号创建冲突", true);
        }
    }

    private ObjectNode buildMessageRequest(InstantMessageCommand command,
                                           String senderImUserId, String receiverImUserId) {
        JsonNode metadata = readMetadata(command.metadataJson());
        ObjectNode request = objectMapper.createObjectNode();
        request.put("SyncOtherMachine", 1);
        request.put("From_Account", senderImUserId);
        request.put("To_Account", receiverImUserId);
        request.put("MsgSeq", stableUnsignedInt("seq", command.messageRecordId(), command.messageNo()));
        request.put("MsgRandom", stableUnsignedInt("random", command.messageRecordId(), command.messageNo()));
        ArrayNode controls = request.putArray("SendMsgControl");
        JsonNode configuredControls = metadata.path("sendMsgControl");
        if (configuredControls.isArray()) configuredControls.forEach(item -> controls.add(item.asText()));

        ObjectNode cloudData = objectMapper.createObjectNode();
        cloudData.put("messageNo", command.messageNo());
        cloudData.put("messageType", command.eventType());
        cloudData.put("protocolVersion", valueOrDefault(command.protocolVersion(), 1));
        copyText(metadata, cloudData, "whisperNo");
        request.put("CloudCustomData", writeJson(cloudData));

        ObjectNode element = request.putArray("MsgBody").addObject();
        if (command.eventType() != null && command.eventType().startsWith("whisper_")) {
            element.put("MsgType", "TIMCustomElem");
            ObjectNode content = element.putObject("MsgContent");
            ObjectNode data = cloudData.deepCopy();
            data.put("content", command.contentText());
            content.put("Data", writeJson(data));
            content.put("Desc", "whisper_reply".equals(command.eventType()) ? "悄悄话回复" : "悄悄话申请");
        } else {
            element.put("MsgType", "TIMTextElem");
            element.putObject("MsgContent").put("Text", command.contentText());
        }
        return request;
    }

    private JsonNode call(String path, ObjectNode request) {
        TencentImHttpResponse httpResponse = transport.post(buildUri(path), writeJson(request));
        if (httpResponse == null || httpResponse.statusCode() < 200 || httpResponse.statusCode() >= 300) {
            int status = httpResponse == null ? 0 : httpResponse.statusCode();
            throw new InstantMessageException("TIM_HTTP_" + status,
                    "腾讯云TIM服务暂不可用", status == 0 || status >= 500 || status == 429);
        }
        try {
            JsonNode response = objectMapper.readTree(httpResponse.body());
            int errorCode = response.path("ErrorCode").asInt(-1);
            if (errorCode != 0 || !"OK".equalsIgnoreCase(response.path("ActionStatus").asText())) {
                throw new InstantMessageException("TIM_" + errorCode,
                        sanitize(response.path("ErrorInfo").asText("腾讯云TIM调用失败")),
                        RETRYABLE_CODES.contains(errorCode));
            }
            return response;
        } catch (JsonProcessingException ex) {
            throw new InstantMessageException("TIM_RESPONSE_INVALID", "腾讯云TIM响应格式错误", true);
        }
    }

    private URI buildUri(String path) {
        String base = properties.getRestBaseUrl().replaceAll("/+$", "");
        String adminSig = signer.generate(properties.getSdkAppId(), properties.getAdministrator(),
                properties.getSecretKey(), properties.getUserSigExpireSeconds(), clock.instant().getEpochSecond());
        long random = stableUnsignedInt("rest", clock.instant().toEpochMilli(), path);
        return URI.create(base + path
                + "?sdkappid=" + properties.getSdkAppId()
                + "&identifier=" + encode(properties.getAdministrator())
                + "&usersig=" + encode(adminSig)
                + "&random=" + random
                + "&contenttype=json");
    }

    private long stableUnsignedInt(String namespace, Object first, Object second) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] bytes = digest.digest((namespace + ':' + first + ':' + second)
                    .getBytes(StandardCharsets.UTF_8));
            long value = Integer.toUnsignedLong(ByteBuffer.wrap(bytes, 0, 4).getInt());
            return value == 0 ? 1 : value;
        } catch (NoSuchAlgorithmException ex) {
            throw new InstantMessageException("TIM_HASH_UNAVAILABLE", "TIM幂等摘要算法不可用", false);
        }
    }

    private JsonNode readMetadata(String metadataJson) {
        if (isBlank(metadataJson)) return objectMapper.createObjectNode();
        try {
            return objectMapper.readTree(metadataJson);
        } catch (JsonProcessingException ex) {
            throw new InstantMessageException("TIM_METADATA_INVALID", "TIM投递元数据格式错误", false);
        }
    }

    private void copyText(JsonNode from, ObjectNode to, String field) {
        JsonNode value = from.path(field);
        if (value.isTextual() && !value.asText().isBlank()) to.put(field, value.asText());
    }

    private String writeJson(JsonNode value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            throw new InstantMessageException("TIM_JSON_ENCODE_FAILED", "TIM请求编码失败", false);
        }
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private String text(JsonNode node, String field) {
        return node.path(field).isTextual() ? node.path(field).asText() : null;
    }

    private void requireConfigured() {
        if (!properties.isServerConfigured()) {
            throw new InstantMessageException("TIM_NOT_CONFIGURED", "腾讯云TIM服务未配置", false);
        }
    }

    private String sanitize(String value) {
        String normalized = isBlank(value) ? "腾讯云TIM调用失败"
                : value.replaceAll("[\\r\\n\\t]+", " ");
        return normalized.length() <= 200 ? normalized : normalized.substring(0, 200);
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private int valueOrZero(Integer value) {
        return value == null ? 0 : value;
    }

    private int valueOrDefault(Integer value, int fallback) {
        return value == null ? fallback : value;
    }
}
