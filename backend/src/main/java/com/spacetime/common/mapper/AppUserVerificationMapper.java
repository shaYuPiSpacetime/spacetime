package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.entity.AppUserVerification;
import org.apache.ibatis.annotations.Mapper;

/**
 * 用户认证审核 MyBatis 数据库映射接口
 * 继承 BaseMapper，获得 CRUD 能力
 */
@Mapper
public interface AppUserVerificationMapper extends BaseMapper<AppUserVerification> {
}
