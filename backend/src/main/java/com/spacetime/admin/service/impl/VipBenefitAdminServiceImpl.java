package com.spacetime.admin.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.VipBenefitSaveReq;
import com.spacetime.admin.dto.response.VipBenefitVO;
import com.spacetime.admin.service.VipBenefitAdminService;
import com.spacetime.common.dao.VipBenefitDao;
import com.spacetime.common.entity.VipBenefit;
import com.spacetime.common.enums.CommonStatusEnum;
import com.spacetime.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * VIP 权益后台服务实现
 */
@Service
@RequiredArgsConstructor
public class VipBenefitAdminServiceImpl implements VipBenefitAdminService {
    private final VipBenefitDao vipBenefitDao;

    @Override
    public List<VipBenefitVO> list() {
        LambdaQueryWrapper<VipBenefit> wrapper = new LambdaQueryWrapper<VipBenefit>()
                .orderByAsc(VipBenefit::getDisplayOrder);
        Page<VipBenefit> page = vipBenefitDao.selectPage(new Page<>(1, 1000), wrapper);
        return page.getRecords().stream().map(this::toVO).toList();
    }

    @Override
    public VipBenefitVO detail(Long id) {
        return toVO(requireBenefit(id));
    }

    private VipBenefit requireBenefit(Long id) {
        VipBenefit entity = vipBenefitDao.selectById(id);
        if (entity == null) {
            throw new BusinessException("VIP 权益不存在");
        }
        return entity;
    }

    @Override
    @Transactional
    public Long create(VipBenefitSaveReq req) {
        VipBenefit entity = toEntity(req);
        if (StrUtil.isBlank(entity.getStatus())) {
            entity.setStatus(CommonStatusEnum.ENABLED.getCode());
        }
        vipBenefitDao.insert(entity);
        return entity.getId();
    }

    @Override
    @Transactional
    public void update(Long id, VipBenefitSaveReq req) {
        VipBenefit entity = requireBenefit(id);
        VipBenefit changed = toEntity(req);
        entity.setBenefitCode(changed.getBenefitCode());
        entity.setBenefitName(changed.getBenefitName());
        entity.setBenefitType(changed.getBenefitType());
        entity.setBenefitDesc(changed.getBenefitDesc());
        entity.setDisplayOrder(changed.getDisplayOrder());
        entity.setStatus(changed.getStatus());
        vipBenefitDao.updateById(entity);
    }

    @Override
    @Transactional
    public void updateStatus(Long id, String status) {
        VipBenefit entity = requireBenefit(id);
        entity.setStatus(status);
        vipBenefitDao.updateById(entity);
    }

    private VipBenefit toEntity(VipBenefitSaveReq req) {
        VipBenefit entity = new VipBenefit();
        entity.setBenefitCode(req.getBenefitCode());
        entity.setBenefitName(req.getBenefitName());
        entity.setBenefitType(req.getBenefitType());
        entity.setBenefitDesc(req.getBenefitDesc());
        entity.setDisplayOrder(req.getDisplayOrder());
        entity.setStatus(req.getStatus());
        return entity;
    }

    private VipBenefitVO toVO(VipBenefit entity) {
        VipBenefitVO vo = new VipBenefitVO();
        vo.setId(entity.getId());
        vo.setBenefitCode(entity.getBenefitCode());
        vo.setBenefitName(entity.getBenefitName());
        vo.setBenefitType(entity.getBenefitType());
        vo.setBenefitDesc(entity.getBenefitDesc());
        vo.setDisplayOrder(entity.getDisplayOrder());
        vo.setStatus(entity.getStatus());
        vo.setCreateTime(entity.getCreateTime());
        vo.setUpdateTime(entity.getUpdateTime());
        return vo;
    }
}
