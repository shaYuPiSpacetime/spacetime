package com.spacetime.admin.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.CoinPackageSaveReq;
import com.spacetime.admin.dto.response.CoinPackageVO;
import com.spacetime.admin.service.CoinPackageAdminService;
import com.spacetime.common.dao.CoinPackageDao;
import com.spacetime.common.entity.CoinPackage;
import com.spacetime.common.enums.CommonStatusEnum;
import com.spacetime.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
        CoinPackage entity = requirePackage(id);
        CoinPackage changed = toEntity(req);
        entity.setPackageName(changed.getPackageName());
        entity.setAmount(changed.getAmount());
        entity.setCoinCount(changed.getCoinCount());
        entity.setBonusCoinCount(changed.getBonusCoinCount());
        entity.setRecommendFlag(changed.getRecommendFlag());
        entity.setPackageTag(changed.getPackageTag());
        entity.setPackageDesc(changed.getPackageDesc());
        entity.setSortOrder(changed.getSortOrder());
        entity.setStatus(changed.getStatus());
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
        CoinPackage entity = requirePackage(id);
        entity.setStatus(status);
        coinPackageDao.updateById(entity);
        log.info("变更成家币套餐状态: id={}, status={}", id, status);
    }

    private CoinPackage toEntity(CoinPackageSaveReq req) {
        CoinPackage entity = new CoinPackage();
        entity.setPackageName(req.getPackageName());
        entity.setAmount(req.getAmount());
        entity.setCoinCount(req.getCoinCount());
        entity.setBonusCoinCount(req.getBonusCoinCount());
        entity.setRecommendFlag(req.getRecommendFlag());
        entity.setPackageTag(req.getPackageTag());
        entity.setPackageDesc(req.getPackageDesc());
        entity.setSortOrder(req.getSortOrder());
        entity.setStatus(req.getStatus());
        return entity;
    }

    private CoinPackageVO toVO(CoinPackage entity) {
        CoinPackageVO vo = new CoinPackageVO();
        vo.setId(entity.getId());
        vo.setPackageName(entity.getPackageName());
        vo.setAmount(entity.getAmount());
        vo.setCoinCount(entity.getCoinCount());
        vo.setBonusCoinCount(entity.getBonusCoinCount());
        vo.setRecommendFlag(entity.getRecommendFlag());
        vo.setPackageTag(entity.getPackageTag());
        vo.setPackageDesc(entity.getPackageDesc());
        vo.setSortOrder(entity.getSortOrder());
        vo.setStatus(entity.getStatus());
        vo.setCreateTime(entity.getCreateTime());
        vo.setUpdateTime(entity.getUpdateTime());
        return vo;
    }
}
