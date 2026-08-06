package com.spacetime.miniapp.controller;

import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.interceptor.UserContext;
import com.spacetime.common.interceptor.UserContextHolder;
import com.spacetime.common.result.R;
import com.spacetime.miniapp.dto.request.IdealSearchReq;
import com.spacetime.miniapp.dto.request.IdealUnlockAllQuoteReq;
import com.spacetime.miniapp.dto.request.IdealUnlockConfirmReq;
import com.spacetime.miniapp.dto.request.IdealUnlockQuoteReq;
import com.spacetime.miniapp.dto.response.IdealMetaVO;
import com.spacetime.miniapp.dto.response.IdealHelpVO;
import com.spacetime.miniapp.dto.response.IdealResultPageVO;
import com.spacetime.miniapp.dto.response.IdealSearchRecordPageVO;
import com.spacetime.miniapp.dto.response.IdealSearchVO;
import com.spacetime.miniapp.dto.response.IdealUnlockConfirmVO;
import com.spacetime.miniapp.dto.response.IdealUnlockQuoteVO;
import com.spacetime.miniapp.dto.response.IdealUnlockRecordPageVO;
import com.spacetime.miniapp.service.IdealHistoryService;
import com.spacetime.miniapp.service.IdealService;
import com.spacetime.miniapp.service.IdealUnlockService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** PRD-08 理想型筛选与隐私结果接口。 */
@RestController
@RequestMapping("/miniapp/ideal")
@RequiredArgsConstructor
public class IdealController {
    private final IdealService idealService;
    private final IdealUnlockService idealUnlockService;
    private final IdealHistoryService idealHistoryService;

    @GetMapping("/meta")
    public R<IdealMetaVO> meta() {
        return R.ok(idealService.getMeta(currentUserId()));
    }

    @PostMapping("/search")
    public R<IdealSearchVO> search(@Valid @RequestBody IdealSearchReq req) {
        return R.ok(idealService.search(currentUserId(), req));
    }

    @GetMapping("/snapshots/{snapshotNo}/results")
    public R<IdealResultPageVO> results(@PathVariable String snapshotNo,
                                       @RequestParam(required = false) String cursor) {
        return R.ok(idealService.getResults(currentUserId(), snapshotNo, cursor));
    }

    @PostMapping("/unlock/quote")
    public R<IdealUnlockQuoteVO> quote(@Valid @RequestBody IdealUnlockQuoteReq req) {
        return R.ok(idealUnlockService.quote(currentUserId(), req));
    }

    @PostMapping("/unlock-all/quote")
    public R<IdealUnlockQuoteVO> quoteAll(@Valid @RequestBody IdealUnlockAllQuoteReq req) {
        return R.ok(idealUnlockService.quoteAll(currentUserId(), req));
    }

    @PostMapping("/unlock/confirm")
    public R<IdealUnlockConfirmVO> confirm(@Valid @RequestBody IdealUnlockConfirmReq req) {
        return R.ok(idealUnlockService.confirm(currentUserId(), req));
    }

    @GetMapping("/search-records")
    public R<IdealSearchRecordPageVO> searchRecords(
            @RequestParam(required = false) String cursor) {
        return R.ok(idealHistoryService.searchRecords(currentUserId(), cursor));
    }

    @GetMapping("/unlocks")
    public R<IdealUnlockRecordPageVO> unlockRecords(
            @RequestParam(defaultValue = "all") String status,
            @RequestParam(required = false) String cursor) {
        return R.ok(idealHistoryService.unlockRecords(currentUserId(), status, cursor));
    }

    @GetMapping("/help")
    public R<IdealHelpVO> help() {
        return R.ok(idealHistoryService.help(currentUserId()));
    }

    private Long currentUserId() {
        UserContext context = UserContextHolder.get();
        if (context == null || context.getId() == null) {
            throw new BusinessException(401, "未登录或登录已过期");
        }
        return context.getId();
    }
}
