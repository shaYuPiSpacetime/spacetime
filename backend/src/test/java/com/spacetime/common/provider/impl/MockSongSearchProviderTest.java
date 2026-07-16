package com.spacetime.common.provider.impl;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("歌曲候选数据")
class MockSongSearchProviderTest {

    private final MockSongSearchProvider provider = new MockSongSearchProvider();

    @Test
    @DisplayName("空关键词返回首屏推荐而不是空列表")
    void shouldReturnRecommendationsForBlankKeyword() {
        assertThat(provider.search("", 10))
                .extracting("songName")
                .contains("告白气球", "夜空中最亮的星", "总有一天你会出现在我身边");
    }
}
