package com.spacetime.miniapp.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.CoinPackageDao;
import com.spacetime.common.dao.CoinSceneConfigDao;
import com.spacetime.common.dao.UserAssetDao;
import com.spacetime.common.dao.UserCoinLogDao;
import com.spacetime.common.dto.PageReq;
import com.spacetime.common.entity.CoinPackage;
import com.spacetime.common.entity.CoinSceneConfig;
import com.spacetime.common.entity.UserAsset;
import com.spacetime.common.entity.UserCoinLog;
import com.spacetime.common.enums.CommonStatusEnum;
import com.spacetime.miniapp.dto.response.CoinBalanceVO;
import com.spacetime.miniapp.dto.response.CoinFlowVO;
import com.spacetime.miniapp.dto.response.CoinPackageVO;
import com.spacetime.miniapp.dto.response.CoinSceneVO;
import com.spacetime.miniapp.service.CoinService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 小程序千寻币服务实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CoinServiceImpl implements CoinService {

    /** 千寻币套餐数据访问 */
    private final CoinPackageDao coinPackageDao;
    /** 千寻币消费场景数据访问 */
    private final CoinSceneConfigDao coinSceneConfigDao;
    /** 用户资产数据访问 */
    private final UserAssetDao userAssetDao;
    /** 千寻币流水数据访问 */
    private final UserCoinLogDao userCoinLogDao;

    /**
     * 查询已启用千寻币套餐列表
     *
     * @return 已启用的千寻币套餐列表（按排序字段升序）
     */
    @Override
    public List<CoinPackageVO> getPackages() {
        // 1. 查询已启用的套餐，按排序字段升序
        LambdaQueryWrapper<CoinPackage> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(CoinPackage::getStatus, CommonStatusEnum.ENABLED.getCode())
                .orderByAsc(CoinPackage::getSortOrder);
        Page<CoinPackage> page = coinPackageDao.selectPage(new Page<>(1, 100), wrapper);
        // 2. 转换为 VO
        return page.getRecords().stream().map(pkg -> {
            CoinPackageVO vo = new CoinPackageVO();
            vo.setId(pkg.getId());
            vo.setPackageName(pkg.getPackageName());
            vo.setAmount(pkg.getAmount());
            vo.setOriginAmount(pkg.getOriginAmount());
            vo.setDiscountAmount(pkg.getDiscountAmount());
            vo.setCoinCount(pkg.getCoinCount());
            vo.setBonusCoinCount(pkg.getBonusCoinCount());
            vo.setRecommendFlag(pkg.getRecommendFlag());
            vo.setPackageTag(pkg.getPackageTag());
            vo.setMobileTag(pkg.getMobileTag());
            vo.setPackageDesc(pkg.getPackageDesc());
            return vo;
        }).collect(Collectors.toList());
    }

    @Override
    public List<CoinSceneVO> getScenes() {
        LambdaQueryWrapper<CoinSceneConfig> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(CoinSceneConfig::getStatus, CommonStatusEnum.ENABLED.getCode())
                .orderByAsc(CoinSceneConfig::getSortOrder);
        Page<CoinSceneConfig> page = coinSceneConfigDao.selectPage(new Page<>(1, 100), wrapper);
        return page.getRecords().stream().map(scene -> {
            CoinSceneVO vo = new CoinSceneVO();
            vo.setId(scene.getId());
            vo.setSceneCode(scene.getSceneCode());
            vo.setMobileDisplayName(scene.getMobileName());
            vo.setMobileIcon(scene.getMobileIcon());
            vo.setSceneDesc(scene.getSceneDesc());
            vo.setUnitPrice(scene.getUnitPrice());
            vo.setRetentionDays(scene.getRetentionDays());
            return vo;
        }).collect(Collectors.toList());
    }

    /**
     * 查询用户千寻币余额
     *
     * @param userId 用户ID
     * @return 千寻币余额信息
     */
    @Override
    public CoinBalanceVO getBalance(Long userId) {
        // 1. 查询用户资产
        UserAsset asset = userAssetDao.selectByUserId(userId);
        // 2. 构造返回对象
        CoinBalanceVO vo = new CoinBalanceVO();
        if (asset != null) {
            vo.setCoinBalance(asset.getCoinBalance());
        } else {
            vo.setCoinBalance(0);
        }
        return vo;
    }

    /**
     * 分页查询用户千寻币流水
     *
     * @param userId 用户ID
     * @param req    分页请求参数
     * @return 千寻币流水分页列表
     */
    @Override
    public Page<CoinFlowVO> getFlows(Long userId, PageReq req, String flowType) {
        log.info("查询千寻币流水: userId={}, page={}, size={}", userId, req.getPage(), req.getSize());
        // 1. 分页查询用户流水
        Page<UserCoinLog> logPage = userCoinLogDao.selectPageByUserId(
                new Page<>(req.getPage(), req.getSize()), userId, flowType);
        // 2. 转换为 VO 分页
        Page<CoinFlowVO> resultPage = new Page<>(logPage.getCurrent(), logPage.getSize(), logPage.getTotal());
        resultPage.setRecords(logPage.getRecords().stream().map(log -> {
            CoinFlowVO vo = new CoinFlowVO();
            vo.setId(log.getId());
            vo.setFlowNo(log.getFlowNo());
            vo.setFlowType(log.getFlowType());
            vo.setChangeAmount(log.getChangeAmount());
            vo.setBalanceBefore(log.getBalanceBefore());
            vo.setBalanceAfter(log.getBalanceAfter());
            vo.setBizScene(log.getBizScene());
            vo.setBizDesc(log.getBizDesc());
            vo.setCreateTime(log.getCreateTime());
            return vo;
        }).collect(Collectors.toList()));
        return resultPage;
    }
}
