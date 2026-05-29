package com.spacetime.admin.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.ContentArticlePageReq;
import com.spacetime.admin.dto.request.ContentArticleSaveReq;
import com.spacetime.admin.dto.request.StatusUpdateReq;
import com.spacetime.admin.dto.response.ContentArticleVO;
import com.spacetime.admin.service.ContentArticleAdminService;
import com.spacetime.common.dao.ContentArticleDao;
import com.spacetime.common.dao.ContentOperationLogDao;
import com.spacetime.common.entity.ContentArticle;
import com.spacetime.common.entity.ContentOperationLog;
import com.spacetime.common.enums.ArticleTypeEnum;
import com.spacetime.common.enums.CommonStatusEnum;
import com.spacetime.common.enums.ContentTypeEnum;
import com.spacetime.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.net.URI;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

/**
 * 内容文章管理服务实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ContentArticleAdminServiceImpl implements ContentArticleAdminService {

    private final ContentArticleDao contentArticleDao;
    private final ContentOperationLogDao contentOperationLogDao;

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @Override
    public Page<ContentArticleVO> list(ContentArticlePageReq req) {
        LambdaQueryWrapper<ContentArticle> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(StringUtils.hasText(req.getType()), ContentArticle::getType, req.getType());
        wrapper.eq(StringUtils.hasText(req.getCategory()), ContentArticle::getCategory, req.getCategory());
        wrapper.like(StringUtils.hasText(req.getTitle()), ContentArticle::getTitle, req.getTitle());
        wrapper.eq(StringUtils.hasText(req.getStatus()), ContentArticle::getStatus, req.getStatus());
        wrapper.orderByAsc(ContentArticle::getSort).orderByDesc(ContentArticle::getCreateTime);

        Page<ContentArticle> page = new Page<>(req.getPage(), req.getSize());
        Page<ContentArticle> result = contentArticleDao.selectPage(page, wrapper);

        Page<ContentArticleVO> voPage = new Page<>(result.getCurrent(), result.getSize(), result.getTotal());
        voPage.setRecords(result.getRecords().stream().map(this::toVO).toList());
        return voPage;
    }

    @Override
    public ContentArticleVO detail(Long id) {
        ContentArticle entity = contentArticleDao.selectById(id);
        if (entity == null) {
            throw new BusinessException("文章不存在");
        }
        return toVO(entity);
    }

    @Override
    @Transactional
    public Long create(ContentArticleSaveReq req) {
        validateContent(req);
        ContentArticle entity = new ContentArticle();
        fillEntity(entity, req);
        contentArticleDao.insert(entity);
        writeLog("ARTICLE", entity.getId(), "CREATE", null, entity.getTitle());
        log.info("content article created: id={}, title={}", entity.getId(), entity.getTitle());
        return entity.getId();
    }

    @Override
    @Transactional
    public void update(Long id, ContentArticleSaveReq req) {
        ContentArticle entity = contentArticleDao.selectById(id);
        if (entity == null) {
            throw new BusinessException("文章不存在");
        }
        validateContent(req);
        String beforeTitle = entity.getTitle();
        fillEntity(entity, req);
        contentArticleDao.updateById(entity);
        writeLog("ARTICLE", id, "UPDATE", beforeTitle, entity.getTitle());
        log.info("content article updated: id={}", id);
    }

    @Override
    @Transactional
    public void updateStatus(Long id, StatusUpdateReq req) {
        ContentArticle entity = contentArticleDao.selectById(id);
        if (entity == null) {
            throw new BusinessException("文章不存在");
        }
        if (!isEnabledOrDisabled(req.getStatus())) {
            throw new BusinessException("不支持的文章状态: " + req.getStatus());
        }
        String beforeStatus = entity.getStatus();
        entity.setStatus(req.getStatus());
        contentArticleDao.updateById(entity);
        writeLog("ARTICLE", id, "STATUS_CHANGE", beforeStatus, req.getStatus());
        log.info("content article status changed: id={}, {} -> {}", id, beforeStatus, req.getStatus());
    }

    @Override
    @Transactional
    public void delete(Long id) {
        ContentArticle entity = contentArticleDao.selectById(id);
        if (entity == null) {
            throw new BusinessException("文章不存在");
        }
        contentArticleDao.deleteById(id);
        writeLog("ARTICLE", id, "DELETE", entity.getTitle(), null);
        log.info("content article deleted: id={}", id);
    }

    /** 校验内容类型与内容字段的一致性 */
    private void validateContent(ContentArticleSaveReq req) {
        if (ArticleTypeEnum.getByCode(req.getType()) == null) {
            throw new BusinessException("不支持的文章类型: " + req.getType());
        }
        ContentTypeEnum contentType = ContentTypeEnum.getByCode(req.getContentType());
        if (contentType == null) {
            throw new BusinessException("不支持的内容类型: " + req.getContentType());
        }
        if (StringUtils.hasText(req.getStatus()) && !isEnabledOrDisabled(req.getStatus())) {
            throw new BusinessException("不支持的文章状态: " + req.getStatus());
        }
        LocalDateTime effectiveTime = parseDateTime(req.getEffectiveTime(), "生效时间");
        LocalDateTime expireTime = parseDateTime(req.getExpireTime(), "失效时间");
        if (effectiveTime != null && expireTime != null && effectiveTime.isAfter(expireTime)) {
            throw new BusinessException("生效时间不能晚于失效时间");
        }
        if (ContentTypeEnum.H5.equals(contentType) && !StringUtils.hasText(req.getContentUrl())) {
            throw new BusinessException("H5 类型必须填写跳转地址");
        }
        if (ContentTypeEnum.H5.equals(contentType) && !isHttpUrl(req.getContentUrl())) {
            throw new BusinessException("H5 类型跳转地址必须是合法 URL");
        }
        if (ContentTypeEnum.NATIVE.equals(contentType) && !StringUtils.hasText(req.getContentBody())) {
            throw new BusinessException("原生类型必须填写内容正文");
        }
    }

    private void fillEntity(ContentArticle entity, ContentArticleSaveReq req) {
        entity.setType(req.getType());
        entity.setCategory(req.getCategory());
        entity.setTitle(req.getTitle());
        entity.setSummary(req.getSummary());
        entity.setCoverUrl(req.getCoverUrl());
        entity.setContentType(req.getContentType());
        entity.setContentUrl(req.getContentUrl());
        entity.setContentBody(req.getContentBody());
        entity.setSort(req.getSort() != null ? req.getSort() : 0);
        entity.setStatus(StringUtils.hasText(req.getStatus()) ? req.getStatus() : CommonStatusEnum.ENABLED.getCode());
        entity.setEffectiveTime(parseDateTime(req.getEffectiveTime(), "生效时间"));
        entity.setExpireTime(parseDateTime(req.getExpireTime(), "失效时间"));
    }

    private LocalDateTime parseDateTime(String value, String fieldName) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        String text = value.trim();
        try {
            if (text.contains("T")) {
                return LocalDateTime.parse(text);
            }
            return LocalDateTime.parse(text, FMT);
        } catch (DateTimeParseException e) {
            throw new BusinessException(fieldName + "格式必须为 yyyy-MM-dd HH:mm:ss");
        }
    }

    private boolean isEnabledOrDisabled(String status) {
        return CommonStatusEnum.ENABLED.getCode().equals(status) || CommonStatusEnum.DISABLED.getCode().equals(status);
    }

    private boolean isHttpUrl(String value) {
        try {
            URI uri = URI.create(value.trim());
            return ("http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme()))
                    && StringUtils.hasText(uri.getHost());
        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    private void writeLog(String bizType, Long bizId, String action, String beforeValue, String afterValue) {
        ContentOperationLog log = new ContentOperationLog();
        log.setBizType(bizType);
        log.setBizId(bizId);
        log.setAction(action);
        log.setBeforeValue(beforeValue);
        log.setAfterValue(afterValue);
        contentOperationLogDao.insert(log);
    }

    private ContentArticleVO toVO(ContentArticle entity) {
        ContentArticleVO vo = new ContentArticleVO();
        vo.setId(entity.getId());
        vo.setType(entity.getType());
        vo.setCategory(entity.getCategory());
        vo.setTitle(entity.getTitle());
        vo.setSummary(entity.getSummary());
        vo.setCoverUrl(entity.getCoverUrl());
        vo.setContentType(entity.getContentType());
        vo.setContentUrl(entity.getContentUrl());
        vo.setContentBody(entity.getContentBody());
        vo.setSort(entity.getSort());
        vo.setStatus(entity.getStatus());
        vo.setEffectiveTime(entity.getEffectiveTime() != null ? entity.getEffectiveTime().format(FMT) : null);
        vo.setExpireTime(entity.getExpireTime() != null ? entity.getExpireTime().format(FMT) : null);
        vo.setCreateTime(entity.getCreateTime() != null ? entity.getCreateTime().format(FMT) : null);
        return vo;
    }
}
