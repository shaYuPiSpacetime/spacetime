package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.entity.UserAsset;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

/**
 * 用户资产 Mapper
 */
@Mapper
public interface UserAssetMapper extends BaseMapper<UserAsset> {

    /** 解锁确认事务中锁定当前用户资产，串行化重复确认与扣币。 */
    @Select("SELECT * FROM app_user_asset WHERE user_id = #{userId} AND deleted = 0 LIMIT 1 FOR UPDATE")
    UserAsset selectByUserIdForUpdate(@Param("userId") Long userId);

    /** 原子消费一次免费悄悄话权益，权益不足时不更新。 */
    @Update("UPDATE app_user_asset "
            + "SET today_free_whisper_remain = today_free_whisper_remain - 1, update_time = NOW() "
            + "WHERE user_id = #{userId} AND deleted = 0 AND today_free_whisper_remain > 0")
    int consumeFreeWhisper(@Param("userId") Long userId);

    @Update("UPDATE app_user_asset SET today_free_whisper_remain=#{remain}, update_time=NOW() "
            + "WHERE user_id=#{userId} AND deleted=0")
    int updateFreeWhisperProjection(@Param("userId") Long userId, @Param("remain") Integer remain);

    /** 原子更新千寻币余额，余额不足时不更新 */
    @Update("UPDATE app_user_asset SET coin_balance = coin_balance + #{delta}, update_time = NOW() "
            + "WHERE user_id = #{userId} AND deleted = 0 "
            + "AND (#{delta} >= 0 OR coin_balance >= -#{delta})")
    int updateCoinBalance(@Param("userId") Long userId, @Param("delta") Integer delta);

    /** 原子更新累计充值金额与最后购买时间 */
    @Update("UPDATE app_user_asset SET total_recharge = COALESCE(total_recharge, 0) + #{amount}, last_purchase_time = #{purchaseTime}, update_time = NOW() WHERE user_id = #{userId} AND deleted = 0")
    int updateRechargeStats(@Param("userId") Long userId,
                            @Param("amount") java.math.BigDecimal amount,
                            @Param("purchaseTime") java.time.LocalDateTime purchaseTime);

    /** 更新最后消费时间 */
    @Update("UPDATE app_user_asset SET last_consume_time = #{consumeTime}, update_time = NOW() WHERE user_id = #{userId} AND deleted = 0")
    int updateLastConsumeTime(@Param("userId") Long userId,
                              @Param("consumeTime") java.time.LocalDateTime consumeTime);

    /** 原子更新已到期会员状态，重复执行不会重复处理 */
    @Update("UPDATE app_user_asset SET vip_status = 'expired', update_time = NOW() "
            + "WHERE vip_status = 'active' AND vip_expire_time IS NOT NULL "
            + "AND vip_expire_time <= #{expireBefore} AND deleted = 0")
    int expireVipMemberships(@Param("expireBefore") java.time.LocalDateTime expireBefore);

    /** 查询会员状态前原子更新指定用户的到期状态 */
    @Update("UPDATE app_user_asset SET vip_status = 'expired', update_time = NOW() "
            + "WHERE user_id = #{userId} AND vip_status = 'active' AND vip_expire_time IS NOT NULL "
            + "AND vip_expire_time <= #{expireBefore} AND deleted = 0")
    int expireVipMembership(@Param("userId") Long userId,
                            @Param("expireBefore") java.time.LocalDateTime expireBefore);
}
