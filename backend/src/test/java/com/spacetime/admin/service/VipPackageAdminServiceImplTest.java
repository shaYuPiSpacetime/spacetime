package com.spacetime.admin.service;

import com.spacetime.admin.dto.request.VipPackageSaveReq;
import com.spacetime.admin.service.impl.VipPackageAdminServiceImpl;
import com.spacetime.common.dao.VipPackageDao;
import com.spacetime.common.exception.BusinessException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class VipPackageAdminServiceImplTest {

    @Mock
    private VipPackageDao vipPackageDao;

    private VipPackageAdminServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new VipPackageAdminServiceImpl(vipPackageDao);
    }

    @Test
    @DisplayName("独立套餐接口拒绝非一次性购买")
    void create_shouldRejectRecurringPurchaseMode() {
        VipPackageSaveReq req = validRequest();
        req.setSubscriptionType("year");

        assertThatThrownBy(() -> service.create(req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("普通套餐和一次性购买");
        verify(vipPackageDao, never()).insert(any());
    }

    private VipPackageSaveReq validRequest() {
        VipPackageSaveReq req = new VipPackageSaveReq();
        req.setPackageName("普通年卡");
        req.setPackageType("normal");
        req.setSubscriptionType("once");
        req.setPrice(new BigDecimal("568.00"));
        req.setDurationDays(365);
        req.setStatus("ENABLED");
        return req;
    }
}
