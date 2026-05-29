package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.entity.UserAsset;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;

/**
 * 用户资产 Mapper
 */
@Mapper
public interface UserAssetMapper extends BaseMapper<UserAsset> {

    /** 原子更新成家币余额（coin_balance = coin_balance + delta） */
    @Update("UPDATE app_user_asset SET coin_balance = coin_balance + #{delta}, update_time = NOW() WHERE user_id = #{userId} AND deleted = 0")
    int updateCoinBalance(@Param("userId") Long userId, @Param("delta") Integer delta);
}
