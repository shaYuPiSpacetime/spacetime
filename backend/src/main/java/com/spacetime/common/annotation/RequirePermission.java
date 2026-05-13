package com.spacetime.common.annotation;

import java.lang.annotation.*;

/**
 * 权限校验注解，标注在 Controller 方法上
 * 值格式为 module:entity:action，如 system:user:list
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface RequirePermission {
    String value();
}
