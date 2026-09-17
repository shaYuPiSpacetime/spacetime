package com.spacetime.miniapp.service.impl;

import cn.hutool.core.util.StrUtil;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.miniapp.service.CommunityMediaAuditCallbackService;
import com.spacetime.miniapp.service.WechatMessagePushRouterService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.w3c.dom.Document;
import org.w3c.dom.NodeList;
import org.xml.sax.InputSource;
import org.xml.sax.helpers.DefaultHandler;

import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.StringReader;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Locale;
import java.util.Set;

/** 在现有微信回调地址中分流媒体审核事件和原生客服消息。 */
@Service
@Slf4j
@RequiredArgsConstructor
public class WechatMessagePushRouterServiceImpl implements WechatMessagePushRouterService {
    private static final String MEDIA_EVENT = "wxa_media_check";
    private static final String TRANSFER_MESSAGE_TYPE = "transfer_customer_service";
    private static final Set<String> CUSTOMER_MESSAGE_TYPES = Set.of(
            "text", "image", "miniprogrampage", "voice", "video", "shortvideo");

    private final CommunityMediaAuditCallbackService mediaAuditCallbackService;
    private final ObjectMapper objectMapper;

    /** 验签后按事件类型分流；媒体审核仍完整委托给原有服务。 */
    @Override
    public String route(String signature, String timestamp, String nonce, String contentType, String payload) {
        mediaAuditCallbackService.validateSignature(signature, timestamp, nonce);
        if (payload == null) {
            throw new BusinessException(4001, "wechat_callback_payload_invalid");
        }
        if (payload.length() > MAX_CALLBACK_BODY_BYTES
                || payload.getBytes(StandardCharsets.UTF_8).length > MAX_CALLBACK_BODY_BYTES) {
            throw new BusinessException(4001, "wechat_callback_payload_too_large");
        }
        boolean xml = contentType != null && contentType.toLowerCase(Locale.ROOT).contains("xml");
        Envelope envelope = xml ? parseXml(payload) : parseJson(payload);

        if (MEDIA_EVENT.equalsIgnoreCase(envelope.event())
                || (StrUtil.isBlank(envelope.event()) && StrUtil.isBlank(envelope.messageType())
                && StrUtil.isNotBlank(envelope.traceId()))) {
            mediaAuditCallbackService.handleRaw(signature, timestamp, nonce, contentType, payload);
            return "success";
        }
        if (StrUtil.isNotBlank(envelope.event()) || "event".equalsIgnoreCase(envelope.messageType())) {
            return "success";
        }
        String messageType = StrUtil.blankToDefault(envelope.messageType(), "").toLowerCase(Locale.ROOT);
        if (!CUSTOMER_MESSAGE_TYPES.contains(messageType)) {
            log.warn("wechat message push ignored: unsupported message type={}", messageType);
            return "success";
        }
        if (StrUtil.isBlank(envelope.toUserName()) || StrUtil.isBlank(envelope.fromUserName())) {
            throw new BusinessException(4001, "wechat_customer_message_identity_missing");
        }
        log.info("wechat message push transferred: messageType={}", messageType);
        return xml ? transferXml(envelope) : transferJson(envelope);
    }

    private Envelope parseJson(String payload) {
        try {
            JsonNode root = objectMapper.readTree(payload);
            if (root == null || !root.isObject()) throw new BusinessException(4001, "wechat_callback_payload_invalid");
            return new Envelope(text(root, "Event", "event"), text(root, "MsgType", "msgtype"),
                    text(root, "trace_id", "TraceId"), text(root, "ToUserName", "tousername"),
                    text(root, "FromUserName", "fromusername"));
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new BusinessException(4001, "wechat_callback_payload_invalid");
        }
    }

    private Envelope parseXml(String payload) {
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
            var builder = factory.newDocumentBuilder();
            builder.setErrorHandler(new DefaultHandler());
            Document document = builder.parse(new InputSource(new StringReader(payload)));
            return new Envelope(text(document, "Event", "event"), text(document, "MsgType", "msgtype"),
                    text(document, "trace_id", "TraceId"), text(document, "ToUserName", "tousername"),
                    text(document, "FromUserName", "fromusername"));
        } catch (Exception ex) {
            throw new BusinessException(4001, "wechat_callback_payload_invalid");
        }
    }

    private String transferJson(Envelope envelope) {
        ObjectNode response = objectMapper.createObjectNode();
        response.put("ToUserName", envelope.fromUserName());
        response.put("FromUserName", envelope.toUserName());
        response.put("CreateTime", Instant.now().getEpochSecond());
        response.put("MsgType", TRANSFER_MESSAGE_TYPE);
        return response.toString();
    }

    private String transferXml(Envelope envelope) {
        return "<xml><ToUserName>" + escapeXml(envelope.fromUserName()) + "</ToUserName>"
                + "<FromUserName>" + escapeXml(envelope.toUserName()) + "</FromUserName>"
                + "<CreateTime>" + Instant.now().getEpochSecond() + "</CreateTime>"
                + "<MsgType>" + TRANSFER_MESSAGE_TYPE + "</MsgType></xml>";
    }

    private String text(JsonNode root, String... names) {
        for (String name : names) {
            String value = root.path(name).asText(null);
            if (StrUtil.isNotBlank(value)) return value.trim();
        }
        return null;
    }

    private String text(Document document, String... names) {
        for (String name : names) {
            NodeList nodes = document.getElementsByTagName(name);
            if (nodes.getLength() > 0 && StrUtil.isNotBlank(nodes.item(0).getTextContent())) {
                return nodes.item(0).getTextContent().trim();
            }
        }
        return null;
    }

    private String escapeXml(String value) {
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                .replace("\"", "&quot;").replace("'", "&apos;");
    }

    private record Envelope(String event, String messageType, String traceId,
                            String toUserName, String fromUserName) {
    }
}
