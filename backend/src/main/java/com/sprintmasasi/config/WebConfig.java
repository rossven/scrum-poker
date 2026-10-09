package com.sprintmasasi.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final AppProperties props;

    public WebConfig(AppProperties props) {
        this.props = props;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        var origins = props.allowedOriginList();
        if (!origins.isEmpty()) {
            registry.addMapping("/api/**").allowedOrigins(origins.toArray(String[]::new)).allowedMethods("GET", "POST");
        }
    }

    // SPA sayfaları (/, /yeni, /r/KOD) web.SiteController'dan sunulur.
}
