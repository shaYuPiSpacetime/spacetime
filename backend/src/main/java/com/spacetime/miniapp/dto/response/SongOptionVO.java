package com.spacetime.miniapp.dto.response;

import lombok.Data;

/** 歌曲搜索结果。 */
@Data
public class SongOptionVO {
    private String songId;
    private String songName;
    private String artistName;
    private String albumName;
    private String coverUrl;
}
