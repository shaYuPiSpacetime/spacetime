package com.spacetime.admin.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.admin.dto.request.CoinPackageSaveReq;
import com.spacetime.admin.dto.request.CoinSceneConfigReq;
import com.spacetime.admin.dto.request.CommercialConfigSaveReq;
import com.spacetime.admin.dto.request.CommercialSettingsReq;
import com.spacetime.admin.dto.request.VipBenefitSaveReq;
import com.spacetime.admin.dto.request.VipPackageSaveReq;
import com.spacetime.admin.service.impl.CommercialAdminServiceImpl;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.dao.AppConfigDao;
import com.spacetime.common.dao.CoinPackageDao;
import com.spacetime.common.dao.CoinSceneConfigDao;
import com.spacetime.common.dao.CommercialConfigLogDao;
import com.spacetime.common.dao.RefundRecordDao;
import com.spacetime.common.dao.TradeOrderDao;
import com.spacetime.common.dao.UserAssetDao;
import com.spacetime.common.dao.UserCoinLogDao;
import com.spacetime.common.dao.VipBenefitDao;
import com.spacetime.common.dao.VipPackageDao;
import com.spacetime.common.entity.CoinPackage;
import com.spacetime.common.entity.CoinSceneConfig;
import com.spacetime.common.entity.CommercialConfigLog;
import com.spacetime.common.entity.AppConfig;
import com.spacetime.common.entity.VipBenefit;
import com.spacetime.common.entity.VipPackage;
import com.spacetime.common.exception.BusinessException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("CommercialAdminServiceImpl L3 测试")
class CommercialAdminServiceImplTest {

    @Mock private VipBenefitDao vipBenefitDao;
    @Mock private VipPackageDao vipPackageDao;
    @Mock private CoinPackageDao coinPackageDao;
    @Mock private CoinSceneConfigDao coinSceneConfigDao;
    @Mock private CommercialConfigLogDao commercialConfigLogDao;
    @Mock private AppUserDao appUserDao;
    @Mock private AppConfigDao appConfigDao;
    @Mock private UserAssetDao userAssetDao;
    @Mock private TradeOrderDao tradeOrderDao;
    @Mock private UserCoinLogDao userCoinLogDao;
    @Mock private RefundRecordDao refundRecordDao;
    @Mock private ObjectMapper objectMapper;

    @InjectMocks
    private CommercialAdminServiceImpl service;

    @Test
    @DisplayName("L3-01 套餐改名时按数据库 ID 更新")
    void saveConfig_shouldUpdateVipPackageByIdWhenNameChanges() {
        stubReadCatalogs();
        VipPackage existing = vipPackage(7L, "旧会员套餐");
        when(vipPackageDao.selectPage(any(), any())).thenReturn(page(List.of(existing)));
        when(coinPackageDao.selectPage(any(), any())).thenReturn(page(List.of()));
        when(vipPackageDao.selectById(7L)).thenReturn(existing);

        VipPackageSaveReq changed = vipPackageReq(7L, "蓝湖会员套餐");
        CommercialConfigSaveReq req = new CommercialConfigSaveReq();
        req.setVipPackages(List.of(changed));

        service.saveConfig(req);

        ArgumentCaptor<VipPackage> captor = ArgumentCaptor.forClass(VipPackage.class);
        verify(vipPackageDao).updateById(captor.capture());
        verify(vipPackageDao, never()).insert(any());
        assertThat(captor.getValue().getId()).isEqualTo(7L);
        assertThat(captor.getValue().getPackageName()).isEqualTo("蓝湖会员套餐");
    }

    @Test
    @DisplayName("L3-02 千寻币套餐改名时按数据库 ID 更新")
    void saveConfig_shouldUpdateCoinPackageByIdWhenNameChanges() {
        stubReadCatalogs();
        CoinPackage existing = coinPackage(9L, "旧币包");
        when(vipPackageDao.selectPage(any(), any())).thenReturn(page(List.of()));
        when(coinPackageDao.selectPage(any(), any())).thenReturn(page(List.of(existing)));
        when(coinPackageDao.selectById(9L)).thenReturn(existing);

        CoinPackageSaveReq changed = coinPackageReq(9L, "3000 千寻币");
        CommercialConfigSaveReq req = new CommercialConfigSaveReq();
        req.setCoinPackages(List.of(changed));

        service.saveConfig(req);

        ArgumentCaptor<CoinPackage> captor = ArgumentCaptor.forClass(CoinPackage.class);
        verify(coinPackageDao).updateById(captor.capture());
        verify(coinPackageDao, never()).insert(any());
        assertThat(captor.getValue().getId()).isEqualTo(9L);
        assertThat(captor.getValue().getPackageName()).isEqualTo("3000 千寻币");
    }

    @Test
    @DisplayName("L3-03 固定权益仅更新可配置字段并保留数据库身份")
    void saveConfig_shouldKeepFixedBenefitIdentityWhenSavingEditableFields() {
        stubReadCatalogs();
        List<VipBenefit> existing = benefitEntities();
        when(vipBenefitDao.selectPage(any(), any())).thenReturn(page(existing));
        when(vipBenefitDao.selectById(any())).thenAnswer(invocation -> entityById(existing, invocation.getArgument(0)));

        List<VipBenefitSaveReq> requests = benefitRequests(existing);
        requests.get(0).setBenefitName("不允许覆盖的名称");
        requests.get(0).setBenefitType("不允许覆盖的类型");
        requests.get(0).setBenefitDesc("不允许覆盖的说明");
        requests.get(0).setMobileIcon("heart-list-new");
        CommercialConfigSaveReq req = new CommercialConfigSaveReq();
        req.setVipBenefits(requests);

        service.saveConfig(req);

        ArgumentCaptor<VipBenefit> captor = ArgumentCaptor.forClass(VipBenefit.class);
        verify(vipBenefitDao, org.mockito.Mockito.times(9)).updateById(captor.capture());
        VipBenefit first = captor.getAllValues().stream().filter(item -> Long.valueOf(10L).equals(item.getId())).findFirst().orElseThrow();
        assertThat(first.getBenefitName()).isEqualTo("数据库权益1");
        assertThat(first.getBenefitType()).isEqualTo("固定类型1");
        assertThat(first.getBenefitDesc()).isEqualTo("固定说明1");
        assertThat(first.getMobileIcon()).isEqualTo("heart-list-new");
        verify(vipBenefitDao, never()).insert(any());
    }

    @Test
    @DisplayName("L3-08 消费场景 ID 与固定 code 不匹配时拒绝保存")
    void saveConfig_shouldRejectSceneIdCodeMismatch() {
        stubReadCatalogs();
        List<CoinSceneConfig> existing = sceneEntities();
        when(coinSceneConfigDao.selectPage(any(), any())).thenReturn(page(existing));
        when(coinSceneConfigDao.selectById(any())).thenAnswer(invocation -> entityById(existing, invocation.getArgument(0)));

        List<CoinSceneConfigReq> requests = sceneRequests(existing);
        requests.get(0).setId(existing.get(1).getId());
        CommercialConfigSaveReq req = new CommercialConfigSaveReq();
        req.setCoinScenes(requests);

        assertThatThrownBy(() -> service.saveConfig(req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("消费场景 ID 与编码不匹配");
        verify(coinSceneConfigDao, never()).updateById(any());
    }

    @Test
    @DisplayName("L3-04 聚合保存拒绝非固定会员权益目录")
    void saveConfig_shouldRejectInvalidBenefitCatalog() {
        VipBenefitSaveReq unknown = new VipBenefitSaveReq();
        unknown.setBenefitCode("demo_benefit");
        unknown.setBenefitName("演示权益");
        unknown.setBenefitType("switch");
        CommercialConfigSaveReq req = new CommercialConfigSaveReq();
        req.setVipBenefits(List.of(unknown));

        assertThatThrownBy(() -> service.saveConfig(req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("会员权益必须配置固定 9 项");
        verify(vipBenefitDao, never()).insert(any());
    }

    @Test
    @DisplayName("L3-05 聚合保存拒绝未知或邀请消费场景")
    void saveConfig_shouldRejectInvalidSceneCatalog() {
        List<CoinSceneConfigReq> scenes = validSceneCodes().stream()
                .map(this::sceneReq)
                .collect(java.util.stream.Collectors.toList());
        scenes.set(7, sceneReq("invite_reward"));
        CommercialConfigSaveReq req = new CommercialConfigSaveReq();
        req.setCoinScenes(scenes);

        assertThatThrownBy(() -> service.saveConfig(req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("千寻币消费场景目录不合法");
        verify(coinSceneConfigDao, never()).insert(any());
    }

    @Test
    @DisplayName("L3-06 千寻币推荐档最多一个")
    void saveConfig_shouldRejectMultipleRecommendedCoinPackages() {
        CoinPackageSaveReq first = coinPackageReq(null, "3000 千寻币");
        CoinPackageSaveReq second = coinPackageReq(null, "6000 千寻币");
        first.setRecommendFlag(1);
        second.setRecommendFlag(1);
        CommercialConfigSaveReq req = new CommercialConfigSaveReq();
        req.setCoinPackages(List.of(first, second));

        assertThatThrownBy(() -> service.saveConfig(req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("推荐档最多只能配置一个");
        verify(coinPackageDao, never()).insert(any());
    }

    @Test
    @DisplayName("L3-07 千寻币套餐价格和币数必须合法")
    void saveConfig_shouldRejectInvalidCoinPackagePrice() {
        CoinPackageSaveReq invalid = coinPackageReq(null, "错误币包");
        invalid.setDiscountAmount(new BigDecimal("399.00"));
        CommercialConfigSaveReq req = new CommercialConfigSaveReq();
        req.setCoinPackages(List.of(invalid));

        assertThatThrownBy(() -> service.saveConfig(req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("优惠价不能高于原价");
        verify(coinPackageDao, never()).insert(any());
    }

    @Test
    @DisplayName("L3-12 聚合保存拒绝连续订阅套餐")
    void saveConfig_shouldRejectContinuousVipPackage() {
        VipPackageSaveReq continuous = vipPackageReq(null, "连续包月");
        continuous.setPackageType("continuous");
        continuous.setSubscriptionType("month");
        CommercialConfigSaveReq req = new CommercialConfigSaveReq();
        req.setVipPackages(List.of(continuous));

        assertThatThrownBy(() -> service.saveConfig(req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("普通套餐和一次性购买");
        verify(vipPackageDao, never()).insert(any());
    }

    @Test
    @DisplayName("L3-13 聚合保存拒绝自动续费周期")
    void saveConfig_shouldRejectRecurringVipPurchaseMode() {
        VipPackageSaveReq recurring = vipPackageReq(null, "普通月卡");
        recurring.setSubscriptionType("month");
        CommercialConfigSaveReq req = new CommercialConfigSaveReq();
        req.setVipPackages(List.of(recurring));

        assertThatThrownBy(() -> service.saveConfig(req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("普通套餐和一次性购买");
        verify(vipPackageDao, never()).insert(any());
    }

    @Test
    @DisplayName("L3-09 聚合保存漏传已有套餐时拒绝静默保留")
    void saveConfig_shouldRejectOmittedExistingPackage() {
        stubReadCatalogs();
        VipPackage first = vipPackage(7L, "连续包月");
        VipPackage second = vipPackage(8L, "连续包年");
        when(vipPackageDao.selectPage(any(), any())).thenReturn(page(List.of(first, second)));
        CommercialConfigSaveReq req = new CommercialConfigSaveReq();
        req.setVipPackages(List.of(vipPackageReq(7L, "连续包月")));

        assertThatThrownBy(() -> service.saveConfig(req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("不能省略已有 VIP 套餐");
        verify(vipPackageDao, never()).updateById(any());
    }

    @Test
    @DisplayName("L3-10 商业化通用参数写入 app_config")
    void saveConfig_shouldPersistCommercialSettings() {
        stubReadCatalogs();
        CommercialConfigSaveReq req = new CommercialConfigSaveReq();
        req.setSettings(validSettings());

        service.saveConfig(req);

        ArgumentCaptor<AppConfig> captor = ArgumentCaptor.forClass(AppConfig.class);
        verify(appConfigDao, org.mockito.Mockito.times(9)).upsert(captor.capture());
        assertThat(captor.getAllValues())
                .filteredOn(item -> "commercial.ideal.batch.discount.percent".equals(item.getConfigKey()))
                .singleElement()
                .satisfies(item -> {
                    assertThat(item.getConfigValue()).isEqualTo("10");
                    assertThat(item.getRemark()).isEqualTo("理想型解锁全部折扣比例");
                });
    }

    @Test
    @DisplayName("L3-11 理想型解锁全部折扣比例必须为 0-100")
    void saveConfig_shouldRejectInvalidIdealBatchDiscount() {
        CommercialSettingsReq settings = validSettings();
        settings.setIdealBatchDiscountPercent(101);
        CommercialConfigSaveReq req = new CommercialConfigSaveReq();
        req.setSettings(settings);

        assertThatThrownBy(() -> service.saveConfig(req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("折扣比例")
                .hasMessageContaining("0-100");
        verify(appConfigDao, never()).upsert(any());
    }

    @Test
    @DisplayName("L3-14 配置日志返回中文模块、变更原因和前后快照")
    void getConfigLogs_shouldExposeAuditDetails() {
        CommercialConfigLog log = new CommercialConfigLog();
        log.setId(101L);
        log.setConfigVersion("COMM-20260805175955");
        log.setChangeModule("commercial");
        log.setChangeSummary("调整每日专属悄悄话");
        log.setBeforeSnapshot("{\"settings\":{\"normalViewQuota\":3}}");
        log.setAfterSnapshot("{\"settings\":{\"normalViewQuota\":5}}");
        log.setOperatorName("peter");
        log.setCreateTime(LocalDateTime.of(2026, 8, 5, 17, 59, 55));
        when(commercialConfigLogDao.selectPage(any(), any())).thenReturn(page(List.of(log)));

        Page<com.spacetime.admin.dto.response.CommercialConfigLogVO> result = service.getConfigLogs(1, 10);

        assertThat(result.getRecords()).hasSize(1);
        com.spacetime.admin.dto.response.CommercialConfigLogVO item = result.getRecords().getFirst();
        assertThat(item.getChangeModuleName()).isEqualTo("商业化配置");
        assertThat(item.getChangeReason()).isEqualTo("调整每日专属悄悄话");
        assertThat(item.getBeforeSnapshot()).contains("normalViewQuota");
        assertThat(item.getAfterSnapshot()).contains("normalViewQuota");
    }

    private VipPackageSaveReq vipPackageReq(Long id, String name) {
        VipPackageSaveReq req = new VipPackageSaveReq();
        req.setId(id);
        req.setPackageName(name);
        req.setPackageType("normal");
        req.setSubscriptionType("once");
        req.setPrice(new BigDecimal("568.00"));
        req.setOriginPrice(new BigDecimal("568.00"));
        req.setDurationDays(365);
        req.setStatus("ENABLED");
        return req;
    }

    private CoinPackageSaveReq coinPackageReq(Long id, String name) {
        CoinPackageSaveReq req = new CoinPackageSaveReq();
        req.setId(id);
        req.setPackageName(name);
        req.setAmount(new BigDecimal("268.00"));
        req.setOriginAmount(new BigDecimal("301.12"));
        req.setDiscountAmount(new BigDecimal("268.00"));
        req.setCoinCount(3000);
        req.setStatus("ENABLED");
        return req;
    }

    private VipPackage vipPackage(Long id, String name) {
        VipPackage entity = new VipPackage();
        entity.setId(id);
        entity.setPackageName(name);
        entity.setPackageType("normal");
        entity.setSubscriptionType("once");
        entity.setPrice(new BigDecimal("568.00"));
        entity.setDurationDays(365);
        entity.setStatus("ENABLED");
        return entity;
    }

    private CoinPackage coinPackage(Long id, String name) {
        CoinPackage entity = new CoinPackage();
        entity.setId(id);
        entity.setPackageName(name);
        entity.setAmount(new BigDecimal("268.00"));
        entity.setCoinCount(3000);
        entity.setStatus("ENABLED");
        return entity;
    }

    private CoinSceneConfigReq sceneReq(String code) {
        CoinSceneConfigReq req = new CoinSceneConfigReq();
        req.setSceneCode(code);
        req.setMobileName(code);
        req.setMobileIcon("coinUsageWhisper");
        req.setUnitPrice(10);
        req.setStatus("ENABLED");
        return req;
    }

    private List<String> validSceneCodes() {
        return List.of(
                "whisper",
                "likes_unlock_one",
                "viewers_unlock_one",
                "ideal_user_unlock",
                "ideal_batch_unlock",
                "compatible_person_unlock_one",
                "soulmate_mizhiyin_unlock_one",
                "career_recommend_unlock_one"
        );
    }

    private List<String> validBenefitCodes() {
        return List.of(
                "heart_list", "visitor_list", "free_whisper", "extra_browse", "advanced_filter",
                "exposure_score", "privacy", "three_day_replay", "daily_heart_chance"
        );
    }

    private List<VipBenefit> benefitEntities() {
        List<VipBenefit> result = new ArrayList<>();
        List<String> codes = validBenefitCodes();
        for (int index = 0; index < codes.size(); index++) {
            VipBenefit entity = new VipBenefit();
            entity.setId(10L + index);
            entity.setBenefitCode(codes.get(index));
            entity.setBenefitName("数据库权益" + (index + 1));
            entity.setBenefitType("固定类型" + (index + 1));
            entity.setBenefitDesc("固定说明" + (index + 1));
            entity.setMobileIcon("icon-" + (index + 1));
            entity.setFixedFlag(1);
            entity.setDisplayOrder(index + 1);
            entity.setStatus("ENABLED");
            result.add(entity);
        }
        return result;
    }

    private List<VipBenefitSaveReq> benefitRequests(List<VipBenefit> entities) {
        return entities.stream().map(entity -> {
            VipBenefitSaveReq req = new VipBenefitSaveReq();
            req.setId(entity.getId());
            req.setBenefitCode(entity.getBenefitCode());
            req.setBenefitName(entity.getBenefitName());
            req.setBenefitType(entity.getBenefitType());
            req.setBenefitDesc(entity.getBenefitDesc());
            req.setMobileIcon(entity.getMobileIcon());
            req.setFixedFlag(entity.getFixedFlag());
            req.setDisplayOrder(entity.getDisplayOrder());
            req.setStatus(entity.getStatus());
            return req;
        }).collect(java.util.stream.Collectors.toCollection(ArrayList::new));
    }

    private List<CoinSceneConfig> sceneEntities() {
        List<CoinSceneConfig> result = new ArrayList<>();
        List<String> codes = validSceneCodes();
        for (int index = 0; index < codes.size(); index++) {
            CoinSceneConfig entity = new CoinSceneConfig();
            entity.setId(9L + index);
            entity.setSceneCode(codes.get(index));
            entity.setMobileName("场景" + (index + 1));
            entity.setMobileIcon("coinUsageWhisper");
            entity.setUnitPrice(10 + index);
            entity.setSortOrder(index + 1);
            entity.setStatus("ENABLED");
            result.add(entity);
        }
        return result;
    }

    private List<CoinSceneConfigReq> sceneRequests(List<CoinSceneConfig> entities) {
        return entities.stream().map(entity -> {
            CoinSceneConfigReq req = sceneReq(entity.getSceneCode());
            req.setId(entity.getId());
            req.setMobileName(entity.getMobileName());
            req.setUnitPrice(entity.getUnitPrice());
            req.setSortOrder(entity.getSortOrder());
            return req;
        }).collect(java.util.stream.Collectors.toCollection(ArrayList::new));
    }

    private <T> T entityById(List<T> entities, Long id) {
        return entities.stream().filter(entity -> {
            if (entity instanceof VipBenefit benefit) return id.equals(benefit.getId());
            if (entity instanceof CoinSceneConfig scene) return id.equals(scene.getId());
            return false;
        }).findFirst().orElse(null);
    }

    private void stubReadCatalogs() {
        when(vipBenefitDao.selectPage(any(), any())).thenReturn(page(List.of()));
        when(coinSceneConfigDao.selectPage(any(), any())).thenReturn(page(List.of()));
        when(commercialConfigLogDao.selectPage(any(), any())).thenReturn(page(List.of()));
        when(vipPackageDao.selectPage(any(), any())).thenReturn(page(List.of()));
        when(coinPackageDao.selectPage(any(), any())).thenReturn(page(List.of()));
    }

    private CommercialSettingsReq validSettings() {
        CommercialSettingsReq req = new CommercialSettingsReq();
        req.setIdealBatchMax(5);
        req.setIdealBatchDiscountPercent(10);
        req.setIdealRetentionDays(90);
        req.setNormalViewQuota(10);
        req.setVipViewQuota(20);
        req.setVipExpireRemindDays(3);
        req.setRefundDisplay(true);
        req.setExposureReserveEnabled(false);
        req.setExposureReserveDescription("首版仅预留，不开放购买");
        return req;
    }

    private <T> Page<T> page(List<T> records) {
        Page<T> page = new Page<>(1, 1000, records.size());
        page.setRecords(records);
        return page;
    }
}
