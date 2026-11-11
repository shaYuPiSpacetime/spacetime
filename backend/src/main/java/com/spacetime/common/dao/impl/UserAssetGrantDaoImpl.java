package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.spacetime.common.dao.UserAssetGrantDao;
import com.spacetime.common.entity.UserAssetGrant;
import com.spacetime.common.mapper.UserAssetGrantMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;
import java.util.List;

/** 赠送台账数据访问实现。 */
@Repository
@RequiredArgsConstructor
public class UserAssetGrantDaoImpl implements UserAssetGrantDao {
    private final UserAssetGrantMapper mapper;
    @Override
    public UserAssetGrant findByKeyForUpdate(String key) {
        return mapper.selectOne(new LambdaQueryWrapper<UserAssetGrant>()
                .eq(UserAssetGrant::getIdempotencyKey, key).last("FOR UPDATE"));
    }
    @Override
    public void insert(UserAssetGrant grant) { mapper.insert(grant); }
    @Override
    public List<UserAssetGrant> recent(Long userId) {
        return mapper.selectList(new LambdaQueryWrapper<UserAssetGrant>()
                .eq(UserAssetGrant::getUserId, userId).orderByDesc(UserAssetGrant::getId).last("LIMIT 50"));
    }
}
