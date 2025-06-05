package com.ssafy.baperang.global.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;

@Configuration
public class SwaggerConfig {

    @Bean
    public OpenAPI openAPI() {
        return new OpenAPI()
                .components(new Components())
                .info(info());
    }

    private Info info() {
        return new Info()
                .title("Baperang API")
                .version("1.0.0")
                .description("Baperang API 문서");
    }
} 