package com.spacetime.miniapp.dto.response;

import lombok.Data;

@Data
public class SchoolOptionVO {
    private String code;
    private String name;
    private String shortName;
    private String province;
    private String city;
    private Boolean is985;
    private Boolean is211;
    private Boolean isDualClass;
    private String source;
}
