package com.spacetime.admin.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.CoinPackageSaveReq;
import com.spacetime.admin.dto.response.CoinPackageVO;
import com.spacetime.admin.service.CoinPackageAdminService;
import com.spacetime.common.dao.CoinPackageDao;
import com.spacetime.common.entity.CoinPackage;
import com.spacetime.common.entity.VirtualPriceChange;
import com.spacetime.common.enums.CommonStatusEnum;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.service.WechatVirtualProductCatalog;
import com.spacetime.common.service.VirtualPriceChangeService;
import com.spacetime.common.util.CoinPackagePriceResolver;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

/**
 * 成家币套餐后台服务实现
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class CoinPackageAdminServiceImpl implements CoinPackageAdminService {
    /** 成家币套餐数据访问对象 */
    private final CoinPackageDao coinPackageDao;
    private final WechatVirtualProductCatalog virtualProductCatalog;
    private final VirtualPriceChangeService priceChangeService;

    /**
     * 查询全部套餐列表，按排序字段升序
     * @return 套餐列表
     */
    @Override
    public List<CoinPackageVO> list() {
        LambdaQueryWrapper<CoinPackage> wrapper = new LambdaQueryWrapper<CoinPackage>()
                .orderByAsc(CoinPackage::getSortOrder);
        Page<CoinPackage> page = coinPackageDao.selectPage(new Page<>(1, 1000), wrapper);
        return page.getRecords().stream().map(this::toVO).toList();
    }

    /**
     * 查询套餐详情
     * @param id 套餐ID
     * @return 套餐详情
     */
    @Override
    public CoinPackageVO detail(Long id) {
        return toVO(requirePackage(id));
    }

    private CoinPackage requirePackage(Long id) {
        CoinPackage entity = coinPackageDao.selectById(id);
        if (entity == null) {
            throw new BusinessException("成家币套餐不存在");
        }
        return entity;
    }

    private CoinPackage requirePackageForUpdate(Long id) {
        CoinPackage entity = coinPackageDao.selectForUpdate(id);
        if (entity == null) {
            throw new BusinessException("成家币套餐不存在");
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
    public Long create(CoinPackageSaveReq req) {
        CoinPackage entity = toEntity(req);
        if (StrUtil.isBlank(entity.getStatus())) {
            entity.setStatus(CommonStatusEnum.ENABLED.getCode());
        }
        if (virtualProductCatalog.isProductionMode()
                && CommonStatusEnum.ENABLED.getCode().equals(entity.getStatus())) {
            throw new BusinessException("线上虚拟支付新增千寻币套餐请先创建停用状态，取得商品 ID 后配置线上商品再启用");
        }
        coinPackageDao.insert(entity);
        log.info("创建成家币套餐: id={}, packageName={}, coinCount={}", entity.getId(), entity.getPackageName(), entity.getCoinCount());
        return entity.getId();
    }

    /**
     * 更新套餐信息
     * @param id 套餐ID
     * @param req 套餐保存请求
     */
    @Override
    @Transactional
    public void update(Long id, CoinPackageSaveReq req) {
        CoinPackage entity = requirePackageForUpdate(id);
        CoinPackage changed = toEntity(req);
        boolean production = virtualProductCatalog.isProductionMode();
        String activeProductId = entity.getWechatProductId();
        BigDecimal oldPrice = CoinPackagePriceResolver.resolve(entity);
        BigDecimal newPrice = CoinPackagePriceResolver.resolve(changed);
        boolean enableAfterPublish = production && isEnabled(changed.getStatus())
                && !isEnabled(entity.getStatus()) && StrUtil.isBlank(entity.getWechatProductId());
        if (production && isEnabled(changed.getStatus()) && !enableAfterPublish) {
            virtualProductCatalog.assertPayable(
                    StrUtil.blankToDefault(activeProductId, "coin_" + id), oldPrice);
        }
        boolean priceChanged = oldPrice == null || newPrice == null || oldPrice.compareTo(newPrice) != 0;
        if (production && (priceChanged || enableAfterPublish)) {
            priceChangeService.requestChange("coin", id, activeProductId,
                    newPrice, enableAfterPublish);
        } else if (production) {
            VirtualPriceChange pending = priceChangeService.latest("coin", id);
            if (pending != null && isPending(pending.getStatus())
                    && pending.getTargetPrice() != null
                    && pending.getTargetPrice().compareTo(oldPrice) != 0) {
                priceChangeService.cancelChange("coin", id);
            }
        }
        entity.setPackageName(changed.getPackageName());
        if (!production || !priceChanged) {
            entity.setAmount(changed.getAmount());
            entity.setDiscountAmount(changed.getDiscountAmount());
        }
        entity.setOriginAmount(changed.getOriginAmount());
        entity.setCoinCount(changed.getCoinCount());
        entity.setBonusCoinCount(changed.getBonusCoinCount());
        entity.setRecommendFlag(changed.getRecommendFlag());
        entity.setPackageTag(changed.getPackageTag());
        entity.setMobileTag(changed.getMobileTag());
        entity.setPackageDesc(changed.getPackageDesc());
        entity.setSortOrder(changed.getSortOrder());
        if (!enableAfterPublish) {
            entity.setStatus(StrUtil.blankToDefault(changed.getStatus(), CommonStatusEnum.ENABLED.getCode()));
        }
        coinPackageDao.updateById(entity);
        log.info("更新成家币套餐: id={}, packageName={}", id, entity.getPackageName());
    }

    /**
     * 更新套餐状态（启用/停用）
     * @param id 套餐ID
     * @param status 目标状态
     */
    @Override
    @Transactional
    public void updateStatus(Long id, String status) {
        CoinPackage entity = requirePackageForUpdate(id);
        if (virtualProductCatalog.isProductionMode()
                && CommonStatusEnum.DISABLED.getCode().equals(status)) {
            priceChangeService.cancelChange("coin", id);
        }
        if (virtualProductCatalog.isProductionMode()
                && CommonStatusEnum.ENABLED.getCode().equals(status)
                && !CommonStatusEnum.ENABLED.getCode().equals(entity.getStatus())) {
            if (StrUtil.isBlank(entity.getWechatProductId())) {
                priceChangeService.requestChange("coin", id, entity.getWechatProductId(),
                        CoinPackagePriceResolver.resolve(entity), true);
                return;
            }
            virtualProductCatalog.assertPayable(
                    StrUtil.blankToDefault(entity.getWechatProductId(), "coin_" + id),
                    CoinPackagePriceResolver.resolve(entity));
        }
        entity.setStatus(status);
        coinPackageDao.updateById(entity);
        log.info("变更成家币套餐状态: id={}, status={}", id, status);
    }

    private CoinPackage toEntity(CoinPackageSaveReq req) {
        CoinPackage entity = new CoinPackage();
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
        entity.setStatus(req.getStatus());
        return entity;
    }

    private boolean isEnabled(String status) {
        return StrUtil.isBlank(status) || CommonStatusEnum.ENABLED.getCode().equals(status);
    }

    private boolean isPending(String status) {
        return "QUEUED".equals(status) || "UPLOADING".equals(status)
                || "PUBLISHING".equals(status) || "WAIT_EFFECTIVE".equals(status);
    }

    private CoinPackageVO toVO(CoinPackage entity) {
        CoinPackageVO vo = new CoinPackageVO();
        vo.setId(entity.getId());
        vo.setPackageName(entity.getPackageName());
        vo.setAmount(entity.getAmount());
        vo.setOriginAmount(entity.getOriginAmount());
        vo.setDiscountAmount(entity.getDiscountAmount());
        vo.setWechatProductId(entity.getWechatProductId());
        VirtualPriceChange change = priceChangeService.latest("coin", entity.getId());
        if (change != null) {
            vo.setPriceChangeStatus(change.getStatus());
            vo.setPriceChangeError(change.getLastError());
            if (!"ACTIVE".equals(change.getStatus())) {
                vo.setPendingPrice(change.getTargetPrice());
                vo.setPendingProductId(change.getNewProductId());
            }
        }
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
}
