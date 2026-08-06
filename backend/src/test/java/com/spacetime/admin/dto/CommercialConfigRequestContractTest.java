package com.spacetime.admin.dto;

import com.spacetime.admin.dto.request.CoinPackageSaveReq;
import com.spacetime.admin.dto.request.VipBenefitSaveReq;
import com.spacetime.admin.dto.request.VipPackageSaveReq;
import com.spacetime.admin.dto.request.CommercialConfigSaveReq;
import com.spacetime.admin.dto.request.CommercialSettingsReq;
import com.spacetime.admin.dto.response.CommercialConfigVO;
import com.spacetime.admin.dto.response.CommercialSettingsVO;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class CommercialConfigRequestContractTest {

    @Test
    void aggregateSaveRequestsShouldCarryStableDatabaseIds() throws Exception {
        assertEquals(Long.class, VipPackageSaveReq.class.getDeclaredField("id").getType());
        assertEquals(Long.class, CoinPackageSaveReq.class.getDeclaredField("id").getType());
        assertEquals(Long.class, VipBenefitSaveReq.class.getDeclaredField("id").getType());
    }

    @Test
    void miniappCoinPackageResponseShouldExposeLanhuPriceFields() throws Exception {
        Class<?> responseType = com.spacetime.miniapp.dto.response.CoinPackageVO.class;
        assertEquals(java.math.BigDecimal.class, responseType.getDeclaredField("originAmount").getType());
        assertEquals(java.math.BigDecimal.class, responseType.getDeclaredField("discountAmount").getType());
        assertEquals(String.class, responseType.getDeclaredField("mobileTag").getType());
    }

    @Test
    void aggregateConfigShouldCarryDatabaseBackedCommercialSettings() throws Exception {
        assertEquals("CommercialSettingsReq", CommercialConfigSaveReq.class.getDeclaredField("settings").getType().getSimpleName());
        assertEquals("CommercialSettingsVO", CommercialConfigVO.class.getDeclaredField("settings").getType().getSimpleName());
        assertEquals(Integer.class, CommercialSettingsReq.class
                .getDeclaredField("idealBatchDiscountPercent").getType());
        assertEquals(Integer.class, CommercialSettingsVO.class
                .getDeclaredField("idealBatchDiscountPercent").getType());
    }
}
