package com.spacetime.admin.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.VipPackageSaveReq;
import com.spacetime.admin.dto.response.VipPackageVO;
import com.spacetime.admin.service.VipPackageAdminService;
import com.spacetime.common.dao.VipPackageDao;
import com.spacetime.common.entity.VipPackage;
import com.spacetime.common.entity.VirtualPriceChange;
import com.spacetime.common.enums.CommonStatusEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.service.WechatVirtualProductCatalog;
import com.spacetime.common.service.VirtualPriceChangeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * VIP 套餐后台服务实现
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class VipPackageAdminServiceImpl implements VipPackageAdminService {
    /** VIP 套餐数据访问对象 */
    private final VipPackageDao vipPackageDao;
    private final WechatVirtualProductCatalog virtualProductCatalog;
    private final VirtualPriceChangeService priceChangeService;

    /**
     * 查询全部套餐列表，按排序字段升序
     * @return 套餐列表
     */
    @Override
    public List<VipPackageVO> list() {
        LambdaQueryWrapper<VipPackage> wrapper = new LambdaQueryWrapper<VipPackage>()
                .orderByAsc(VipPackage::getSortOrder);
        Page<VipPackage> page = vipPackageDao.selectPage(new Page<>(1, 1000), wrapper);
        return page.getRecords().stream().map(this::toVO).toList();
    }

    /**
     * 查询套餐详情
     * @param id 套餐ID
     * @return 套餐详情
     */
    @Override
    public VipPackageVO detail(Long id) {
        return toVO(requirePackage(id));
    }

    private VipPackage requirePackage(Long id) {
        VipPackage entity = vipPackageDao.selectById(id);
        if (entity == null) {
            throw new BusinessException("VIP 套餐不存在");
        }
        return entity;
    }

    private VipPackage requirePackageForUpdate(Long id) {
        VipPackage entity = vipPackageDao.selectForUpdate(id);
        if (entity == null) {
            throw new BusinessException("VIP 套餐不存在");
        }
        return entity;
    }

    /**
     * 创建套餐，默认启用
     * @param req 套餐保存请求
     * @return 新套餐ID
     */
    @Override
    @Transactional
    public Long create(VipPackageSaveReq req) {
        validateOneTimePurchase(req);
        VipPackage entity = toEntity(req);
        if (StrUtil.isBlank(entity.getStatus())) {
            entity.setStatus(CommonStatusEnum.ENABLED.getCode());
        }
        if (virtualProductCatalog.isProductionMode()
                && CommonStatusEnum.ENABLED.getCode().equals(entity.getStatus())) {
            throw new BusinessException("线上虚拟支付新增会员套餐请先创建停用状态，取得商品 ID 后配置线上商品再启用");
        }
        vipPackageDao.insert(entity);
        log.info("创建VIP套餐: id={}, packageName={}, price={}", entity.getId(), entity.getPackageName(), entity.getPrice());
        return entity.getId();
    }

    /**
     * 更新套餐信息
     * @param id 套餐ID
     * @param req 套餐保存请求
     */
    @Override
    @Transactional
    public void update(Long id, VipPackageSaveReq req) {
        validateOneTimePurchase(req);
        VipPackage entity = requirePackageForUpdate(id);
        VipPackage changed = toEntity(req);
        boolean production = virtualProductCatalog.isProductionMode();
        String activeProductId = entity.getWechatProductId();
        boolean enableAfterPublish = production && isEnabled(changed.getStatus())
                && !isEnabled(entity.getStatus()) && StrUtil.isBlank(entity.getWechatProductId());
        if (production && isEnabled(changed.getStatus()) && !enableAfterPublish) {
            virtualProductCatalog.assertPayable(
                    StrUtil.blankToDefault(activeProductId, "vip_" + id), entity.getPrice());
        }
        boolean priceChanged = entity.getPrice() == null || changed.getPrice() == null
                || entity.getPrice().compareTo(changed.getPrice()) != 0;
        if (production && (priceChanged || enableAfterPublish)) {
            priceChangeService.requestChange("vip", id, activeProductId,
                    changed.getPrice(), enableAfterPublish);
        } else if (production) {
            VirtualPriceChange pending = priceChangeService.latest("vip", id);
            if (pending != null && isPending(pending.getStatus())
                    && pending.getTargetPrice() != null
                    && pending.getTargetPrice().compareTo(entity.getPrice()) != 0) {
                priceChangeService.cancelChange("vip", id);
            }
        }
        entity.setPackageName(changed.getPackageName());
        entity.setPackageType(changed.getPackageType());
        entity.setSubscriptionType(changed.getSubscriptionType());
        if (!production || !priceChanged) {
            entity.setPrice(changed.getPrice());
        }
        entity.setOriginPrice(changed.getOriginPrice());
        entity.setDurationDays(changed.getDurationDays());
        entity.setRecommendFlag(changed.getRecommendFlag());
        entity.setPackageTag(changed.getPackageTag());
        // 线上有效商品 ID 只能由微信商品发布任务切换，普通编辑请求不得覆盖。
        entity.setAgreementConfig(changed.getAgreementConfig());
        entity.setPayChannelReserve(changed.getPayChannelReserve());
        entity.setSortOrder(changed.getSortOrder());
        if (!enableAfterPublish) {
            entity.setStatus(StrUtil.blankToDefault(changed.getStatus(), CommonStatusEnum.ENABLED.getCode()));
        }
        vipPackageDao.updateById(entity);
        log.info("更新VIP套餐: id={}, packageName={}", id, entity.getPackageName());
    }

    /**
     * 更新套餐状态（启用/停用）
     * @param id 套餐ID
     * @param status 目标状态
     */
    @Override
    @Transactional
    public void updateStatus(Long id, String status) {
        VipPackage entity = requirePackageForUpdate(id);
        if (virtualProductCatalog.isProductionMode()
                && CommonStatusEnum.DISABLED.getCode().equals(status)) {
            priceChangeService.cancelChange("vip", id);
        }
        if (virtualProductCatalog.isProductionMode()
                && CommonStatusEnum.ENABLED.getCode().equals(status)
                && !CommonStatusEnum.ENABLED.getCode().equals(entity.getStatus())) {
            if (StrUtil.isBlank(entity.getWechatProductId())) {
                priceChangeService.requestChange("vip", id, entity.getWechatProductId(), entity.getPrice(), true);
                return;
            }
            virtualProductCatalog.assertPayable(
                    StrUtil.blankToDefault(entity.getWechatProductId(), "vip_" + id), entity.getPrice());
        }
        entity.setStatus(status);
        vipPackageDao.updateById(entity);
        log.info("变更VIP套餐状态: id={}, status={}", id, status);
    }

    private VipPackage toEntity(VipPackageSaveReq req) {
        VipPackage entity = new VipPackage();
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
        entity.setStatus(req.getStatus());
        return entity;
    }

    private void validateOneTimePurchase(VipPackageSaveReq req) {
        if (!"normal".equals(req.getPackageType()) || !"once".equals(req.getSubscriptionType())) {
            throw new BusinessException("会员套餐仅支持普通套餐和一次性购买");
        }
    }

    private boolean isEnabled(String status) {
        return StrUtil.isBlank(status) || CommonStatusEnum.ENABLED.getCode().equals(status);
    }

    private boolean isPending(String status) {
        return "QUEUED".equals(status) || "UPLOADING".equals(status)
                || "PUBLISHING".equals(status) || "WAIT_EFFECTIVE".equals(status);
    }

    private VipPackageVO toVO(VipPackage entity) {
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
        VirtualPriceChange change = priceChangeService.latest("vip", entity.getId());
        if (change != null) {
            vo.setPriceChangeStatus(change.getStatus());
            vo.setPriceChangeError(change.getLastError());
            if (!"ACTIVE".equals(change.getStatus())) {
                vo.setPendingPrice(change.getTargetPrice());
                vo.setPendingProductId(change.getNewProductId());
            }
        }
        vo.setAgreementConfig(entity.getAgreementConfig());
        vo.setPayChannelReserve(entity.getPayChannelReserve());
        vo.setSortOrder(entity.getSortOrder());
        vo.setStatus(entity.getStatus());
        vo.setCreateTime(entity.getCreateTime());
        vo.setUpdateTime(entity.getUpdateTime());
        return vo;
    }
}
