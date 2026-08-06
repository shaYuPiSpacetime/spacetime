package com.spacetime.admin.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.admin.dto.request.CoinPackageSaveReq;
import com.spacetime.admin.dto.request.CoinSceneConfigReq;
import com.spacetime.admin.dto.request.CommercialConfigSaveReq;
import com.spacetime.admin.dto.request.CommercialSettingsReq;
import com.spacetime.admin.dto.request.VipBenefitSaveReq;
import com.spacetime.admin.dto.request.VipPackageSaveReq;
import com.spacetime.admin.dto.response.CoinFlowVO;
import com.spacetime.admin.dto.response.CoinPackageVO;
import com.spacetime.admin.dto.response.CoinSceneConfigVO;
import com.spacetime.admin.dto.response.CommercialConfigLogVO;
import com.spacetime.admin.dto.response.CommercialConfigVO;
import com.spacetime.admin.dto.response.CommercialSettingsVO;
import com.spacetime.admin.dto.response.RefundRecordVO;
import com.spacetime.admin.dto.response.TradeOrderVO;
import com.spacetime.admin.dto.response.UserCommercialAssetDetailVO;
import com.spacetime.admin.dto.response.VipBenefitVO;
import com.spacetime.admin.dto.response.VipPackageVO;
import com.spacetime.admin.service.CommercialAdminService;
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
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.AppConfig;
import com.spacetime.common.entity.CoinPackage;
import com.spacetime.common.entity.CoinSceneConfig;
import com.spacetime.common.entity.CommercialConfigLog;
import com.spacetime.common.entity.RefundRecord;
import com.spacetime.common.entity.TradeOrder;
import com.spacetime.common.entity.UserAsset;
import com.spacetime.common.entity.UserCoinLog;
import com.spacetime.common.entity.VipBenefit;
import com.spacetime.common.entity.VipPackage;
import com.spacetime.common.enums.CommonStatusEnum;
import com.spacetime.common.enums.ConfigGroupEnum;
import com.spacetime.common.enums.ConfigTypeEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.service.AppUserAuditContentService;
import com.spacetime.common.interceptor.UserContext;
import com.spacetime.common.interceptor.UserContextHolder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 商业化后台聚合服务实现
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class CommercialAdminServiceImpl implements CommercialAdminService {
    private static final int SCENE_COUNT = 8;
    private static final Set<String> BENEFIT_CODES = Set.of(
            "heart_list", "visitor_list", "free_whisper", "extra_browse", "advanced_filter",
            "exposure_score", "privacy", "three_day_replay", "daily_heart_chance"
    );
    private static final Set<String> SCENE_CODES = Set.of(
            "whisper", "likes_unlock_one", "viewers_unlock_one", "ideal_user_unlock",
            "ideal_batch_unlock", "compatible_person_unlock_one",
            "soulmate_mizhiyin_unlock_one", "career_recommend_unlock_one"
    );
    private static final Set<String> CONFIG_STATUSES = Set.of(
            CommonStatusEnum.ENABLED.getCode(), CommonStatusEnum.DISABLED.getCode()
    );
    private static final String CFG_IDEAL_BATCH_MAX = "commercial.ideal.batch.max";
    private static final String CFG_IDEAL_BATCH_DISCOUNT_PERCENT = "commercial.ideal.batch.discount.percent";
    private static final String CFG_IDEAL_RETENTION_DAYS = "commercial.ideal.retention.days";
    private static final String CFG_NORMAL_VIEW_QUOTA = "commercial.view.quota.normal";
    private static final String CFG_VIP_VIEW_QUOTA = "commercial.view.quota.vip";
    private static final String CFG_VIP_EXPIRE_REMIND_DAYS = "commercial.vip.expire.remind.days";
    private static final String CFG_REFUND_DISPLAY = "commercial.refund.display";
    private static final String CFG_EXPOSURE_RESERVE_ENABLED = "commercial.exposure.reserve.enabled";
    private static final String CFG_EXPOSURE_RESERVE_DESC = "commercial.exposure.reserve.description";
    private static final List<String> COMMERCIAL_SETTING_KEYS = List.of(
            CFG_IDEAL_BATCH_MAX, CFG_IDEAL_BATCH_DISCOUNT_PERCENT, CFG_IDEAL_RETENTION_DAYS,
            CFG_NORMAL_VIEW_QUOTA, CFG_VIP_VIEW_QUOTA,
            CFG_VIP_EXPIRE_REMIND_DAYS, CFG_REFUND_DISPLAY, CFG_EXPOSURE_RESERVE_ENABLED,
            CFG_EXPOSURE_RESERVE_DESC
    );
    private static final DateTimeFormatter VERSION_FORMATTER = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

    /** VIP 权益数据访问对象 */
    private final VipBenefitDao vipBenefitDao;
    /** VIP 套餐数据访问对象 */
    private final VipPackageDao vipPackageDao;
    /** 千寻币套餐数据访问对象 */
    private final CoinPackageDao coinPackageDao;
    /** 千寻币消费场景配置数据访问对象 */
    private final CoinSceneConfigDao coinSceneConfigDao;
    /** 配置审计日志数据访问对象 */
    private final CommercialConfigLogDao commercialConfigLogDao;
    /** 应用配置数据访问对象 */
    private final AppConfigDao appConfigDao;
    /** 小程序用户数据访问对象 */
    private final AppUserDao appUserDao;
    /** 用户资产数据访问对象 */
    private final UserAssetDao userAssetDao;
    /** 交易订单数据访问对象 */
    private final TradeOrderDao tradeOrderDao;
    /** 千寻币流水数据访问对象 */
    private final UserCoinLogDao userCoinLogDao;
    /** 退款记录数据访问对象 */
    private final RefundRecordDao refundRecordDao;
    /** JSON 序列化器 */
    private final ObjectMapper objectMapper;
    private final AppUserAuditContentService auditContentService;

    @Override
    public CommercialConfigVO getConfig() {
        CommercialConfigVO vo = new CommercialConfigVO();
        vo.setVipBenefits(listBenefits().stream().map(this::toBenefitVO).toList());
        vo.setVipPackages(listVipPackages().stream().map(this::toVipPackageVO).toList());
        vo.setCoinPackages(listCoinPackages().stream().map(this::toCoinPackageVO).toList());
        vo.setCoinScenes(listSceneConfigs().stream().map(this::toSceneVO).toList());
        vo.setSettings(loadCommercialSettings());
        vo.setLatestLogs(getConfigLogs(1, 5).getRecords());
        vo.setConfigVersion(vo.getLatestLogs().isEmpty() ? "COMM-INIT" : vo.getLatestLogs().get(0).getConfigVersion());
        return vo;
    }

    @Override
    @Transactional
    public CommercialConfigVO saveConfig(CommercialConfigSaveReq req) {
        validateConfig(req);
        CommercialConfigVO before = getConfig();
        validateExistingPackageCoverage(req, before);
        upsertBenefits(req.getVipBenefits());
        upsertVipPackages(req.getVipPackages());
        upsertCoinPackages(req.getCoinPackages());
        upsertCoinScenes(req.getCoinScenes());
        saveCommercialSettings(req.getSettings());

        CommercialConfigVO after = getConfig();
        String version = "COMM-" + LocalDateTime.now().format(VERSION_FORMATTER);
        writeConfigLog(version, req.getChangeSummary(), before, after);
        log.info("保存商业化配置: version={}", version);
        after.setConfigVersion(version);
        return after;
    }

    private void validateConfig(CommercialConfigSaveReq req) {
        validateBenefits(req.getVipBenefits());
        validateVipPackages(req.getVipPackages());
        validateCoinPackages(req.getCoinPackages());
        validateCoinScenes(req.getCoinScenes());
        validateSettings(req.getSettings());
    }

    private void validateBenefits(List<VipBenefitSaveReq> reqList) {
        if (reqList == null) {
            return;
        }
        Set<String> codes = reqList.stream().map(VipBenefitSaveReq::getBenefitCode).collect(Collectors.toSet());
        if (reqList.size() != BENEFIT_CODES.size() || !codes.equals(BENEFIT_CODES)) {
            throw new BusinessException("会员权益必须配置固定 9 项");
        }
        for (VipBenefitSaveReq req : reqList) {
            validateStatus(req.getStatus());
            if (isEnabled(req.getStatus()) && StrUtil.isBlank(req.getMobileIcon())) {
                throw new BusinessException("启用的会员权益移动端图标不能为空");
            }
            if (req.getBenefitValue() != null && req.getBenefitValue() < 0) {
                throw new BusinessException("会员权益次数或分数不能为负数");
            }
        }
    }

    private void validateVipPackages(List<VipPackageSaveReq> reqList) {
        if (reqList == null) {
            return;
        }
        for (VipPackageSaveReq req : reqList) {
            validateStatus(req.getStatus());
            if (!"normal".equals(req.getPackageType()) || !"once".equals(req.getSubscriptionType())) {
                throw new BusinessException("会员套餐仅支持普通套餐和一次性购买");
            }
            if (req.getPrice() == null || req.getPrice().compareTo(BigDecimal.ZERO) <= 0) {
                throw new BusinessException("会员套餐售价必须大于 0");
            }
            if (req.getOriginPrice() != null && req.getOriginPrice().compareTo(BigDecimal.ZERO) > 0
                    && req.getPrice().compareTo(req.getOriginPrice()) > 0) {
                throw new BusinessException("会员套餐优惠价不能高于原价");
            }
            if (req.getDurationDays() == null || req.getDurationDays() <= 0) {
                throw new BusinessException("会员套餐有效天数必须大于 0");
            }
        }
    }

    private void validateCoinPackages(List<CoinPackageSaveReq> reqList) {
        if (reqList == null) {
            return;
        }
        long recommendedCount = reqList.stream().filter(item -> Integer.valueOf(1).equals(item.getRecommendFlag())).count();
        if (recommendedCount > 1) {
            throw new BusinessException("千寻币推荐档最多只能配置一个");
        }
        for (CoinPackageSaveReq req : reqList) {
            validateStatus(req.getStatus());
            if (req.getAmount() == null || req.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
                throw new BusinessException("千寻币套餐售价必须大于 0");
            }
            if (req.getCoinCount() == null || req.getCoinCount() <= 0) {
                throw new BusinessException("千寻币到账数量必须大于 0");
            }
            if (req.getBonusCoinCount() != null && req.getBonusCoinCount() < 0) {
                throw new BusinessException("赠送千寻币数量不能为负数");
            }
            if (req.getDiscountAmount() != null && req.getDiscountAmount().compareTo(BigDecimal.ZERO) <= 0) {
                throw new BusinessException("千寻币优惠价必须大于 0");
            }
            if (req.getOriginAmount() != null && req.getOriginAmount().compareTo(BigDecimal.ZERO) > 0
                    && req.getDiscountAmount() != null
                    && req.getDiscountAmount().compareTo(req.getOriginAmount()) > 0) {
                throw new BusinessException("千寻币优惠价不能高于原价");
            }
        }
    }

    private void validateCoinScenes(List<CoinSceneConfigReq> reqList) {
        if (reqList == null) {
            return;
        }
        Set<String> codes = reqList.stream().map(CoinSceneConfigReq::getSceneCode).collect(Collectors.toSet());
        if (reqList.size() != SCENE_COUNT || !codes.equals(SCENE_CODES)) {
            throw new BusinessException("千寻币消费场景目录不合法，必须配置固定 8 项");
        }
        for (CoinSceneConfigReq req : reqList) {
            validateStatus(req.getStatus());
            if (req.getUnitPrice() == null || req.getUnitPrice() < 0) {
                throw new BusinessException("消费场景单价不能为负数");
            }
            if (isEnabled(req.getStatus())
                    && (StrUtil.isBlank(req.getMobileName()) || StrUtil.isBlank(req.getMobileIcon()))) {
                throw new BusinessException("启用的消费场景移动端名称和图标不能为空");
            }
        }
    }

    private void validateStatus(String status) {
        if (StrUtil.isNotBlank(status) && !CONFIG_STATUSES.contains(status)) {
            throw new BusinessException("配置状态不合法");
        }
    }

    private boolean isEnabled(String status) {
        return StrUtil.isBlank(status) || CommonStatusEnum.ENABLED.getCode().equals(status);
    }

    private void validateSettings(CommercialSettingsReq settings) {
        if (settings == null) {
            return;
        }
        if (settings.getIdealBatchMax() == null || settings.getIdealBatchMax() < 1
                || settings.getIdealRetentionDays() == null || settings.getIdealRetentionDays() < 1) {
            throw new BusinessException("解锁批量上限和保留天数必须大于 0");
        }
        if (settings.getIdealBatchDiscountPercent() == null
                || settings.getIdealBatchDiscountPercent() < 0
                || settings.getIdealBatchDiscountPercent() > 100) {
            throw new BusinessException("理想型解锁全部折扣比例必须为 0-100");
        }
        if (settings.getNormalViewQuota() == null || settings.getNormalViewQuota() < 0
                || settings.getVipViewQuota() == null || settings.getVipViewQuota() < settings.getNormalViewQuota()) {
            throw new BusinessException("会员查看配额不能低于普通用户配额");
        }
        if (settings.getVipExpireRemindDays() == null
                || settings.getVipExpireRemindDays() < 1 || settings.getVipExpireRemindDays() > 30) {
            throw new BusinessException("会员到期提醒提前天数必须为 1-30 天");
        }
        if (settings.getRefundDisplay() == null || settings.getExposureReserveEnabled() == null) {
            throw new BusinessException("商业化开关配置不能为空");
        }
    }

    private void validateExistingPackageCoverage(CommercialConfigSaveReq req, CommercialConfigVO before) {
        if (req.getVipPackages() != null) {
            Set<Long> requestIds = req.getVipPackages().stream()
                    .map(VipPackageSaveReq::getId).filter(Objects::nonNull).collect(Collectors.toSet());
            long requestIdCount = req.getVipPackages().stream().map(VipPackageSaveReq::getId).filter(Objects::nonNull).count();
            if (requestIds.size() != requestIdCount) {
                throw new BusinessException("VIP 套餐 ID 不能重复");
            }
            Set<Long> existingIds = before.getVipPackages().stream()
                    .map(VipPackageVO::getId).collect(Collectors.toSet());
            if (!requestIds.containsAll(existingIds)) {
                throw new BusinessException("不能省略已有 VIP 套餐，请通过下架保留历史订单关联");
            }
        }
        if (req.getCoinPackages() != null) {
            Set<Long> requestIds = req.getCoinPackages().stream()
                    .map(CoinPackageSaveReq::getId).filter(Objects::nonNull).collect(Collectors.toSet());
            long requestIdCount = req.getCoinPackages().stream().map(CoinPackageSaveReq::getId).filter(Objects::nonNull).count();
            if (requestIds.size() != requestIdCount) {
                throw new BusinessException("千寻币套餐 ID 不能重复");
            }
            Set<Long> existingIds = before.getCoinPackages().stream()
                    .map(CoinPackageVO::getId).collect(Collectors.toSet());
            if (!requestIds.containsAll(existingIds)) {
                throw new BusinessException("不能省略已有千寻币套餐，请通过下架保留历史订单关联");
            }
        }
    }

    private CommercialSettingsVO loadCommercialSettings() {
        List<AppConfig> configs = appConfigDao.selectByKeys(COMMERCIAL_SETTING_KEYS);
        Map<String, String> values = (configs == null ? List.<AppConfig>of() : configs).stream()
                .collect(Collectors.toMap(AppConfig::getConfigKey, AppConfig::getConfigValue, (a, b) -> b));
        CommercialSettingsVO vo = new CommercialSettingsVO();
        vo.setIdealBatchMax(intValue(values, CFG_IDEAL_BATCH_MAX, 5));
        vo.setIdealBatchDiscountPercent(intValue(values, CFG_IDEAL_BATCH_DISCOUNT_PERCENT, 10));
        vo.setIdealRetentionDays(intValue(values, CFG_IDEAL_RETENTION_DAYS, 90));
        vo.setNormalViewQuota(intValue(values, CFG_NORMAL_VIEW_QUOTA, 10));
        vo.setVipViewQuota(intValue(values, CFG_VIP_VIEW_QUOTA, 20));
        vo.setVipExpireRemindDays(intValue(values, CFG_VIP_EXPIRE_REMIND_DAYS, 3));
        vo.setRefundDisplay(booleanValue(values, CFG_REFUND_DISPLAY, true));
        vo.setExposureReserveEnabled(booleanValue(values, CFG_EXPOSURE_RESERVE_ENABLED, false));
        vo.setExposureReserveDescription(values.getOrDefault(CFG_EXPOSURE_RESERVE_DESC, "首版仅预留，不开放购买"));
        return vo;
    }

    private int intValue(Map<String, String> values, String key, int fallback) {
        try {
            return Integer.parseInt(values.getOrDefault(key, String.valueOf(fallback)));
        } catch (NumberFormatException ignored) {
            return fallback;
        }
    }

    private boolean booleanValue(Map<String, String> values, String key, boolean fallback) {
        String value = values.get(key);
        return value == null ? fallback : Boolean.parseBoolean(value);
    }

    private void saveCommercialSettings(CommercialSettingsReq settings) {
        if (settings == null) {
            return;
        }
        upsertSetting(CFG_IDEAL_BATCH_MAX, settings.getIdealBatchMax(), ConfigTypeEnum.NUMBER, "理想型批量上限");
        upsertSetting(CFG_IDEAL_BATCH_DISCOUNT_PERCENT, settings.getIdealBatchDiscountPercent(),
                ConfigTypeEnum.NUMBER, "理想型解锁全部折扣比例");
        upsertSetting(CFG_IDEAL_RETENTION_DAYS, settings.getIdealRetentionDays(), ConfigTypeEnum.NUMBER, "理想型保留天数");
        upsertSetting(CFG_NORMAL_VIEW_QUOTA, settings.getNormalViewQuota(), ConfigTypeEnum.NUMBER, "普通用户每日查看配额");
        upsertSetting(CFG_VIP_VIEW_QUOTA, settings.getVipViewQuota(), ConfigTypeEnum.NUMBER, "会员每日查看配额");
        upsertSetting(CFG_VIP_EXPIRE_REMIND_DAYS, settings.getVipExpireRemindDays(), ConfigTypeEnum.NUMBER, "会员到期提醒提前天数");
        upsertSetting(CFG_REFUND_DISPLAY, settings.getRefundDisplay(), ConfigTypeEnum.BOOLEAN, "退款状态前台展示");
        upsertSetting(CFG_EXPOSURE_RESERVE_ENABLED, settings.getExposureReserveEnabled(), ConfigTypeEnum.BOOLEAN, "曝光包预留开关");
        upsertSetting(CFG_EXPOSURE_RESERVE_DESC, settings.getExposureReserveDescription(), ConfigTypeEnum.TEXT, "曝光包预留说明");
    }

    private void upsertSetting(String key, Object value, ConfigTypeEnum type, String remark) {
        AppConfig entity = new AppConfig();
        entity.setConfigKey(key);
        entity.setConfigValue(value == null ? "" : String.valueOf(value));
        entity.setConfigGroup(ConfigGroupEnum.COMMERCIAL.getCode());
        entity.setConfigType(type.getCode());
        entity.setPublicVisible(0);
        entity.setStatus(CommonStatusEnum.ENABLED.getCode());
        entity.setRemark(remark);
        appConfigDao.upsert(entity);
    }

    @Override
    public Page<CommercialConfigLogVO> getConfigLogs(long page, long size) {
        LambdaQueryWrapper<CommercialConfigLog> wrapper = new LambdaQueryWrapper<CommercialConfigLog>()
                .orderByDesc(CommercialConfigLog::getCreateTime);
        Page<CommercialConfigLog> raw = commercialConfigLogDao.selectPage(new Page<>(page, size), wrapper);
        Page<CommercialConfigLogVO> result = new Page<>(raw.getCurrent(), raw.getSize(), raw.getTotal());
        result.setRecords(raw.getRecords().stream().map(this::toConfigLogVO).toList());
        return result;
    }

    @Override
    public UserCommercialAssetDetailVO getUserAssetDetail(Long userId) {
        AppUser user = appUserDao.selectById(userId);
        if (user == null) {
            throw new BusinessException("小程序用户不存在");
        }
        UserAsset asset = userAssetDao.selectByUserId(userId);

        UserCommercialAssetDetailVO vo = new UserCommercialAssetDetailVO();
        vo.setUserId(userId);
        vo.setNickname(user.getNickname());
        vo.setAvatar(auditContentService.publicAvatar(userId));
        if (asset != null) {
            vo.setVipStatus(asset.getVipStatus());
            vo.setVipExpireTime(asset.getVipExpireTime());
            vo.setCoinBalance(asset.getCoinBalance());
            vo.setTodayFreeWhisperRemain(asset.getTodayFreeWhisperRemain());
            vo.setTotalRecharge(asset.getTotalRecharge());
        } else {
            vo.setVipStatus("inactive");
            vo.setCoinBalance(0);
            vo.setTodayFreeWhisperRemain(0);
            vo.setTotalRecharge(BigDecimal.ZERO);
        }
        vo.setRecentOrders(recentOrders(userId));
        vo.setRecentFlows(recentFlows(userId));
        vo.setRecentRefunds(recentRefunds(userId));
        return vo;
    }

    private void upsertBenefits(List<VipBenefitSaveReq> reqList) {
        if (reqList == null) {
            return;
        }
        Map<String, VipBenefit> existing = listBenefits().stream()
                .filter(item -> StrUtil.isNotBlank(item.getBenefitCode()))
                .collect(Collectors.toMap(VipBenefit::getBenefitCode, Function.identity(), (a, b) -> a));
        for (VipBenefitSaveReq req : reqList) {
            VipBenefit entity = resolveBenefit(req, existing);
            fillBenefit(entity, req);
            if (entity.getId() == null) {
                vipBenefitDao.insert(entity);
            } else {
                vipBenefitDao.updateById(entity);
            }
        }
    }

    private void upsertVipPackages(List<VipPackageSaveReq> reqList) {
        if (reqList == null) {
            return;
        }
        Map<String, VipPackage> existing = listVipPackages().stream()
                .filter(item -> StrUtil.isNotBlank(item.getPackageName()))
                .collect(Collectors.toMap(VipPackage::getPackageName, Function.identity(), (a, b) -> a));
        for (VipPackageSaveReq req : reqList) {
            VipPackage entity = resolveVipPackage(req, existing);
            fillVipPackage(entity, req);
            if (entity.getId() == null) {
                vipPackageDao.insert(entity);
            } else {
                vipPackageDao.updateById(entity);
            }
        }
    }

    private void upsertCoinPackages(List<CoinPackageSaveReq> reqList) {
        if (reqList == null) {
            return;
        }
        Map<String, CoinPackage> existing = listCoinPackages().stream()
                .filter(item -> StrUtil.isNotBlank(item.getPackageName()))
                .collect(Collectors.toMap(CoinPackage::getPackageName, Function.identity(), (a, b) -> a));
        for (CoinPackageSaveReq req : reqList) {
            CoinPackage entity = resolveCoinPackage(req, existing);
            fillCoinPackage(entity, req);
            if (entity.getId() == null) {
                coinPackageDao.insert(entity);
            } else {
                coinPackageDao.updateById(entity);
            }
        }
    }

    private VipPackage resolveVipPackage(VipPackageSaveReq req, Map<String, VipPackage> existing) {
        if (req.getId() == null) {
            return existing.getOrDefault(req.getPackageName(), new VipPackage());
        }
        VipPackage entity = vipPackageDao.selectById(req.getId());
        if (entity == null) {
            throw new BusinessException("VIP 套餐不存在");
        }
        return entity;
    }

    private VipBenefit resolveBenefit(VipBenefitSaveReq req, Map<String, VipBenefit> existing) {
        if (req.getId() == null) {
            return existing.getOrDefault(req.getBenefitCode(), new VipBenefit());
        }
        VipBenefit entity = vipBenefitDao.selectById(req.getId());
        if (entity == null) {
            throw new BusinessException("会员权益不存在");
        }
        if (!Objects.equals(entity.getBenefitCode(), req.getBenefitCode())) {
            throw new BusinessException("会员权益 ID 与编码不匹配");
        }
        return entity;
    }

    private CoinPackage resolveCoinPackage(CoinPackageSaveReq req, Map<String, CoinPackage> existing) {
        if (req.getId() == null) {
            return existing.getOrDefault(req.getPackageName(), new CoinPackage());
        }
        CoinPackage entity = coinPackageDao.selectById(req.getId());
        if (entity == null) {
            throw new BusinessException("千寻币套餐不存在");
        }
        return entity;
    }

    private void upsertCoinScenes(List<CoinSceneConfigReq> reqList) {
        if (reqList == null) {
            return;
        }
        if (reqList.size() != SCENE_COUNT) {
            throw new BusinessException("千寻币消费场景必须配置 8 个");
        }
        Map<String, CoinSceneConfig> existing = listSceneConfigs().stream()
                .filter(item -> StrUtil.isNotBlank(item.getSceneCode()))
                .collect(Collectors.toMap(CoinSceneConfig::getSceneCode, Function.identity(), (a, b) -> a));
        for (CoinSceneConfigReq req : reqList) {
            if (req.getUnitPrice() == null || req.getUnitPrice() < 0) {
                throw new BusinessException("消费场景单价不能为负数");
            }
            CoinSceneConfig entity = resolveCoinScene(req, existing);
            fillScene(entity, req);
            if (entity.getId() == null) {
                coinSceneConfigDao.insert(entity);
            } else {
                coinSceneConfigDao.updateById(entity);
            }
        }
    }

    private CoinSceneConfig resolveCoinScene(CoinSceneConfigReq req, Map<String, CoinSceneConfig> existing) {
        if (req.getId() == null) {
            return existing.getOrDefault(req.getSceneCode(), new CoinSceneConfig());
        }
        CoinSceneConfig entity = coinSceneConfigDao.selectById(req.getId());
        if (entity == null) {
            throw new BusinessException("千寻币消费场景不存在");
        }
        if (!Objects.equals(entity.getSceneCode(), req.getSceneCode())) {
            throw new BusinessException("消费场景 ID 与编码不匹配");
        }
        return entity;
    }

    private void writeConfigLog(String version, String changeSummary, CommercialConfigVO before, CommercialConfigVO after) {
        UserContext ctx = UserContextHolder.get();
        CommercialConfigLog logEntity = new CommercialConfigLog();
        logEntity.setConfigVersion(version);
        logEntity.setChangeModule("commercial");
        logEntity.setChangeSummary(StrUtil.blankToDefault(changeSummary, "商业化配置保存"));
        logEntity.setOperatorId(ctx != null ? ctx.getId() : null);
        logEntity.setOperatorName(ctx != null ? ctx.getNickname() : null);
        logEntity.setBeforeSnapshot(toJson(before));
        logEntity.setAfterSnapshot(toJson(after));
        commercialConfigLogDao.insert(logEntity);
    }

    private List<VipBenefit> listBenefits() {
        Page<VipBenefit> page = vipBenefitDao.selectPage(new Page<>(1, 1000),
                new LambdaQueryWrapper<VipBenefit>().orderByAsc(VipBenefit::getDisplayOrder));
        return page.getRecords();
    }

    private List<VipPackage> listVipPackages() {
        Page<VipPackage> page = vipPackageDao.selectPage(new Page<>(1, 1000),
                new LambdaQueryWrapper<VipPackage>().orderByAsc(VipPackage::getSortOrder));
        return page.getRecords();
    }

    private List<CoinPackage> listCoinPackages() {
        Page<CoinPackage> page = coinPackageDao.selectPage(new Page<>(1, 1000),
                new LambdaQueryWrapper<CoinPackage>().orderByAsc(CoinPackage::getSortOrder));
        return page.getRecords();
    }

    private List<CoinSceneConfig> listSceneConfigs() {
        Page<CoinSceneConfig> page = coinSceneConfigDao.selectPage(new Page<>(1, 1000),
                new LambdaQueryWrapper<CoinSceneConfig>().orderByAsc(CoinSceneConfig::getSortOrder));
        return page.getRecords();
    }

    private List<TradeOrderVO> recentOrders(Long userId) {
        Page<TradeOrder> page = tradeOrderDao.selectPage(new Page<>(1, 5),
                new LambdaQueryWrapper<TradeOrder>()
                        .eq(TradeOrder::getUserId, userId)
                        .orderByDesc(TradeOrder::getCreateTime));
        return page.getRecords().stream().map(this::toOrderVO).toList();
    }

    private List<CoinFlowVO> recentFlows(Long userId) {
        Page<UserCoinLog> page = userCoinLogDao.selectPage(new Page<>(1, 5),
                new LambdaQueryWrapper<UserCoinLog>()
                        .eq(UserCoinLog::getUserId, userId)
                        .orderByDesc(UserCoinLog::getCreateTime));
        return page.getRecords().stream().map(this::toFlowVO).toList();
    }

    private List<RefundRecordVO> recentRefunds(Long userId) {
        Page<RefundRecord> page = refundRecordDao.selectPage(new Page<>(1, 5),
                new LambdaQueryWrapper<RefundRecord>()
                        .eq(RefundRecord::getUserId, userId)
                        .orderByDesc(RefundRecord::getCreateTime));
        return page.getRecords().stream().map(item -> toRefundVO(item, tradeOrderDao.selectById(item.getOrderId()))).toList();
    }

    private void fillBenefit(VipBenefit entity, VipBenefitSaveReq req) {
        if (entity.getId() == null) {
            entity.setBenefitCode(req.getBenefitCode());
            entity.setBenefitName(req.getBenefitName());
            entity.setBenefitType(req.getBenefitType());
            entity.setBenefitDesc(req.getBenefitDesc());
            entity.setFixedFlag(req.getFixedFlag());
            entity.setDisplayOrder(req.getDisplayOrder());
        }
        entity.setMobileIcon(req.getMobileIcon());
        entity.setBenefitValue(req.getBenefitValue());
        entity.setStatus(StrUtil.blankToDefault(req.getStatus(), CommonStatusEnum.ENABLED.getCode()));
    }

    private void fillVipPackage(VipPackage entity, VipPackageSaveReq req) {
        entity.setPackageName(req.getPackageName());
        entity.setPackageType(req.getPackageType());
        entity.setSubscriptionType(req.getSubscriptionType());
        entity.setPrice(req.getPrice());
        entity.setOriginPrice(req.getOriginPrice());
        entity.setDurationDays(req.getDurationDays());
        entity.setRecommendFlag(req.getRecommendFlag());
        entity.setPackageTag(req.getPackageTag());
        entity.setWechatProductId(req.getWechatProductId());
        entity.setAgreementConfig(req.getAgreementConfig());
        entity.setPayChannelReserve(req.getPayChannelReserve());
        entity.setSortOrder(req.getSortOrder());
        entity.setStatus(StrUtil.blankToDefault(req.getStatus(), CommonStatusEnum.ENABLED.getCode()));
    }

    private void fillCoinPackage(CoinPackage entity, CoinPackageSaveReq req) {
        entity.setPackageName(req.getPackageName());
        entity.setAmount(req.getAmount());
        entity.setOriginAmount(req.getOriginAmount());
        entity.setDiscountAmount(req.getDiscountAmount());
        entity.setCoinCount(req.getCoinCount());
        entity.setBonusCoinCount(req.getBonusCoinCount());
        entity.setRecommendFlag(req.getRecommendFlag());
        entity.setPackageTag(req.getPackageTag());
        entity.setMobileTag(req.getMobileTag());
        entity.setPackageDesc(req.getPackageDesc());
        entity.setSortOrder(req.getSortOrder());
        entity.setStatus(StrUtil.blankToDefault(req.getStatus(), CommonStatusEnum.ENABLED.getCode()));
    }

    private void fillScene(CoinSceneConfig entity, CoinSceneConfigReq req) {
        if (entity.getId() == null) {
            entity.setSceneCode(req.getSceneCode());
        }
        entity.setMobileName(req.getMobileName());
        entity.setMobileIcon(req.getMobileIcon());
        entity.setSceneDesc(req.getSceneDesc());
        entity.setUnitPrice(req.getUnitPrice());
        entity.setRetentionDays(req.getRetentionDays() == null ? 0 : req.getRetentionDays());
        entity.setSortOrder(req.getSortOrder());
        entity.setStatus(StrUtil.blankToDefault(req.getStatus(), CommonStatusEnum.ENABLED.getCode()));
    }

    private VipBenefitVO toBenefitVO(VipBenefit entity) {
        VipBenefitVO vo = new VipBenefitVO();
        vo.setId(entity.getId());
        vo.setBenefitCode(entity.getBenefitCode());
        vo.setBenefitName(entity.getBenefitName());
        vo.setBenefitType(entity.getBenefitType());
        vo.setBenefitDesc(entity.getBenefitDesc());
        vo.setMobileIcon(entity.getMobileIcon());
        vo.setBenefitValue(entity.getBenefitValue());
        vo.setFixedFlag(entity.getFixedFlag());
        vo.setDisplayOrder(entity.getDisplayOrder());
        vo.setStatus(entity.getStatus());
        vo.setCreateTime(entity.getCreateTime());
        vo.setUpdateTime(entity.getUpdateTime());
        return vo;
    }

    private VipPackageVO toVipPackageVO(VipPackage entity) {
        VipPackageVO vo = new VipPackageVO();
        vo.setId(entity.getId());
        vo.setPackageName(entity.getPackageName());
        vo.setPackageType(entity.getPackageType());
        vo.setSubscriptionType(entity.getSubscriptionType());
        vo.setPrice(entity.getPrice());
        vo.setOriginPrice(entity.getOriginPrice());
        vo.setDurationDays(entity.getDurationDays());
        vo.setRecommendFlag(entity.getRecommendFlag());
        vo.setPackageTag(entity.getPackageTag());
        vo.setWechatProductId(entity.getWechatProductId());
        vo.setAgreementConfig(entity.getAgreementConfig());
        vo.setPayChannelReserve(entity.getPayChannelReserve());
        vo.setSortOrder(entity.getSortOrder());
        vo.setStatus(entity.getStatus());
        vo.setCreateTime(entity.getCreateTime());
        vo.setUpdateTime(entity.getUpdateTime());
        return vo;
    }

    private CoinPackageVO toCoinPackageVO(CoinPackage entity) {
        CoinPackageVO vo = new CoinPackageVO();
        vo.setId(entity.getId());
        vo.setPackageName(entity.getPackageName());
        vo.setAmount(entity.getAmount());
        vo.setOriginAmount(entity.getOriginAmount());
        vo.setDiscountAmount(entity.getDiscountAmount());
        vo.setCoinCount(entity.getCoinCount());
        vo.setBonusCoinCount(entity.getBonusCoinCount());
        vo.setRecommendFlag(entity.getRecommendFlag());
        vo.setPackageTag(entity.getPackageTag());
        vo.setMobileTag(entity.getMobileTag());
        vo.setPackageDesc(entity.getPackageDesc());
        vo.setSortOrder(entity.getSortOrder());
        vo.setStatus(entity.getStatus());
        vo.setCreateTime(entity.getCreateTime());
        vo.setUpdateTime(entity.getUpdateTime());
        return vo;
    }

    private CoinSceneConfigVO toSceneVO(CoinSceneConfig entity) {
        CoinSceneConfigVO vo = new CoinSceneConfigVO();
        vo.setId(entity.getId());
        vo.setSceneCode(entity.getSceneCode());
        vo.setMobileName(entity.getMobileName());
        vo.setMobileIcon(entity.getMobileIcon());
        vo.setSceneDesc(entity.getSceneDesc());
        vo.setUnitPrice(entity.getUnitPrice());
        vo.setRetentionDays(entity.getRetentionDays());
        vo.setSortOrder(entity.getSortOrder());
        vo.setStatus(entity.getStatus());
        vo.setCreateTime(entity.getCreateTime());
        vo.setUpdateTime(entity.getUpdateTime());
        return vo;
    }

    private CommercialConfigLogVO toConfigLogVO(CommercialConfigLog entity) {
        CommercialConfigLogVO vo = new CommercialConfigLogVO();
        vo.setId(entity.getId());
        vo.setConfigVersion(entity.getConfigVersion());
        vo.setChangeModule(entity.getChangeModule());
        vo.setChangeModuleName("commercial".equalsIgnoreCase(entity.getChangeModule()) ? "商业化配置" : entity.getChangeModule());
        vo.setChangeSummary(entity.getChangeSummary());
        vo.setChangeReason(entity.getChangeSummary());
        vo.setOperatorId(entity.getOperatorId());
        vo.setOperatorName(entity.getOperatorName());
        vo.setBeforeSnapshot(entity.getBeforeSnapshot());
        vo.setAfterSnapshot(entity.getAfterSnapshot());
        vo.setCreateTime(entity.getCreateTime());
        return vo;
    }

    private TradeOrderVO toOrderVO(TradeOrder entity) {
        TradeOrderVO vo = new TradeOrderVO();
        vo.setId(entity.getId());
        vo.setOrderNo(entity.getOrderNo());
        vo.setUserId(entity.getUserId());
        vo.setOrderType(entity.getOrderType());
        vo.setPackageId(entity.getPackageId());
        vo.setPackageName(entity.getPackageName());
        vo.setPayAmount(entity.getPayAmount());
        vo.setPayChannel(entity.getPayChannel());
        vo.setChannelTradeNo(entity.getChannelTradeNo());
        vo.setPrepayId(entity.getPrepayId());
        vo.setNotifySummary(entity.getNotifySummary());
        vo.setOrderStatus(entity.getOrderStatus());
        vo.setSuccessTime(entity.getSuccessTime());
        vo.setExpireTime(entity.getExpireTime());
        vo.setRefundTime(entity.getRefundTime());
        vo.setRefundReason(entity.getRefundReason());
        vo.setRemark(entity.getRemark());
        vo.setCreateTime(entity.getCreateTime());
        return vo;
    }

    private CoinFlowVO toFlowVO(UserCoinLog entity) {
        CoinFlowVO vo = new CoinFlowVO();
        vo.setId(entity.getId());
        vo.setFlowNo(entity.getFlowNo());
        vo.setUserId(entity.getUserId());
        vo.setFlowType(entity.getFlowType());
        vo.setChangeAmount(entity.getChangeAmount());
        vo.setBalanceBefore(entity.getBalanceBefore());
        vo.setBalanceAfter(entity.getBalanceAfter());
        vo.setBizScene(entity.getBizScene());
        vo.setBizDesc(entity.getBizDesc());
        vo.setRefId(entity.getRefId());
        vo.setRefType(entity.getRefType());
        vo.setCreateTime(entity.getCreateTime());
        return vo;
    }

    private RefundRecordVO toRefundVO(RefundRecord refund, TradeOrder order) {
        RefundRecordVO vo = new RefundRecordVO();
        vo.setId(refund.getId());
        vo.setRefundNo(refund.getRefundNo());
        vo.setOrderId(refund.getOrderId());
        vo.setOrderNo(refund.getOrderNo());
        vo.setUserId(refund.getUserId());
        vo.setRefundAmount(refund.getRefundAmount());
        vo.setRefundReason(refund.getRefundReason());
        vo.setRefundStatus(refund.getRefundStatus());
        vo.setAssetRollbackAction(refund.getAssetRollbackAction());
        vo.setChannelRefundStatus(refund.getChannelRefundStatus());
        vo.setRefundTime(refund.getRefundTime());
        vo.setCreateTime(refund.getCreateTime());
        if (order != null) {
            vo.setOrderType(order.getOrderType());
            vo.setPackageName(order.getPackageName());
            vo.setPayAmount(order.getPayAmount());
            vo.setOrderStatus(order.getOrderStatus());
        }
        return vo;
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception e) {
            return "{}";
        }
    }
}
