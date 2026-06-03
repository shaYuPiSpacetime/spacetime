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
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * VIP 权益后台服务实现
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class VipBenefitAdminServiceImpl implements VipBenefitAdminService {
    /** VIP 权益数据访问对象 */
    private final VipBenefitDao vipBenefitDao;

    /**
     * 查询全部权益列表，按排序字段升序
     * @return 权益列表
     */
    @Override
    public List<VipBenefitVO> list() {
        LambdaQueryWrapper<VipBenefit> wrapper = new LambdaQueryWrapper<VipBenefit>()
                .orderByAsc(VipBenefit::getDisplayOrder);
        Page<VipBenefit> page = vipBenefitDao.selectPage(new Page<>(1, 1000), wrapper);
        return page.getRecords().stream().map(this::toVO).toList();
    }

    /**
     * 查询权益详情
     * @param id 权益ID
     * @return 权益详情
     */
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

    /**
     * 创建权益，默认启用
     * @param req 权益保存请求
     * @return 新权益ID
     */
    @Override
    @Transactional
    public Long create(VipBenefitSaveReq req) {
        VipBenefit entity = toEntity(req);
        if (StrUtil.isBlank(entity.getStatus())) {
            entity.setStatus(CommonStatusEnum.ENABLED.getCode());
        }
        vipBenefitDao.insert(entity);
        log.info("创建VIP权益: id={}, benefitCode={}, benefitName={}", entity.getId(), entity.getBenefitCode(), entity.getBenefitName());
        return entity.getId();
    }

    /**
     * 更新权益信息
     * @param id 权益ID
     * @param req 权益保存请求
     */
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
        log.info("更新VIP权益: id={}, benefitCode={}", id, entity.getBenefitCode());
    }

    /**
     * 更新权益状态（启用/停用）
     * @param id 权益ID
     * @param status 目标状态
     */
    @Override
    @Transactional
    public void updateStatus(Long id, String status) {
        VipBenefit entity = requireBenefit(id);
        entity.setStatus(status);
        vipBenefitDao.updateById(entity);
        log.info("变更VIP权益状态: id={}, status={}", id, status);
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
