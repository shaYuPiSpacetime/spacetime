package com.spacetime.miniapp.service;

import com.spacetime.miniapp.dto.response.ImCredentialVO;

/** 小程序腾讯云 TIM 登录凭证用例。 */
public interface MiniappImService {
    ImCredentialVO credentials(Long userId);
}
