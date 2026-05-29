package com.spacetime.admin.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.VipPackageSaveReq;
import com.spacetime.admin.dto.response.VipPackageVO;
import com.spacetime.admin.service.VipPackageAdminService;
import com.spacetime.common.dao.VipPackageDao;
import com.spacetime.common.entity.VipPackage;
import com.spacetime.common.enums.CommonStatusEnum;
import com.spacetime.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * VIP 套餐后台服务实现
 */
@Service
@RequiredArgsConstructor
public class VipPackageAdminServiceImpl implements VipPackageAdminService {
    private final VipPackageDao vipPackageDao;

    @Override
    public List<VipPackageVO> list() {
        LambdaQueryWrapper<VipPackage> wrapper = new LambdaQueryWrapper<VipPackage>()
                .orderByAsc(VipPackage::getSortOrder);
        Page<VipPackage> page = vipPackageDao.selectPage(new Page<>(1, 1000), wrapper);
        return page.getRecords().stream().map(this::toVO).toList();
    }

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

    @Override
    @Transactional
    public Long create(VipPackageSaveReq req) {
        VipPackage entity = toEntity(req);
        if (StrUtil.isBlank(entity.getStatus())) {
            entity.setStatus(CommonStatusEnum.ENABLED.getCode());
        }
        vipPackageDao.insert(entity);
        return entity.getId();
    }

    @Override
    @Transactional
    public void update(Long id, VipPackageSaveReq req) {
        VipPackage entity = requirePackage(id);
        VipPackage changed = toEntity(req);
        entity.setPackageName(changed.getPackageName());
        entity.setPackageType(changed.getPackageType());
        entity.setPrice(changed.getPrice());
        entity.setOriginPrice(changed.getOriginPrice());
        entity.setDurationDays(changed.getDurationDays());
        entity.setRecommendFlag(changed.getRecommendFlag());
        entity.setPackageTag(changed.getPackageTag());
        entity.setSortOrder(changed.getSortOrder());
        entity.setStatus(changed.getStatus());
        vipPackageDao.updateById(entity);
    }

    @Override
    @Transactional
    public void updateStatus(Long id, String status) {
        VipPackage entity = requirePackage(id);
        entity.setStatus(status);
        vipPackageDao.updateById(entity);
    }

    private VipPackage toEntity(VipPackageSaveReq req) {
        VipPackage entity = new VipPackage();
        entity.setPackageName(req.getPackageName());
        entity.setPackageType(req.getPackageType());
        entity.setPrice(req.getPrice());
        entity.setOriginPrice(req.getOriginPrice());
        entity.setDurationDays(req.getDurationDays());
        entity.setRecommendFlag(req.getRecommendFlag());
        entity.setPackageTag(req.getPackageTag());
        entity.setSortOrder(req.getSortOrder());
        entity.setStatus(req.getStatus());
        return entity;
    }

    private VipPackageVO toVO(VipPackage entity) {
        VipPackageVO vo = new VipPackageVO();
        vo.setId(entity.getId());
        vo.setPackageName(entity.getPackageName());
        vo.setPackageType(entity.getPackageType());
        vo.setPrice(entity.getPrice());
        vo.setOriginPrice(entity.getOriginPrice());
        vo.setDurationDays(entity.getDurationDays());
        vo.setRecommendFlag(entity.getRecommendFlag());
        vo.setPackageTag(entity.getPackageTag());
        vo.setSortOrder(entity.getSortOrder());
        vo.setStatus(entity.getStatus());
        vo.setCreateTime(entity.getCreateTime());
        vo.setUpdateTime(entity.getUpdateTime());
        return vo;
    }
}
