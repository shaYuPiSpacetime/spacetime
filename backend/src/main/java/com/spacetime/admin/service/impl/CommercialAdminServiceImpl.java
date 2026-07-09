package com.spacetime.admin.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spacetime.admin.dto.request.CoinPackageSaveReq;
import com.spacetime.admin.dto.request.CoinSceneConfigReq;
import com.spacetime.admin.dto.request.CommercialConfigSaveReq;
import com.spacetime.admin.dto.request.VipBenefitSaveReq;
import com.spacetime.admin.dto.request.VipPackageSaveReq;
import com.spacetime.admin.dto.response.CoinFlowVO;
import com.spacetime.admin.dto.response.CoinPackageVO;
import com.spacetime.admin.dto.response.CoinSceneConfigVO;
import com.spacetime.admin.dto.response.CommercialConfigLogVO;
import com.spacetime.admin.dto.response.CommercialConfigVO;
import com.spacetime.admin.dto.response.RefundRecordVO;
import com.spacetime.admin.dto.response.TradeOrderVO;
import com.spacetime.admin.dto.response.UserCommercialAssetDetailVO;
import com.spacetime.admin.dto.response.VipBenefitVO;
import com.spacetime.admin.dto.response.VipPackageVO;
import com.spacetime.admin.service.CommercialAdminService;
import com.spacetime.common.dao.AppUserDao;
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
import com.spacetime.common.exception.BusinessException;
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

    @Override
    public CommercialConfigVO getConfig() {
        CommercialConfigVO vo = new CommercialConfigVO();
        vo.setVipBenefits(listBenefits().stream().map(this::toBenefitVO).toList());
        vo.setVipPackages(listVipPackages().stream().map(this::toVipPackageVO).toList());
        vo.setCoinPackages(listCoinPackages().stream().map(this::toCoinPackageVO).toList());
        vo.setCoinScenes(listSceneConfigs().stream().map(this::toSceneVO).toList());
        vo.setLatestLogs(getConfigLogs(1, 5).getRecords());
        vo.setConfigVersion(vo.getLatestLogs().isEmpty() ? "COMM-INIT" : vo.getLatestLogs().get(0).getConfigVersion());
        return vo;
    }

    @Override
    @Transactional
    public CommercialConfigVO saveConfig(CommercialConfigSaveReq req) {
        CommercialConfigVO before = getConfig();
        upsertBenefits(req.getVipBenefits());
        upsertVipPackages(req.getVipPackages());
        upsertCoinPackages(req.getCoinPackages());
        upsertCoinScenes(req.getCoinScenes());

        CommercialConfigVO after = getConfig();
        String version = "COMM-" + LocalDateTime.now().format(VERSION_FORMATTER);
        writeConfigLog(version, req.getChangeSummary(), before, after);
        log.info("保存商业化配置: version={}", version);
        after.setConfigVersion(version);
        return after;
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
        vo.setAvatar(user.getAvatar());
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
            VipBenefit entity = existing.getOrDefault(req.getBenefitCode(), new VipBenefit());
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
            VipPackage entity = existing.getOrDefault(req.getPackageName(), new VipPackage());
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
            CoinPackage entity = existing.getOrDefault(req.getPackageName(), new CoinPackage());
            fillCoinPackage(entity, req);
            if (entity.getId() == null) {
                coinPackageDao.insert(entity);
            } else {
                coinPackageDao.updateById(entity);
            }
        }
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
            CoinSceneConfig entity = existing.getOrDefault(req.getSceneCode(), new CoinSceneConfig());
            fillScene(entity, req);
            if (entity.getId() == null) {
                coinSceneConfigDao.insert(entity);
            } else {
                coinSceneConfigDao.updateById(entity);
            }
        }
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
        entity.setBenefitCode(req.getBenefitCode());
        entity.setBenefitName(req.getBenefitName());
        entity.setBenefitType(req.getBenefitType());
        entity.setBenefitDesc(req.getBenefitDesc());
        entity.setMobileIcon(req.getMobileIcon());
        entity.setBenefitValue(req.getBenefitValue());
        entity.setFixedFlag(req.getFixedFlag());
        entity.setDisplayOrder(req.getDisplayOrder());
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
        entity.setSceneCode(req.getSceneCode());
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
        vo.setChangeSummary(entity.getChangeSummary());
        vo.setOperatorId(entity.getOperatorId());
        vo.setOperatorName(entity.getOperatorName());
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
