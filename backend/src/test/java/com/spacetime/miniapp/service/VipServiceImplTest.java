package com.spacetime.miniapp.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.TradeOrderDao;
import com.spacetime.common.dao.UserAssetDao;
import com.spacetime.common.dao.VipBenefitDao;
import com.spacetime.common.dao.VipPackageDao;
import com.spacetime.common.dto.PageReq;
import com.spacetime.common.entity.TradeOrder;
import com.spacetime.common.entity.UserAsset;
import com.spacetime.common.entity.VipPackage;
import com.spacetime.miniapp.dto.response.VipOrderVO;
import com.spacetime.miniapp.dto.response.VipStatusVO;
import com.spacetime.miniapp.service.impl.VipServiceImpl;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("小程序会员真实数据服务测试")
class VipServiceImplTest {

    @Mock private VipPackageDao vipPackageDao;
    @Mock private VipBenefitDao vipBenefitDao;
    @Mock private UserAssetDao userAssetDao;
    @Mock private TradeOrderDao tradeOrderDao;
    @InjectMocks private VipServiceImpl vipService;

    @Test
    @DisplayName("会员状态返回当前生效订单的真实套餐和时间")
    void getStatus_shouldExposeCurrentPaidOrderSnapshot() {
        UserAsset asset = new UserAsset();
        asset.setUserId(50L);
        asset.setVipStatus("active");
        asset.setVipExpireTime(LocalDateTime.of(2026, 10, 7, 15, 34, 47));

        TradeOrder order = paidVipOrder();
        VipPackage vipPackage = quarterPackage();
        Page<TradeOrder> orderPage = new Page<>(1, 1);
        orderPage.setRecords(List.of(order));
        orderPage.setTotal(1);

        when(userAssetDao.selectByUserId(50L)).thenReturn(asset);
        when(tradeOrderDao.selectPage(any(Page.class), any())).thenReturn(orderPage);
        when(vipPackageDao.selectById(4L)).thenReturn(vipPackage);

        VipStatusVO result = vipService.getStatus(50L);

        assertThat(result.getVipStatus()).isEqualTo("active");
        assertThat(result.getVipExpireTime()).isEqualTo(LocalDateTime.of(2026, 10, 7, 15, 34, 47));
        assertThat(result.getPackageId()).isEqualTo(4L);
        assertThat(result.getPackageName()).isEqualTo("季卡VIP");
        assertThat(result.getSubscriptionType()).isEqualTo("once");
        assertThat(result.getMemberStartTime()).isEqualTo(LocalDateTime.of(2026, 7, 9, 15, 34, 47));
        assertThat(result.getOrderNo()).isEqualTo("TO2075121400468070400");
    }

    @Test
    @DisplayName("会员记录返回真实订单字段")
    void getOrders_shouldExposeRealOrderFields() {
        TradeOrder order = paidVipOrder();
        VipPackage vipPackage = quarterPackage();
        Page<TradeOrder> orderPage = new Page<>(1, 10);
        orderPage.setRecords(List.of(order));
        orderPage.setTotal(1);
        PageReq req = new PageReq();
        req.setPage(1);
        req.setSize(10);

        when(tradeOrderDao.selectPage(any(Page.class), any())).thenReturn(orderPage);
        when(vipPackageDao.selectById(4L)).thenReturn(vipPackage);

        Page<VipOrderVO> result = vipService.getOrders(50L, req);

        assertThat(result.getRecords()).hasSize(1);
        VipOrderVO record = result.getRecords().get(0);
        assertThat(record.getPackageId()).isEqualTo(4L);
        assertThat(record.getPackageName()).isEqualTo("季卡VIP");
        assertThat(record.getSubscriptionType()).isEqualTo("once");
        assertThat(record.getDurationDays()).isEqualTo(90);
        assertThat(record.getCreateTime()).isEqualTo(LocalDateTime.of(2026, 7, 9, 15, 34, 30));
        assertThat(record.getSuccessTime()).isEqualTo(LocalDateTime.of(2026, 7, 9, 15, 34, 47));
        assertThat(record.getPayChannel()).isEqualTo("wechat");
    }

    private TradeOrder paidVipOrder() {
        TradeOrder order = new TradeOrder();
        order.setId(24L);
        order.setOrderNo("TO2075121400468070400");
        order.setUserId(50L);
        order.setOrderType("vip");
        order.setPackageId(4L);
        order.setPackageName("季卡VIP");
        order.setPayAmount(new BigDecimal("0.01"));
        order.setPayChannel("wechat");
        order.setOrderStatus("success");
        order.setSuccessTime(LocalDateTime.of(2026, 7, 9, 15, 34, 47));
        order.setExpireTime(LocalDateTime.of(2026, 10, 7, 15, 34, 47));
        order.setCreateTime(LocalDateTime.of(2026, 7, 9, 15, 34, 30));
        return order;
    }

    private VipPackage quarterPackage() {
        VipPackage vipPackage = new VipPackage();
        vipPackage.setId(4L);
        vipPackage.setPackageName("季卡VIP");
        vipPackage.setSubscriptionType("once");
        vipPackage.setDurationDays(90);
        return vipPackage;
    }
}
