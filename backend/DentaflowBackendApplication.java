package com.dentaflow.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class DentaflowBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(DentaflowBackendApplication.class, args);
    }

}



