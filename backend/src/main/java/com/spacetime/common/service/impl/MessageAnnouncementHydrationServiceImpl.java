package com.spacetime.common.service.impl;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.ContentArticleDao;
import com.spacetime.common.entity.ContentArticle;
import com.spacetime.common.enums.ArticleTypeEnum;
import com.spacetime.common.model.message.SystemMessageEvent;
import com.spacetime.common.service.MessageAnnouncementHydrationService;
import com.spacetime.common.service.MessageEventInboxService;
import com.spacetime.common.service.MessageEventPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/** 用户读取消息中心时，以文章版本为幂等键懒加载有效平台公告。 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MessageAnnouncementHydrationServiceImpl
        implements MessageAnnouncementHydrationService {
    private static final int BATCH_SIZE = 100;
    private static final int MAX_BATCHES = 10;

    private final ContentArticleDao contentArticleDao;
    private final MessageEventPublisher eventPublisher;
    private final MessageEventInboxService inboxService;

    @Override
    public void hydrate(Long userId, LocalDateTime now) {
        if (userId == null || userId <= 0) {
            return;
        }
        LocalDateTime effectiveNow = now == null ? LocalDateTime.now() : now;
        for (int current = 1; current <= MAX_BATCHES; current++) {
            Page<ContentArticle> page = contentArticleDao.selectEnabledPage(
                    new Page<>(current, BATCH_SIZE, false),
                    ArticleTypeEnum.ANNOUNCEMENT.getCode(), null);
            List<ContentArticle> articles = page == null || page.getRecords() == null
                    ? List.of() : page.getRecords();
            for (ContentArticle article : articles) {
                hydrateOne(userId, article, effectiveNow);
            }
            if (articles.size() < BATCH_SIZE) {
                return;
            }
        }
    }

    private void hydrateOne(Long userId, ContentArticle article, LocalDateTime now) {
        try {
            String title = required(article.getTitle(), "公告标题为空");
            String text = announcementText(article);
            String version = required(article.getVersion(), "公告版本为空");
            String producerEventId = "article:" + article.getId() + ":" + version;
            String bizNo = StringUtils.hasText(article.getContentCode())
                    ? article.getContentCode() : "article:" + article.getId();
            Long inboxId = eventPublisher.publishSystemMessage(new SystemMessageEvent(
                    "content", producerEventId, userId, bizNo,
                    "platform_announcement", "platform_announcement",
                    Map.of("announcementTitle", title, "announcementText", text),
                    article.getExpireTime()), now);
            inboxService.process(inboxId, now);
        } catch (RuntimeException ex) {
            log.warn("平台公告懒加载失败: articleId={}, errorType={}",
                    article == null ? null : article.getId(), ex.getClass().getSimpleName());
        }
    }

    private String announcementText(ContentArticle article) {
        String value = StringUtils.hasText(article.getContentBody())
                ? Jsoup.parse(article.getContentBody()).text()
                : required(article.getSummary(), "公告正文为空");
        if (!StringUtils.hasText(value)) {
            throw new IllegalArgumentException("公告正文为空");
        }
        return value.trim();
    }

    private String required(String value, String message) {
        if (!StringUtils.hasText(value)) {
            throw new IllegalArgumentException(message);
        }
        return value.trim();
    }
}
