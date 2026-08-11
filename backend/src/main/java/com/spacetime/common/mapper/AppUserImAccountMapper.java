package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.entity.AppUserImAccount;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.time.LocalDateTime;
import java.util.List;

/** 平台用户与腾讯云 TIM 账号映射 Mapper。 */
@Mapper
public interface AppUserImAccountMapper extends BaseMapper<AppUserImAccount> {
    @Select("SELECT * FROM app_user_im_account "
            + "WHERE sync_status IN ('pending','failed') AND update_time<=#{retryBefore} "
            + "AND deleted=0 ORDER BY update_time,id LIMIT #{limit}")
    List<AppUserImAccount> selectRetryCandidates(
            @Param("retryBefore") LocalDateTime retryBefore,
            @Param("limit") int limit);

    @Update("UPDATE app_user_im_account SET version=version+1,update_time=#{claimedAt} "
            + "WHERE id=#{id} AND version=#{version} "
            + "AND sync_status IN ('pending','failed') AND deleted=0")
    int claimForSync(@Param("id") Long id,
                     @Param("version") Integer version,
                     @Param("claimedAt") LocalDateTime claimedAt);

    @Update("UPDATE app_user_im_account SET sync_status='disabled',disabled_at=#{disabledAt},"
            + "last_error_code='USER_UNAVAILABLE',last_error_summary='平台用户不存在或账号不可用',"
            + "version=version+1,update_time=#{disabledAt} "
            + "WHERE id=#{id} AND version=#{version} AND deleted=0")
    int markDisabled(@Param("id") Long id,
                     @Param("version") Integer version,
                     @Param("disabledAt") LocalDateTime disabledAt);
}
