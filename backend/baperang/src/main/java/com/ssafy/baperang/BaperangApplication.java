package com.ssafy.baperang;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableJpaAuditing
public class BaperangApplication {

    public static void main(String[] args) {
        SpringApplication.run(BaperangApplication.class, args);
    }

}
