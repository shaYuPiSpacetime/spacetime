package com.spacetime.admin.service.impl;

import com.spacetime.admin.service.MessageSensitiveAccessAuditService;
import com.spacetime.admin.service.SensitiveAccessAuditCommand;
import com.spacetime.common.dao.AppMessageSensitiveAccessLogDao;
import com.spacetime.common.entity.AppMessageSensitiveAccessLog;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.interceptor.UserContext;
import com.spacetime.common.interceptor.UserContextHolder;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.UUID;

/** 敏感正文访问的独立事务审计实现。 */
@Service
@RequiredArgsConstructor
public class MessageSensitiveAccessAuditServiceImpl implements MessageSensitiveAccessAuditService {
    private final AppMessageSensitiveAccessLogDao accessLogDao;

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public String begin(SensitiveAccessAuditCommand command) {
        UserContext context = UserContextHolder.get();
        if (context == null || context.getId() == null) {
            throw new BusinessException(403, "未获取到当前管理员");
        }
        HttpServletRequest request = currentRequest();
        LocalDateTime now = LocalDateTime.now();
        AppMessageSensitiveAccessLog log = new AppMessageSensitiveAccessLog();
        log.setAccessNo("ACC-" + UUID.randomUUID().toString().replace("-", ""));
        log.setOperatorId(context.getId());
        log.setOperatorRoleCodes(context.getRoles() == null ? "" : String.join(",", context.getRoles()));
        log.setContextType(command.contextType());
        log.setContextNo(command.contextNo());
        log.setTargetType(command.targetType());
        log.setTargetBizNo(command.targetBizNo());
        log.setViewReason(command.viewReason());
        log.setResult("pending");
        log.setRequestId(command.requestId());
        log.setClientIp(clientIp(request));
        log.setUserAgentHash(sha256(request == null ? null : request.getHeader("User-Agent")));
        log.setAccessedAt(now);
        log.setRetainUntil(now.plusYears(3));
        accessLogDao.insert(log);
        return log.getAccessNo();
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void complete(String accessNo, String result, String denyReasonCode) {
        AppMessageSensitiveAccessLog log = accessLogDao.selectByAccessNo(accessNo);
        if (log == null || accessLogDao.updateResult(log.getId(), result, denyReasonCode) != 1) {
            throw new BusinessException(30024, "敏感正文访问审计更新失败");
        }
    }

    private HttpServletRequest currentRequest() {
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attrs) {
            return attrs.getRequest();
        }
        return null;
    }

    private String clientIp(HttpServletRequest request) {
        if (request == null) return null;
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",", 2)[0].trim();
        }
        return request.getRemoteAddr();
    }

    private String sha256(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new BusinessException(30024, "访问审计摘要生成失败");
        }
    }
}
