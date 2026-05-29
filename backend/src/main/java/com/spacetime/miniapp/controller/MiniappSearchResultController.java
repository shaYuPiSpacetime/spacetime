package com.spacetime.miniapp.controller;

import com.spacetime.common.interceptor.UserContextHolder;
import com.spacetime.common.result.R;
import com.spacetime.miniapp.dto.response.MiniappSearchResultPageVO;
import com.spacetime.miniapp.service.MiniappSearchResultService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/miniapp/search")
@RequiredArgsConstructor
public class MiniappSearchResultController {
    private final MiniappSearchResultService searchResultService;

    @GetMapping("/results")
    public R<MiniappSearchResultPageVO> results(@RequestParam String keyword,
                                                @RequestParam(defaultValue = "all") String type,
                                                @RequestParam(defaultValue = "1") int page,
                                                @RequestParam(defaultValue = "20") int size) {
        return R.ok(searchResultService.search(UserContextHolder.get().getId(), keyword, type, page, size));
    }
}
