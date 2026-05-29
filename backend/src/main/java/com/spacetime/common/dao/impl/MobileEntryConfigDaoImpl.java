package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.spacetime.common.dao.MobileEntryConfigDao;
import com.spacetime.common.entity.MobileEntryConfig;
import com.spacetime.common.enums.CommonStatusEnum;
import com.spacetime.common.mapper.MobileEntryConfigMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 移动端入口配置数据访问实现
 */
@Repository
@RequiredArgsConstructor
public class MobileEntryConfigDaoImpl implements MobileEntryConfigDao {

    private final MobileEntryConfigMapper mobileEntryConfigMapper;

    @Override
    public List<MobileEntryConfig> selectByPageCode(String pageCode) {
        return mobileEntryConfigMapper.selectList(
                new LambdaQueryWrapper<MobileEntryConfig>()
                        .eq(MobileEntryConfig::getPageCode, pageCode)
                        .orderByAsc(MobileEntryConfig::getSort));
    }

    @Override
    public List<MobileEntryConfig> selectEnabledByPageCode(String pageCode) {
        return mobileEntryConfigMapper.selectList(
                new LambdaQueryWrapper<MobileEntryConfig>()
                        .eq(MobileEntryConfig::getPageCode, pageCode)
                        .eq(MobileEntryConfig::getStatus, CommonStatusEnum.ENABLED.getCode())
                        .orderByAsc(MobileEntryConfig::getSort));
    }

    @Override
    public MobileEntryConfig selectById(Long id) {
        return mobileEntryConfigMapper.selectById(id);
    }

    @Override
    public MobileEntryConfig selectByPageCodeAndKey(String pageCode, String entryKey) {
        return mobileEntryConfigMapper.selectOne(
                new LambdaQueryWrapper<MobileEntryConfig>()
                        .eq(MobileEntryConfig::getPageCode, pageCode)
                        .eq(MobileEntryConfig::getEntryKey, entryKey));
    }

    @Override
    public void insert(MobileEntryConfig entity) {
        mobileEntryConfigMapper.insert(entity);
    }

    @Override
    public void updateById(MobileEntryConfig entity) {
        mobileEntryConfigMapper.updateById(entity);
    }

    @Override
    public void batchUpdateSort(List<MobileEntryConfig> entries) {
        for (MobileEntryConfig entry : entries) {
            mobileEntryConfigMapper.update(null,
                    new LambdaUpdateWrapper<MobileEntryConfig>()
                            .eq(MobileEntryConfig::getId, entry.getId())
                            .set(MobileEntryConfig::getSort, entry.getSort()));
        }
    }

    @Override
    public void deleteById(Long id) {
        mobileEntryConfigMapper.deleteById(id);
    }
}
