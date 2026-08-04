package com.spacetime.miniapp.service.impl;

import cn.hutool.core.util.StrUtil;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.interceptor.UserContextHolder;
import com.spacetime.common.constant.CommunityConfigKeys;
import com.spacetime.common.dao.AppConfigDao;
import com.spacetime.common.entity.AppConfig;
import com.spacetime.common.service.Prd01RuntimeConfigResolver;
import com.spacetime.common.util.OssUtil;
import com.spacetime.miniapp.dto.response.OssUploadTicketVO;
import com.spacetime.miniapp.service.MiniappOssUploadTicketService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.data.redis.core.StringRedisTemplate;

import java.time.Duration;
import java.util.Locale;

/** 小程序 OSS 直传凭证服务实现。 */
@Service
@RequiredArgsConstructor
public class MiniappOssUploadTicketServiceImpl implements MiniappOssUploadTicketService {

    private static final long MB = 1024L * 1024L;

    private final OssUtil ossUtil;
    private final Prd01RuntimeConfigResolver runtimeConfigResolver;
    private final StringRedisTemplate redisTemplate;
    private final AppConfigDao appConfigDao;

    @Override
    public OssUploadTicketVO createAvatarTicket(String fileName, long fileSizeBytes) {
        return createPublicTicket(fileName, fileSizeBytes, "album", 1, 10);
    }

    @Override
    public OssUploadTicketVO createEducationTicket(String fileName, long fileSizeBytes) {
        Prd01RuntimeConfigResolver.UploadRule rule = validate(fileName, fileSizeBytes, "education", 4, 10);
        OssUtil.DirectUploadPolicy policy = createOwnedPolicy(fileName, (long) rule.maxMb() * MB, "education");
        return toTicket(policy, "/miniapp/file/credential/" + policy.key(), true);
    }

    @Override
    public OssUploadTicketVO createAlbumTicket(String fileName, long fileSizeBytes) {
        return createPublicTicket(fileName, fileSizeBytes, "album", 9, 10);
    }

    @Override
    public OssUploadTicketVO createBackgroundTicket(String fileName, long fileSizeBytes) {
        return createPublicTicket(fileName, fileSizeBytes, "profileBg", 1, 10);
    }

    @Override
    public OssUploadTicketVO createVoiceTicket(String fileName, long fileSizeBytes) {
        return createPublicTicket(fileName, fileSizeBytes, "voice", 1, 20);
    }

    private OssUploadTicketVO createPublicTicket(String fileName, long fileSizeBytes, String ruleKey, int defaultCount, int defaultMb) {
        Prd01RuntimeConfigResolver.UploadRule rule = validate(fileName, fileSizeBytes, ruleKey, defaultCount, defaultMb);
        OssUtil.DirectUploadPolicy policy = createOwnedPolicy(fileName, (long) rule.maxMb() * MB, ruleKey);
        return toTicket(policy, ossUtil.toCdnUrl(policy.key()), false);
    }

    private OssUploadTicketVO toTicket(OssUtil.DirectUploadPolicy policy, String fileUrl, boolean protectedFile) {
        return new OssUploadTicketVO(policy.uploadUrl(), policy.key(), policy.formData(), policy.expiresAt(), fileUrl, protectedFile);
    }

    private OssUtil.DirectUploadPolicy createOwnedPolicy(String fileName, long maxBytes, String scene) {
        Long userId = UserContextHolder.get() == null ? null : UserContextHolder.get().getId();
        if (userId == null) throw new BusinessException(401, message("upload_owner_missing"));
        OssUtil.DirectUploadPolicy policy = ossUtil.createDirectUploadPolicy(fileName, maxBytes,
                "miniapp/" + userId + "/" + scene);
        redisTemplate.opsForValue().set("community:upload:ticket:" + policy.key(), String.valueOf(userId), Duration.ofMinutes(30));
        return policy;
    }

    private Prd01RuntimeConfigResolver.UploadRule validate(String fileName, long fileSizeBytes, String ruleKey, int defaultCount, int defaultMb) {
        if (fileSizeBytes <= 0) throw new BusinessException(message("upload_empty"));
        Prd01RuntimeConfigResolver.UploadRule rule = runtimeConfigResolver.uploadRule(runtimeConfigResolver.snapshot(), ruleKey, defaultCount, defaultMb);
        if (fileSizeBytes > (long) rule.maxMb() * MB) throw new BusinessException(message("upload_too_large", rule.maxMb()));
        String filename = StrUtil.blankToDefault(fileName, "");
        int dot = filename.lastIndexOf('.');
        String extension = dot >= 0 ? filename.substring(dot + 1).toLowerCase(Locale.ROOT) : "";
        if (StrUtil.isBlank(extension) || !rule.formats().contains(extension)) throw new BusinessException(message("upload_format_unsupported"));
        return rule;
    }

    private String message(String key, Object... args) {
        AppConfig item = appConfigDao.selectByKey(CommunityConfigKeys.COPY_PREFIX + key);
        String template = item == null || StrUtil.isBlank(item.getConfigValue()) ? key : item.getConfigValue();
        if (args == null || args.length == 0) return template;
        try {
            return String.format(Locale.ROOT, template, args);
        } catch (RuntimeException ignored) {
            return key;
        }
    }
}
