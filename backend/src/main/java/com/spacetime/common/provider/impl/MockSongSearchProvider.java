package com.spacetime.common.provider.impl;

import cn.hutool.core.util.StrUtil;
import com.spacetime.common.provider.SongSearchProvider;
import com.spacetime.miniapp.dto.response.SongOptionVO;
import org.springframework.stereotype.Component;

import java.util.List;

/** Mock 歌曲搜索，真实三方接入前用于前后端联调。 */
@Component
public class MockSongSearchProvider implements SongSearchProvider {

    @Override
    public List<SongOptionVO> search(String keyword, int limit) {
        String key = StrUtil.blankToDefault(keyword, "告白气球").trim();
        List<SongOptionVO> all = List.of(
                song("mock-song-001", "告白气球", "周杰伦", "周杰伦的床边故事"),
                song("mock-song-002", "夜空中最亮的星", "逃跑计划", "世界"),
                song("mock-song-003", "总有一天你会出现在我身边", "棱镜乐队", "这是我一生中最勇敢的瞬间"),
                song("mock-song-004", "晴天", "周杰伦", "叶惠美")
        );
        return all.stream()
                .filter(item -> item.getSongName().contains(key)
                        || item.getArtistName().contains(key)
                        || key.length() <= 1)
                .limit(Math.max(1, limit))
                .toList();
    }

    private SongOptionVO song(String id, String name, String artist, String album) {
        SongOptionVO vo = new SongOptionVO();
        vo.setSongId(id);
        vo.setSongName(name);
        vo.setArtistName(artist);
        vo.setAlbumName(album);
        vo.setCoverUrl("https://example.test/prd01/song/" + id + ".jpg");
        return vo;
    }
}
