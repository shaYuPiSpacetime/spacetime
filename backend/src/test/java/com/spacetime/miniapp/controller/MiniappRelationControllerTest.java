package com.spacetime.miniapp.controller;

import com.spacetime.common.exception.GlobalExceptionHandler;
import com.spacetime.common.interceptor.UserContext;
import com.spacetime.common.interceptor.UserContextHolder;
import com.spacetime.miniapp.dto.response.LikesMePageVO;
import com.spacetime.miniapp.dto.response.MatchPopupVO;
import com.spacetime.miniapp.dto.response.MutualMatchPageVO;
import com.spacetime.miniapp.dto.response.RecentViewersPageVO;
import com.spacetime.miniapp.dto.response.RelationLikeActionVO;
import com.spacetime.miniapp.dto.response.RelationVisitActionVO;
import com.spacetime.miniapp.service.MiniappRelationService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** PRD-02 移动端关系反馈路由契约。 */
@ExtendWith(MockitoExtension.class)
class MiniappRelationControllerTest {
    @Mock private MiniappRelationService relationService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        UserContextHolder.set(new UserContext(7L, "移动端用户", List.of(), List.of()));
        mockMvc = MockMvcBuilders.standaloneSetup(new MiniappRelationController(relationService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @AfterEach
    void tearDown() {
        UserContextHolder.clear();
    }

    @Test
    void exposesThreeRelationshipLists() throws Exception {
        LikesMePageVO likes = new LikesMePageVO();
        likes.setTotal(12L);
        likes.setNewCount(3L);
        RecentViewersPageVO viewers = new RecentViewersPageVO();
        viewers.setTotalPv(36L);
        MutualMatchPageVO matches = new MutualMatchPageVO();
        matches.setTotal(4L);
        when(relationService.likesMe(7L, 1, 20, "snapshot-001")).thenReturn(likes);
        when(relationService.recentViewers(7L, 1, 20)).thenReturn(viewers);
        when(relationService.mutualMatches(7L, 1, 20)).thenReturn(matches);

        mockMvc.perform(get("/miniapp/relation/likes-me")
                        .param("page", "1")
                        .param("size", "20")
                        .param("snapshotCursor", "snapshot-001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.total").value(12))
                .andExpect(jsonPath("$.data.newCount").value(3));
        mockMvc.perform(get("/miniapp/relation/recent-viewers"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalPv").value(36));
        mockMvc.perform(get("/miniapp/relation/mutual-matches"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.total").value(4));
    }

    @Test
    void exposesLikeCancelAndVisitActions() throws Exception {
        RelationLikeActionVO liked = new RelationLikeActionVO();
        liked.setLikeNo("LIK-001");
        liked.setLikeStatus("active");
        when(relationService.createLike(eq(7L), any())).thenReturn(liked);
        when(relationService.cancelLike(7L, 8L)).thenReturn(new RelationLikeActionVO());
        RelationVisitActionVO visit = new RelationVisitActionVO();
        visit.setVisitNo("VIS-001");
        when(relationService.recordVisit(eq(7L), any())).thenReturn(visit);

        mockMvc.perform(post("/miniapp/relation/likes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"requestId":"like-001","targetUserId":8,"sourceScene":"profile"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.likeNo").value("LIK-001"));
        mockMvc.perform(delete("/miniapp/relation/likes/8"))
                .andExpect(status().isOk());
        mockMvc.perform(post("/miniapp/relation/visits")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"eventNo":"visit-001","targetUserId":8,"sourceScene":"profile"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.visitNo").value("VIS-001"));
    }

    @Test
    void exposesPendingPopupAndReadReceipt() throws Exception {
        MatchPopupVO popup = new MatchPopupVO();
        popup.setMatchNo("MAT-001");
        when(relationService.pendingPopup(7L)).thenReturn(popup);

        mockMvc.perform(get("/miniapp/relation/match-popup/pending"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.matchNo").value("MAT-001"));
        mockMvc.perform(post("/miniapp/relation/match-popup/MAT-001/read")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"action\":\"profile\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));

        verify(relationService).readPopup(eq(7L), eq("MAT-001"), any());
    }

    @Test
    void exposesLikesMeSnapshotReadReceipt() throws Exception {
        mockMvc.perform(post("/miniapp/relation/likes-me/read")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"readCursor\":\"cursor-001\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));

        verify(relationService).confirmLikesMeRead(eq(7L), any());
    }
}
