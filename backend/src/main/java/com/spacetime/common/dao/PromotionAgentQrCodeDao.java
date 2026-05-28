package com.spacetime.common.dao;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.PromotionAgentQrCode;

/**
 * 校园代理二维码数据访问接口
 */
public interface PromotionAgentQrCodeDao {
    PromotionAgentQrCode selectById(Long id);
    PromotionAgentQrCode selectByQrCode(String qrCode);
    Page<PromotionAgentQrCode> selectPage(Page<PromotionAgentQrCode> page, com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<PromotionAgentQrCode> wrapper);
    void insert(PromotionAgentQrCode entity);
    void updateById(PromotionAgentQrCode entity);
}
