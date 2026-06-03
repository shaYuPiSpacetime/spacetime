package com.spacetime.miniapp.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.CoinPackageDao;
import com.spacetime.common.dao.UserAssetDao;
import com.spacetime.common.dao.UserCoinLogDao;
import com.spacetime.common.dto.PageReq;
import com.spacetime.common.entity.CoinPackage;
import com.spacetime.common.entity.UserAsset;
import com.spacetime.common.entity.UserCoinLog;
import com.spacetime.common.enums.CommonStatusEnum;
import com.spacetime.miniapp.dto.response.CoinBalanceVO;
import com.spacetime.miniapp.dto.response.CoinFlowVO;
import com.spacetime.miniapp.dto.response.CoinPackageVO;
import com.spacetime.miniapp.service.CoinService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 小程序成家币服务实现
 */
@Service
@RequiredArgsConstructor
public class CoinServiceImpl implements CoinService {
    private final CoinPackageDao coinPackageDao;
    private final UserAssetDao userAssetDao;
    private final UserCoinLogDao userCoinLogDao;

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
            vo.setCoinCount(pkg.getCoinCount());
            vo.setBonusCoinCount(pkg.getBonusCoinCount());
            vo.setRecommendFlag(pkg.getRecommendFlag());
            vo.setPackageTag(pkg.getPackageTag());
            vo.setPackageDesc(pkg.getPackageDesc());
            return vo;
        }).collect(Collectors.toList());
    }

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

    @Override
    public Page<CoinFlowVO> getFlows(Long userId, PageReq req) {
        // 1. 分页查询用户流水
        Page<UserCoinLog> logPage = userCoinLogDao.selectPageByUserId(
                new Page<>(req.getPage(), req.getSize()), userId);
        // 2. 转换为 VO 分页
        Page<CoinFlowVO> resultPage = new Page<>(logPage.getCurrent(), logPage.getSize(), logPage.getTotal());
        resultPage.setRecords(logPage.getRecords().stream().map(log -> {
            CoinFlowVO vo = new CoinFlowVO();
            vo.setId(log.getId());
            vo.setFlowNo(log.getFlowNo());
            vo.setFlowType(log.getFlowType());
            vo.setChangeAmount(log.getChangeAmount());
            vo.setBalanceAfter(log.getBalanceAfter());
            vo.setBizScene(log.getBizScene());
            vo.setBizDesc(log.getBizDesc());
            vo.setCreateTime(log.getCreateTime());
            return vo;
        }).collect(Collectors.toList()));
        return resultPage;
    }
}
