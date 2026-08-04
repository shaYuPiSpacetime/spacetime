package com.spacetime.miniapp.service.impl;

import cn.hutool.core.util.IdUtil;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.spacetime.common.community.CommunityAuditDecision;
import com.spacetime.common.community.CommunityAuditPolicy;
import com.spacetime.common.community.CommunitySecurityResult;
import com.spacetime.common.config.CommunityContentSecurityProperties;
import com.spacetime.common.dao.CommunityExtensionDao;
import com.spacetime.common.dao.CommunityPostDao;
import com.spacetime.common.entity.CommunityAuditRecord;
import com.spacetime.common.entity.CommunityEventOutbox;
import com.spacetime.common.entity.CommunityMediaAuditTask;
import com.spacetime.common.entity.CommunityPost;
import com.spacetime.common.enums.CommunityAuditStatusEnum;
import com.spacetime.common.enums.CommunityPostStatusEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.miniapp.service.CommunityMediaAuditCallbackService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.ArrayList;
import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.DocumentBuilder;
import org.w3c.dom.Document;
import org.w3c.dom.NodeList;
import org.xml.sax.InputSource;
import org.xml.sax.helpers.DefaultHandler;
import java.io.StringReader;

/** 微信图片异步审核回调实现。 */
@Service
@RequiredArgsConstructor
public class CommunityMediaAuditCallbackServiceImpl implements CommunityMediaAuditCallbackService {
    private final CommunityContentSecurityProperties properties;
    private final CommunityExtensionDao extensionDao;
    private final CommunityPostDao postDao;
    private final CommunityAuditPolicy auditPolicy;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional
    public void handleRaw(String signature, String timestamp, String nonce, String contentType, String payload) {
        verifySignature(signature, timestamp, nonce);
        JsonNode normalized = contentType != null && contentType.toLowerCase(Locale.ROOT).contains("xml")
                ? parseXml(payload) : parseJson(payload);
        handle(signature, timestamp, nonce, normalized);
    }

    @Override
    @Transactional
    public void handle(String signature, String timestamp, String nonce, JsonNode payload) {
        verifySignature(signature, timestamp, nonce);
        String traceId = payload == null ? null : payload.path("trace_id").asText();
        if (StrUtil.isBlank(traceId)) throw new BusinessException("media_trace_missing");
        CommunityMediaAuditTask task = extensionDao.selectMediaTaskOne(new LambdaQueryWrapper<CommunityMediaAuditTask>()
                .eq(CommunityMediaAuditTask::getTraceId, traceId).last("LIMIT 1"));
        if (task == null) throw new BusinessException("media_trace_not_found");
        String status = callbackStatus(payload.path("result").path("suggest").asText());
        if (!"pending".equals(task.getStatus())) {
            if (task.getStatus().equals(status)) return;
            throw new BusinessException("media_callback_conflict");
        }
        int expectedVersion = task.getVersion() == null ? 0 : task.getVersion();
        task.setStatus(status);
        task.setProviderLabel(payload.path("result").path("label").asText(null));
        task.setCallbackPayload(toJson(payload));
        task.setCallbackTime(LocalDateTime.now());
        if (extensionDao.updateMediaTaskCas(task, expectedVersion) != 1) throw new BusinessException("media_callback_version_conflict");
        aggregate(task.getPostId(), traceId);
    }

    private JsonNode parseJson(String payload) {
        try {
            JsonNode root = objectMapper.readTree(payload);
            String event = text(root, "event", "Event");
            validateEvent(event);
            List<String> suggests = new ArrayList<>();
            List<String> labels = new ArrayList<>();
            collectJsonResult(root.path("result"), suggests, labels);
            collectJsonResult(root.path("detail"), suggests, labels);
            ObjectNode normalized = objectMapper.createObjectNode();
            normalized.put("trace_id", text(root, "trace_id", "TraceId"));
            ObjectNode result = normalized.putObject("result");
            result.put("suggest", aggregateSuggest(suggests));
            result.put("label", String.join(",", labels));
            return normalized;
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new BusinessException("media_callback_payload_invalid");
        }
    }

    private JsonNode parseXml(String payload) {
        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
            factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
            factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
            factory.setFeature("http://apache.org/xml/features/nonvalidating/load-external-dtd", false);
            factory.setXIncludeAware(false);
            factory.setExpandEntityReferences(false);
            factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD, "");
            factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_SCHEMA, "");
            DocumentBuilder builder = factory.newDocumentBuilder();
            builder.setErrorHandler(new DefaultHandler());
            Document document = builder.parse(new InputSource(new StringReader(payload)));
            validateEvent(firstText(document, "Event", "event"));
            List<String> suggests = texts(document, "suggest");
            List<String> labels = texts(document, "label");
            ObjectNode normalized = objectMapper.createObjectNode();
            normalized.put("trace_id", firstText(document, "trace_id", "TraceId"));
            ObjectNode result = normalized.putObject("result");
            result.put("suggest", aggregateSuggest(suggests));
            result.put("label", String.join(",", labels));
            return normalized;
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new BusinessException("media_callback_payload_invalid");
        }
    }

    private void collectJsonResult(JsonNode value, List<String> suggests, List<String> labels) {
        if (value == null || value.isMissingNode() || value.isNull()) return;
        if (value.isArray()) {
            value.forEach(item -> collectJsonResult(item, suggests, labels));
            return;
        }
        if (value.has("suggest")) suggests.add(value.path("suggest").asText());
        if (value.has("label")) labels.add(value.path("label").asText());
        if (value.has("detail")) collectJsonResult(value.path("detail"), suggests, labels);
    }

    private String aggregateSuggest(List<String> values) {
        if (values.stream().anyMatch(item -> "risky".equalsIgnoreCase(item))) return "risky";
        if (values.isEmpty() || values.stream().anyMatch(item -> !"pass".equalsIgnoreCase(item))) return "review";
        return "pass";
    }

    private void validateEvent(String event) {
        if (StrUtil.isNotBlank(event) && !"wxa_media_check".equalsIgnoreCase(event)) {
            throw new BusinessException("media_callback_event_invalid");
        }
    }

    private String text(JsonNode root, String... names) {
        for (String name : names) {
            String value = root.path(name).asText();
            if (StrUtil.isNotBlank(value)) return value;
        }
        return null;
    }

    private String firstText(Document document, String... names) {
        for (String name : names) {
            NodeList values = document.getElementsByTagName(name);
            if (values.getLength() > 0 && StrUtil.isNotBlank(values.item(0).getTextContent())) {
                return values.item(0).getTextContent().trim();
            }
        }
        return null;
    }

    private List<String> texts(Document document, String name) {
        NodeList values = document.getElementsByTagName(name);
        List<String> result = new ArrayList<>();
        for (int index = 0; index < values.getLength(); index++) {
            String value = values.item(index).getTextContent();
            if (StrUtil.isNotBlank(value)) result.add(value.trim());
        }
        return result;
    }

    private void aggregate(Long postId, String traceId) {
        List<CommunityMediaAuditTask> tasks = extensionDao.selectMediaTasks(new LambdaQueryWrapper<CommunityMediaAuditTask>()
                .eq(CommunityMediaAuditTask::getPostId, postId).orderByAsc(CommunityMediaAuditTask::getId));
        if (tasks == null || tasks.isEmpty() || tasks.stream().anyMatch(item -> "pending".equals(item.getStatus()))) return;
        CommunityPost post = postDao.selectById(postId);
        if (post == null) throw new BusinessException("content_not_found");
        int expectedVersion = post.getVersion() == null ? 0 : post.getVersion();
        String before = post.getStatus();
        CommunityAuditDecision decision;
        if (tasks.stream().anyMatch(item -> "risky".equals(item.getStatus()))) {
            decision = auditPolicy.decidePost(post.getPostType(), CommunitySecurityResult.reject("media_risky", "wechat_media_risky"), true);
        } else if (tasks.stream().allMatch(item -> "pass".equals(item.getStatus()))) {
            decision = auditPolicy.decidePost(post.getPostType(), CommunitySecurityResult.pass("media_all_pass"), true);
        } else {
            decision = auditPolicy.decidePost(post.getPostType(), CommunitySecurityResult.review("wechat_media_review"), true);
        }
        post.setStatus(decision.status());
        post.setAuditStatus(CommunityPostStatusEnum.PUBLISHED.getCode().equals(decision.status())
                ? CommunityAuditStatusEnum.APPROVED.getCode() : CommunityAuditStatusEnum.PENDING.getCode());
        post.setMachineResult(decision.machineConclusion());
        post.setMachineCode(decision.machineCode());
        post.setMachineDetail(decision.detail());
        post.setMachineCheckedAt(LocalDateTime.now());
        post.setSampleRequired(decision.sampleRequired() ? 1 : 0);
        post.setPublishedAt(CommunityPostStatusEnum.PUBLISHED.getCode().equals(decision.status()) ? LocalDateTime.now() : null);
        if (postDao.updateCas(post, expectedVersion) != 1) throw new BusinessException("media_post_version_conflict");
        writeAudit(post, traceId, before, decision.status());
        writeOutbox(post, expectedVersion + 1, decision.status());
    }

    private void verifySignature(String signature, String timestamp, String nonce) {
        String token = properties.getCallbackToken();
        if (StrUtil.isBlank(token) || StrUtil.isBlank(signature) || StrUtil.isBlank(timestamp) || StrUtil.isBlank(nonce)) {
            throw new BusinessException(403, "media_callback_signature_required");
        }
        try {
            String[] values = {token, timestamp, nonce};
            Arrays.sort(values);
            String expected = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-1")
                    .digest(String.join("", values).getBytes(StandardCharsets.UTF_8)));
            if (!MessageDigest.isEqual(expected.getBytes(StandardCharsets.US_ASCII),
                    signature.toLowerCase(Locale.ROOT).getBytes(StandardCharsets.US_ASCII))) {
                throw new BusinessException(403, "media_callback_signature_invalid");
            }
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new BusinessException(403, "media_callback_signature_invalid");
        }
    }

    private String callbackStatus(String suggest) {
        return switch (StrUtil.blankToDefault(suggest, "review").toLowerCase(Locale.ROOT)) {
            case "pass" -> "pass";
            case "risky" -> "risky";
            case "review" -> "review";
            default -> "error";
        };
    }

    private void writeAudit(CommunityPost post, String traceId, String before, String after) {
        CommunityAuditRecord record = new CommunityAuditRecord();
        record.setBizType("post");
        record.setBizNo(post.getPostNo());
        record.setBizId(post.getId());
        record.setAction("media_async_callback");
        record.setResult(post.getMachineResult());
        record.setBeforeSnapshot(before);
        record.setAfterSnapshot(after);
        record.setReason(traceId);
        record.setProviderCode("wechat");
        extensionDao.insertAudit(record);
    }

    private void writeOutbox(CommunityPost post, int version, String status) {
        CommunityEventOutbox event = new CommunityEventOutbox();
        event.setEventNo("EVT-" + IdUtil.fastSimpleUUID().substring(0, 20).toUpperCase(Locale.ROOT));
        event.setEventType(CommunityPostStatusEnum.PUBLISHED.getCode().equals(status) ? "content_published" : "content_audit_completed");
        event.setAggregateType("post");
        event.setAggregateNo(post.getPostNo());
        event.setAggregateVersion(version);
        event.setPayload("{\"postNo\":\"" + post.getPostNo() + "\",\"status\":\"" + status + "\"}");
        event.setStatus("pending");
        event.setRetryCount(0);
        extensionDao.insertOutbox(event);
    }

    private String toJson(JsonNode payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (Exception ex) {
            throw new BusinessException("media_callback_payload_invalid");
        }
    }
}
