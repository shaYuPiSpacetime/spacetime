package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.entity.AppUserCancelRequest;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface AppUserCancelRequestMapper extends BaseMapper<AppUserCancelRequest> {
    /** 注销与撤销共用申请行锁，读取已提交的最新状态。 */
    @Select("SELECT * FROM app_user_cancel_request WHERE id=#{id} AND deleted=0 FOR UPDATE")
    AppUserCancelRequest selectByIdForUpdate(@Param("id") Long id);
}
