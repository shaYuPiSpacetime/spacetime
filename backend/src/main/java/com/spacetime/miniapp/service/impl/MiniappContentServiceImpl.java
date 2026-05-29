package com.spacetime.miniapp.service.impl;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.AppConfigDao;
import com.spacetime.common.dao.ContentArticleDao;
import com.spacetime.common.entity.AppConfig;
import com.spacetime.common.entity.ContentArticle;
import com.spacetime.common.enums.CommonStatusEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.miniapp.dto.response.MiniappArticleDetailVO;
import com.spacetime.miniapp.dto.response.MiniappArticleVO;
import com.spacetime.miniapp.service.MiniappContentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 小程序内容服务实现
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MiniappContentServiceImpl implements MiniappContentService {

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final ContentArticleDao contentArticleDao;
    private final AppConfigDao appConfigDao;

    @Override
    public Page<MiniappArticleVO> getAnnouncements(int page, int size) {
        Page<ContentArticle> raw = contentArticleDao.selectEnabledPage(
                new Page<>(page, Math.min(size, 100)), "ANNOUNCEMENT", null);
        return convertPage(raw);
    }

    @Override
    public Page<MiniappArticleVO> getHelpDocs(String category, int page, int size) {
        Page<ContentArticle> raw = contentArticleDao.selectEnabledPage(
                new Page<>(page, Math.min(size, 100)), "HELP_DOC", category);
        return convertPage(raw);
    }

    @Override
    public List<MiniappArticleVO> getRules(String type) {
        Page<ContentArticle> raw = contentArticleDao.selectEnabledPage(
                new Page<>(1, 200), type, null);
        return raw.getRecords().stream().map(this::toVO).collect(Collectors.toList());
    }

    @Override
    public MiniappArticleDetailVO getArticleDetail(Long id) {
        ContentArticle article = contentArticleDao.selectById(id);
        if (article == null || !CommonStatusEnum.ENABLED.getCode().equals(article.getStatus()) || !isActive(article)) {
            throw new BusinessException("文章不存在或已下架");
        }
        MiniappArticleDetailVO vo = new MiniappArticleDetailVO();
        vo.setId(article.getId());
        vo.setType(article.getType());
        vo.setCategory(article.getCategory());
        vo.setTitle(article.getTitle());
        vo.setSummary(article.getSummary());
        vo.setCoverUrl(article.getCoverUrl());
        vo.setContentType(article.getContentType());
        vo.setContentUrl(article.getContentUrl());
        vo.setSort(article.getSort());
        vo.setCreateTime(article.getCreateTime() != null ? article.getCreateTime().format(FMT) : null);
        vo.setContentBody(article.getContentBody());
        return vo;
    }

    @Override
    public Map<String, String> getPublicConfigs(List<String> keys) {
        List<String> cleanKeys = keys.stream()
                .filter(key -> key != null && !key.isBlank())
                .map(String::trim)
                .distinct()
                .toList();
        List<AppConfig> configs = appConfigDao.selectPublicEnabled(cleanKeys);
        return configs.stream().collect(Collectors.toMap(
                AppConfig::getConfigKey, AppConfig::getConfigValue, (a, b) -> a));
    }

    private boolean isActive(ContentArticle article) {
        LocalDateTime now = LocalDateTime.now();
        return (article.getEffectiveTime() == null || !article.getEffectiveTime().isAfter(now))
                && (article.getExpireTime() == null || article.getExpireTime().isAfter(now));
    }

    private Page<MiniappArticleVO> convertPage(Page<ContentArticle> raw) {
        Page<MiniappArticleVO> result = new Page<>(raw.getCurrent(), raw.getSize(), raw.getTotal());
        result.setRecords(raw.getRecords().stream().map(this::toVO).collect(Collectors.toList()));
        return result;
    }

    private MiniappArticleVO toVO(ContentArticle entity) {
        MiniappArticleVO vo = new MiniappArticleVO();
        vo.setId(entity.getId());
        vo.setType(entity.getType());
        vo.setCategory(entity.getCategory());
        vo.setTitle(entity.getTitle());
        vo.setSummary(entity.getSummary());
        vo.setCoverUrl(entity.getCoverUrl());
        vo.setContentType(entity.getContentType());
        vo.setContentUrl(entity.getContentUrl());
        vo.setSort(entity.getSort());
        vo.setCreateTime(entity.getCreateTime() != null ? entity.getCreateTime().format(FMT) : null);
        return vo;
    }
}
