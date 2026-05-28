package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.PromotionAgentQrCodeDao;
import com.spacetime.common.entity.PromotionAgentQrCode;
import com.spacetime.common.mapper.PromotionAgentQrCodeMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

/**
 * 校园代理二维码数据访问实现
 */
@Repository
@RequiredArgsConstructor
public class PromotionAgentQrCodeDaoImpl implements PromotionAgentQrCodeDao {
    private final PromotionAgentQrCodeMapper mapper;

    @Override
    public PromotionAgentQrCode selectById(Long id) {
        return mapper.selectById(id);
    }

    @Override
    public PromotionAgentQrCode selectByQrCode(String qrCode) {
        return mapper.selectOne(new LambdaQueryWrapper<PromotionAgentQrCode>().eq(PromotionAgentQrCode::getQrCode, qrCode));
    }

    @Override
    public Page<PromotionAgentQrCode> selectPage(Page<PromotionAgentQrCode> page, LambdaQueryWrapper<PromotionAgentQrCode> wrapper) {
        return mapper.selectPage(page, wrapper);
    }

    @Override
    public void insert(PromotionAgentQrCode entity) {
        mapper.insert(entity);
    }

    @Override
    public void updateById(PromotionAgentQrCode entity) {
        mapper.updateById(entity);
    }
}
