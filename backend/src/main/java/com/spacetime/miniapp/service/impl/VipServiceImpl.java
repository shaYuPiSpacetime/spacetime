package com.spacetime.miniapp.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.TradeOrderDao;
import com.spacetime.common.dao.UserAssetDao;
import com.spacetime.common.dao.VipBenefitDao;
import com.spacetime.common.dao.VipPackageDao;
import com.spacetime.common.dto.PageReq;
import com.spacetime.common.entity.TradeOrder;
import com.spacetime.common.entity.UserAsset;
import com.spacetime.common.entity.VipBenefit;
import com.spacetime.common.entity.VipPackage;
import com.spacetime.common.enums.CommonStatusEnum;
import com.spacetime.common.enums.OrderTypeEnum;
import com.spacetime.miniapp.dto.response.VipBenefitVO;
import com.spacetime.miniapp.dto.response.VipOrderVO;
import com.spacetime.miniapp.dto.response.VipPackageVO;
import com.spacetime.miniapp.dto.response.VipStatusVO;
import com.spacetime.miniapp.service.VipService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 小程序 VIP 服务实现
 */
@Service
@RequiredArgsConstructor
public class VipServiceImpl implements VipService {
    private final VipPackageDao vipPackageDao;
    private final VipBenefitDao vipBenefitDao;
    private final UserAssetDao userAssetDao;
    private final TradeOrderDao tradeOrderDao;

    @Override
    public List<VipPackageVO> getPackages() {
        // 1. 查询已启用的套餐，按排序字段升序
        LambdaQueryWrapper<VipPackage> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(VipPackage::getStatus, CommonStatusEnum.ENABLED.getCode())
                .orderByAsc(VipPackage::getSortOrder);
        Page<VipPackage> page = vipPackageDao.selectPage(new Page<>(1, 100), wrapper);
        // 2. 转换为 VO
        return page.getRecords().stream().map(pkg -> {
            VipPackageVO vo = new VipPackageVO();
            vo.setId(pkg.getId());
            vo.setPackageName(pkg.getPackageName());
            vo.setPackageType(pkg.getPackageType());
            vo.setPrice(pkg.getPrice());
            vo.setOriginPrice(pkg.getOriginPrice());
            vo.setDurationDays(pkg.getDurationDays());
            vo.setRecommendFlag(pkg.getRecommendFlag());
            vo.setPackageTag(pkg.getPackageTag());
            return vo;
        }).collect(Collectors.toList());
    }

    @Override
    public List<VipBenefitVO> getBenefits() {
        // 1. 查询已启用的权益，按展示顺序排序
        LambdaQueryWrapper<VipBenefit> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(VipBenefit::getStatus, CommonStatusEnum.ENABLED.getCode())
                .orderByAsc(VipBenefit::getDisplayOrder);
        Page<VipBenefit> page = vipBenefitDao.selectPage(new Page<>(1, 100), wrapper);
        // 2. 转换为 VO
        return page.getRecords().stream().map(benefit -> {
            VipBenefitVO vo = new VipBenefitVO();
            vo.setId(benefit.getId());
            vo.setBenefitCode(benefit.getBenefitCode());
            vo.setBenefitName(benefit.getBenefitName());
            vo.setBenefitType(benefit.getBenefitType());
            vo.setBenefitDesc(benefit.getBenefitDesc());
            vo.setDisplayOrder(benefit.getDisplayOrder());
            return vo;
        }).collect(Collectors.toList());
    }

    @Override
    public VipStatusVO getStatus(Long userId) {
        // 1. 查询用户资产
        UserAsset asset = userAssetDao.selectByUserId(userId);
        // 2. 构造返回对象
        VipStatusVO vo = new VipStatusVO();
        if (asset != null) {
            vo.setVipStatus(asset.getVipStatus());
            vo.setVipExpireTime(asset.getVipExpireTime());
        }
        return vo;
    }

    @Override
    public Page<VipOrderVO> getOrders(Long userId, PageReq req) {
        // 1. 查询 VIP 类型订单
        LambdaQueryWrapper<TradeOrder> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(TradeOrder::getUserId, userId)
                .eq(TradeOrder::getOrderType, OrderTypeEnum.VIP.getCode())
                .orderByDesc(TradeOrder::getCreateTime);
        Page<TradeOrder> orderPage = tradeOrderDao.selectPage(
                new Page<>(req.getPage(), req.getSize()), wrapper);
        // 2. 转换为 VO 分页
        Page<VipOrderVO> resultPage = new Page<>(orderPage.getCurrent(), orderPage.getSize(), orderPage.getTotal());
        resultPage.setRecords(orderPage.getRecords().stream().map(order -> {
            VipOrderVO vo = new VipOrderVO();
            vo.setId(order.getId());
            vo.setOrderNo(order.getOrderNo());
            vo.setPackageName(order.getPackageName());
            vo.setPayAmount(order.getPayAmount());
            vo.setOrderStatus(order.getOrderStatus());
            vo.setSuccessTime(order.getSuccessTime());
            vo.setExpireTime(order.getExpireTime());
            return vo;
        }).collect(Collectors.toList()));
        return resultPage;
    }
}
