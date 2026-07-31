package com.spacetime.admin.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.admin.dto.request.ComplianceContentPageReq;
import com.spacetime.admin.dto.request.ComplianceContentSaveReq;
import com.spacetime.admin.dto.request.StatusUpdateReq;
import com.spacetime.admin.dto.response.ComplianceContentVO;
import com.spacetime.admin.service.ComplianceContentAdminService;
import com.spacetime.common.dao.ContentArticleDao;
import com.spacetime.common.dao.ContentOperationLogDao;
import com.spacetime.common.dao.DictDataDao;
import com.spacetime.common.entity.ContentArticle;
import com.spacetime.common.entity.ContentOperationLog;
import com.spacetime.common.enums.ContentTypeEnum;
import com.spacetime.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.net.URI;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * 公告与协议预置内容管理服务实现。
 */
@Service
@RequiredArgsConstructor
public class ComplianceContentAdminServiceImpl implements ComplianceContentAdminService {

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final Pattern VERSION_PATTERN = Pattern.compile("^v(\\d+)\\.(\\d+)$");

    private final ContentArticleDao contentArticleDao;
    private final ContentOperationLogDao contentOperationLogDao;
    private final DictDataDao dictDataDao;
    private final ObjectMapper objectMapper;

    @Override
    public Page<ComplianceContentVO> list(ComplianceContentPageReq req) {
        LambdaQueryWrapper<ContentArticle> wrapper = new LambdaQueryWrapper<ContentArticle>()
                .eq(ContentArticle::getPreinitialized, 1)
                .eq(StringUtils.hasText(req.getType()), ContentArticle::getType, req.getType())
                .like(StringUtils.hasText(req.getTitle()), ContentArticle::getTitle, req.getTitle())
                .eq(StringUtils.hasText(req.getStatus()), ContentArticle::getStatus, req.getStatus())
                .orderByDesc(ContentArticle::getEffectiveTime)
                .orderByAsc(ContentArticle::getId);
        Page<ContentArticle> result = contentArticleDao.selectPage(
                new Page<>(req.getPage(), req.getSize()), wrapper);
        Page<ComplianceContentVO> page = new Page<>(result.getCurrent(), result.getSize(), result.getTotal());
        Map<String, String> typeLabels = dictDataDao.selectByDictType("compliance_content_type")
                .stream()
                .collect(Collectors.toMap(
                        item -> item.getDictValue(),
                        item -> item.getDictLabel(),
                        (left, right) -> left));
        page.setRecords(result.getRecords().stream()
                .map(article -> toVO(article, typeLabels.get(article.getContentCode())))
                .toList());
        return page;
    }

    @Override
    public ComplianceContentVO detail(Long id) {
        ContentArticle article = requirePreinitialized(id);
        com.spacetime.common.entity.SysDictData type = dictDataDao.selectEnabledByTypeAndValue(
                "compliance_content_type", article.getContentCode());
        return toVO(article, type == null ? null : type.getDictLabel());
    }

    @Override
    @Transactional
    public void update(Long id, ComplianceContentSaveReq req) {
        ContentArticle article = requirePreinitialized(id);
        validate(req);
        String nextUrl = req.getContentUrl().trim();
        String before = auditValue(article);
        if (!Objects.equals(article.getContentUrl(), nextUrl)) {
            article.setVersion(nextVersion(article.getVersion()));
        }
        article.setTitle(req.getTitle().trim());
        article.setContentUrl(nextUrl);
        article.setContentBody(null);
        article.setStatus(req.getStatus());
        article.setContentType(ContentTypeEnum.H5.getCode());
        article.setEffectiveTime(LocalDateTime.now());
        contentArticleDao.updateById(article);
        writeAudit(article.getId(), before, auditValue(article));
    }

    @Override
    @Transactional
    public void updateStatus(Long id, StatusUpdateReq req) {
        ContentArticle article = requirePreinitialized(id);
        if (!isConfiguredStatus(req.getStatus())) {
            throw new BusinessException("不支持的内容状态: " + req.getStatus());
        }
        String before = auditValue(article);
        article.setStatus(req.getStatus());
        article.setEffectiveTime(LocalDateTime.now());
        contentArticleDao.updateById(article);
        writeAudit(article.getId(), before, auditValue(article));
    }

    private ContentArticle requirePreinitialized(Long id) {
        ContentArticle article = contentArticleDao.selectById(id);
        if (article == null) {
            throw new BusinessException("合规内容不存在");
        }
        if (!Integer.valueOf(1).equals(article.getPreinitialized())) {
            throw new BusinessException("仅允许编辑系统预置合规内容");
        }
        return article;
    }

    private void validate(ComplianceContentSaveReq req) {
        if (!isConfiguredStatus(req.getStatus())) {
            throw new BusinessException("不支持的内容状态: " + req.getStatus());
        }
        if (!isHttpUrl(req.getContentUrl())) {
            throw new BusinessException("H5地址必须是合法的 HTTP 或 HTTPS URL");
        }
    }

    private String nextVersion(String version) {
        Matcher matcher = VERSION_PATTERN.matcher(StringUtils.hasText(version) ? version.trim() : "v1.0");
        if (!matcher.matches()) {
            return "v1.1";
        }
        int major = Integer.parseInt(matcher.group(1));
        int minor = Integer.parseInt(matcher.group(2));
        if (minor >= 9) {
            return "v" + (major + 1) + ".0";
        }
        return "v" + major + "." + (minor + 1);
    }

    private boolean isConfiguredStatus(String status) {
        return StringUtils.hasText(status)
                && dictDataDao.selectEnabledByTypeAndValue("common_status", status) != null;
    }

    private boolean isHttpUrl(String value) {
        if (!StringUtils.hasText(value)) {
            return false;
        }
        try {
            URI uri = URI.create(value.trim());
            return ("http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme()))
                    && StringUtils.hasText(uri.getHost());
        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    private void writeAudit(Long bizId, String before, String after) {
        ContentOperationLog log = new ContentOperationLog();
        log.setBizType("COMPLIANCE_CONTENT");
        log.setBizId(bizId);
        log.setAction("UPDATE");
        log.setBeforeValue(before);
        log.setAfterValue(after);
        contentOperationLogDao.insert(log);
    }

    private String auditValue(ContentArticle article) {
        Map<String, Object> value = new LinkedHashMap<>();
        value.put("contentCode", article.getContentCode());
        value.put("title", article.getTitle());
        value.put("version", article.getVersion());
        value.put("contentUrl", article.getContentUrl());
        value.put("status", article.getStatus());
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new BusinessException("合规内容审计序列化失败");
        }
    }

    private ComplianceContentVO toVO(ContentArticle article, String contentTypeLabel) {
        ComplianceContentVO vo = new ComplianceContentVO();
        vo.setId(article.getId());
        vo.setContentCode(article.getContentCode());
        vo.setContentType(article.getContentCode());
        vo.setContentTypeLabel(contentTypeLabel);
        vo.setType(article.getType());
        vo.setTitle(article.getTitle());
        vo.setVersion(article.getVersion());
        vo.setLinkType(ContentTypeEnum.H5.getCode());
        vo.setContentUrl(article.getContentUrl());
        vo.setEffectiveTime(format(article.getEffectiveTime()));
        vo.setStatus(article.getStatus());
        vo.setUpdateTime(format(article.getUpdateTime()));
        vo.setUpdatedBy(article.getUpdatedBy());
        return vo;
    }

    private String format(LocalDateTime value) {
        return value == null ? null : value.format(FMT);
    }
}
