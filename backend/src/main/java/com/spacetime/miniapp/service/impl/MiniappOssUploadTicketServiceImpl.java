package com.spacetime.miniapp.service.impl;

import cn.hutool.core.util.StrUtil;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.service.Prd01RuntimeConfigResolver;
import com.spacetime.common.util.OssUtil;
import com.spacetime.miniapp.dto.response.OssUploadTicketVO;
import com.spacetime.miniapp.service.MiniappOssUploadTicketService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Locale;

/** 小程序 OSS 直传凭证服务实现。 */
@Service
@RequiredArgsConstructor
public class MiniappOssUploadTicketServiceImpl implements MiniappOssUploadTicketService {

    private static final long MB = 1024L * 1024L;

    private final OssUtil ossUtil;
    private final Prd01RuntimeConfigResolver runtimeConfigResolver;

    @Override
    public OssUploadTicketVO createAvatarTicket(String fileName, long fileSizeBytes) {
        return createPublicTicket(fileName, fileSizeBytes, "album", 1, 10);
    }

    @Override
    public OssUploadTicketVO createEducationTicket(String fileName, long fileSizeBytes) {
        Prd01RuntimeConfigResolver.UploadRule rule = validate(fileName, fileSizeBytes, "education", 4, 10);
        OssUtil.DirectUploadPolicy policy = ossUtil.createDirectUploadPolicy(fileName, (long) rule.maxMb() * MB);
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
        OssUtil.DirectUploadPolicy policy = ossUtil.createDirectUploadPolicy(fileName, (long) rule.maxMb() * MB);
        return toTicket(policy, ossUtil.toCdnUrl(policy.key()), false);
    }

    private OssUploadTicketVO toTicket(OssUtil.DirectUploadPolicy policy, String fileUrl, boolean protectedFile) {
        return new OssUploadTicketVO(policy.uploadUrl(), policy.key(), policy.formData(), policy.expiresAt(), fileUrl, protectedFile);
    }

    private Prd01RuntimeConfigResolver.UploadRule validate(String fileName, long fileSizeBytes, String ruleKey, int defaultCount, int defaultMb) {
        if (fileSizeBytes <= 0) throw new BusinessException("文件内容不能为空");
        Prd01RuntimeConfigResolver.UploadRule rule = runtimeConfigResolver.uploadRule(runtimeConfigResolver.snapshot(), ruleKey, defaultCount, defaultMb);
        if (fileSizeBytes > (long) rule.maxMb() * MB) throw new BusinessException("文件大小不能超过" + rule.maxMb() + "MB");
        String filename = StrUtil.blankToDefault(fileName, "");
        int dot = filename.lastIndexOf('.');
        String extension = dot >= 0 ? filename.substring(dot + 1).toLowerCase(Locale.ROOT) : "";
        if (StrUtil.isBlank(extension) || !rule.formats().contains(extension)) throw new BusinessException("文件格式不支持，请按页面上传要求重新选择");
        return rule;
    }
}
