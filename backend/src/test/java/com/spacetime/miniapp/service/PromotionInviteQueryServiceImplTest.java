package com.spacetime.miniapp.service;

import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.ContentArticleDao;
import com.spacetime.common.dao.PromotionInviteRelationDao;
import com.spacetime.common.dao.PromotionRewardLogDao;
import com.spacetime.common.entity.ContentArticle;
import com.spacetime.common.service.AppUserAuditContentService;
import com.spacetime.common.service.PromotionAttributionService;
import com.spacetime.common.service.PromotionRuleDomainService;
import com.spacetime.common.service.PromotionRuleEventSnapshot;
import com.spacetime.common.service.PromotionRuleSnapshot;
import com.spacetime.common.service.PromotionRuleTierSnapshot;
import com.spacetime.miniapp.dto.response.InviteRulesH5VO;
import com.spacetime.miniapp.service.impl.PromotionHtmlSanitizer;
import com.spacetime.miniapp.service.impl.PromotionInviteQueryServiceImpl;
import com.spacetime.miniapp.service.impl.PromotionShareLinkBuilder;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("小程序邀请规则内容查询测试")
class PromotionInviteQueryServiceImplTest {

    @Mock private PromotionAttributionService attributionService;
    @Mock private PromotionRuleDomainService ruleService;
    @Mock private PromotionInviteRelationDao relationDao;
    @Mock private PromotionRewardLogDao rewardDao;
    @Mock private AppUserDao appUserDao;
    @Mock private AppUserAuditContentService auditContentService;
    @Mock private ContentArticleDao contentArticleDao;
    @Mock private PromotionShareLinkBuilder shareLinkBuilder;

    private PromotionInviteQueryServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new PromotionInviteQueryServiceImpl(
                attributionService,
                ruleService,
                relationDao,
                rewardDao,
                appUserDao,
                auditContentService,
                contentArticleDao,
                new PromotionHtmlSanitizer(),
                shareLinkBuilder);
    }

    @Test
    @DisplayName("H5 配置保留精确 URL 且安全快照使用当前已发布奖励规则")
    void rulesH5_shouldUseConfiguredUrlAndCurrentBusinessRule() {
        ContentArticle article = inviteRulesArticle();
        article.setContentBody("<p>普通邀请完成注册奖励 999 千寻币</p>");
        when(contentArticleDao.selectByContentCode("invite_rules")).thenReturn(article);
        when(ruleService.current("normal_user")).thenReturn(ladderRule(6));

        InviteRulesH5VO result = service.rulesH5();

        assertThat(result.getContentCode()).isEqualTo("invite_rules");
        assertThat(result.getContentType()).isEqualTo("H5");
        assertThat(result.getUrl()).isEqualTo("https://admin.shikongxiehou.com/h5/invite-rules/index.html");
        assertThat(result.getBusinessRule().getVersion()).isEqualTo(6);
        assertThat(result.getBusinessRule().getEvents())
                .extracting(InviteRulesH5VO.EventRule::getAmount)
                .containsExactly(new BigDecimal("20"));
        assertThat(result.getBusinessRule().getTiers())
                .extracting(InviteRulesH5VO.TierRule::getThreshold, InviteRulesH5VO.TierRule::getAmount)
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple(1, new BigDecimal("50")),
                        org.assertj.core.groups.Tuple.tuple(3, new BigDecimal("100")));
        assertThat(result.getHtmlSnapshot())
                .contains("普通邀请完成注册奖励 20 千寻币")
                .contains("累计成功邀请 1 人额外奖励 50 千寻币")
                .doesNotContain("999");
    }

    @Test
    @DisplayName("固定奖励模式不向 H5 暴露历史阶梯档位")
    void rulesH5_shouldHideTiersInFixedMode() {
        when(contentArticleDao.selectByContentCode("invite_rules")).thenReturn(inviteRulesArticle());
        PromotionRuleSnapshot ladder = ladderRule(7);
        when(ruleService.current("normal_user")).thenReturn(new PromotionRuleSnapshot(
                ladder.ruleId(),
                ladder.sourceType(),
                "fixed",
                ladder.version(),
                ladder.events(),
                ladder.tiers(),
                ladder.publishedAt()));

        InviteRulesH5VO result = service.rulesH5();

        assertThat(result.getBusinessRule().getTiers()).isEmpty();
        assertThat(result.getHtmlSnapshot()).doesNotContain("累计成功邀请");
    }

    private ContentArticle inviteRulesArticle() {
        ContentArticle article = new ContentArticle();
        article.setId(1L);
        article.setContentCode("invite_rules");
        article.setContentType("H5");
        article.setContentUrl("https://admin.shikongxiehou.com/h5/invite-rules/index.html");
        article.setTitle("邀请规则");
        article.setVersion("v2.0");
        article.setPreinitialized(1);
        article.setStatus("ENABLED");
        article.setEffectiveTime(LocalDateTime.now().minusMinutes(1));
        article.setUpdateTime(LocalDateTime.now());
        return article;
    }

    private PromotionRuleSnapshot ladderRule(int version) {
        return new PromotionRuleSnapshot(
                9L,
                "normal_user",
                "ladder",
                version,
                List.of(
                        new PromotionRuleEventSnapshot(
                                "register_reward", "完成注册", true, new BigDecimal("20")),
                        new PromotionRuleEventSnapshot(
                                "profile_complete", "完善资料", false, new BigDecimal("30"))),
                List.of(
                        new PromotionRuleTierSnapshot(1, new BigDecimal("50"), true),
                        new PromotionRuleTierSnapshot(2, new BigDecimal("80"), false),
                        new PromotionRuleTierSnapshot(3, new BigDecimal("100"), true)),
                LocalDateTime.of(2026, 7, 29, 18, 0));
    }
}
