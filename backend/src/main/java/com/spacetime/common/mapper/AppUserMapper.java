package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.entity.AppUser;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 小程序用户 MyBatis 数据库映射接口
 * 继承 BaseMapper，获得 CRUD 能力
 */
@Mapper
public interface AppUserMapper extends BaseMapper<AppUser> {
    @Select("SELECT u.* FROM app_user u "
            + "LEFT JOIN app_message_event_inbox i ON i.event_key=CONCAT("
            + "'prd01:system_message_create:account-status:',u.id,':',u.account_status,':',"
            + "DATE_FORMAT(u.update_time,'%Y%m%d%H%i%s'),':',u.id) AND i.deleted=0 "
            + "WHERE u.deleted=0 AND u.account_status IN ('FROZEN','CANCELLING','CANCELLED') "
            + "AND u.update_time>=#{updatedAfter} AND i.id IS NULL "
            + "ORDER BY u.update_time,u.id LIMIT #{limit}")
    List<AppUser> selectRestrictedWithoutMessage(
            @Param("updatedAfter") LocalDateTime updatedAfter, @Param("limit") int limit);
}
