package com.spacetime.miniapp.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dto.PageReq;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.interceptor.UserContext;
import com.spacetime.common.interceptor.UserContextHolder;
import com.spacetime.common.result.R;
import com.spacetime.miniapp.dto.response.CoinBalanceVO;
import com.spacetime.miniapp.dto.response.CoinFlowVO;
import com.spacetime.miniapp.dto.response.CoinPackageVO;
import com.spacetime.miniapp.service.CoinService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 小程序成家币控制器
 */
@RestController
@RequestMapping("/miniapp/coin")
@RequiredArgsConstructor
public class CoinController {
    private final CoinService coinService;

    /** 成家币套餐列表 */
    @GetMapping("/packages")
    public R<List<CoinPackageVO>> getPackages() {
        return R.ok(coinService.getPackages());
    }

    /** 成家币余额 */
    @GetMapping("/balance")
    public R<CoinBalanceVO> getBalance() {
        return R.ok(coinService.getBalance(currentUserId()));
    }

    /** 成家币流水 */
    @GetMapping("/flows")
    public R<Page<CoinFlowVO>> getFlows(@RequestParam(defaultValue = "1") int page,
                                         @RequestParam(defaultValue = "10") int size) {
        PageReq req = new PageReq();
        req.setPage(page);
        req.setSize(size);
        return R.ok(coinService.getFlows(currentUserId(), req));
    }

    private Long currentUserId() {
        UserContext ctx = UserContextHolder.get();
        if (ctx == null) {
            throw new BusinessException(401, "未登录或登录已过期");
        }
        return ctx.getId();
    }
}
