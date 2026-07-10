package com.spacetime.miniapp.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.CoinPackageDao;
import com.spacetime.common.dao.CoinSceneConfigDao;
import com.spacetime.common.dao.UserAssetDao;
import com.spacetime.common.dao.UserCoinLogDao;
import com.spacetime.common.entity.CoinPackage;
import com.spacetime.common.entity.CoinSceneConfig;
import com.spacetime.miniapp.dto.response.CoinPackageVO;
import com.spacetime.miniapp.dto.response.CoinSceneVO;
import com.spacetime.miniapp.service.impl.CoinServiceImpl;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("CoinServiceImpl 小程序动态配置映射测试")
class CoinServiceImplTest {

    @Mock private CoinPackageDao coinPackageDao;
    @Mock private CoinSceneConfigDao coinSceneConfigDao;
    @Mock private UserAssetDao userAssetDao;
    @Mock private UserCoinLogDao userCoinLogDao;

    @InjectMocks
    private CoinServiceImpl service;

    @Test
    @DisplayName("L3-09 千寻币套餐返回蓝湖价格与标签字段")
    void getPackages_shouldExposeLanhuPriceFields() {
        CoinPackage entity = new CoinPackage();
        entity.setId(11L);
        entity.setPackageName("3000千寻币");
        entity.setAmount(new BigDecimal("268.00"));
        entity.setOriginAmount(new BigDecimal("301.12"));
        entity.setDiscountAmount(new BigDecimal("268.00"));
        entity.setCoinCount(3000);
        entity.setRecommendFlag(1);
        entity.setPackageTag("热销推荐");
        entity.setMobileTag("8.9折");
        when(coinPackageDao.selectPage(any(), any())).thenReturn(page(List.of(entity)));

        CoinPackageVO result = service.getPackages().get(0);

        assertThat(result.getId()).isEqualTo(11L);
        assertThat(result.getOriginAmount()).isEqualByComparingTo("301.12");
        assertThat(result.getDiscountAmount()).isEqualByComparingTo("268.00");
        assertThat(result.getMobileTag()).isEqualTo("8.9折");
        assertThat(result.getRecommendFlag()).isEqualTo(1);
    }

    @Test
    @DisplayName("L3-11 消费场景返回数据库移动端名称和 OSS 图标键")
    void getScenes_shouldExposeDatabaseMobileFields() {
        CoinSceneConfig entity = new CoinSceneConfig();
        entity.setId(9L);
        entity.setSceneCode("whisper");
        entity.setMobileName("送悄悄话");
        entity.setMobileIcon("coinUsageWhisper");
        entity.setSceneDesc("单次发送悄悄话");
        entity.setUnitPrice(12);
        when(coinSceneConfigDao.selectPage(any(), any())).thenReturn(page(List.of(entity)));

        CoinSceneVO result = service.getScenes().get(0);

        assertThat(result.getId()).isEqualTo(9L);
        assertThat(result.getMobileDisplayName()).isEqualTo("送悄悄话");
        assertThat(result.getMobileIcon()).isEqualTo("coinUsageWhisper");
        assertThat(result.getUnitPrice()).isEqualTo(12);
    }

    private <T> Page<T> page(List<T> records) {
        Page<T> page = new Page<>(1, 100, records.size());
        page.setRecords(records);
        return page;
    }
}
