-- 기존 데이터베이스 삭제
DROP DATABASE IF EXISTS baperang;

-- 데이터베이스 생성
CREATE DATABASE baperang;

-- 데이터베이스 사용
USE baperang;

-- 테이블 삭제 (역순)
DROP TABLE IF EXISTS leftover;
DROP TABLE IF EXISTS menu_nutrient;
DROP TABLE IF EXISTS menu;
DROP TABLE IF EXISTS nutrient;
DROP TABLE IF EXISTS student;
DROP TABLE IF EXISTS `user`;        -- USER 예약어 주의
DROP TABLE IF EXISTS school;
DROP TABLE IF EXISTS controller_performance;
DROP TABLE IF EXISTS holiday;
DROP TABLE IF EXISTS inventory;

-- 기본 테이블 생성
CREATE TABLE school (
                        school_pk    BIGINT       PRIMARY KEY AUTO_INCREMENT,
                        school_name  VARCHAR(100) NOT NULL,
                        city         VARCHAR(20) NOT NULL,
                        make_month   INT,
                        created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
                        updated_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE nutrient (
                          nutrient_pk   BIGINT       PRIMARY KEY AUTO_INCREMENT,
                          nutrient_name VARCHAR(100) NOT NULL,
                          unit          VARCHAR(50)  NOT NULL,
);

CREATE TABLE holiday (
                         holiday_pk    BIGINT       PRIMARY KEY AUTO_INCREMENT,
                         holiday_name  VARCHAR(100) NOT NULL,
                         holiday_date  DATE         NOT NULL,
                         created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
                         updated_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE inventory (
                           inventory_pk   BIGINT       PRIMARY KEY AUTO_INCREMENT,
                           inventory_date DATE         NOT NULL,
                           product_name   VARCHAR(255) NOT NULL,
                           vendor         VARCHAR(255) NOT NULL,
                           price          INT          NOT NULL,
                           order_quantity INT          NOT NULL,
                           order_unit     VARCHAR(20)  NOT NULL,
                           use_quantity   INT          NOT NULL,
                           use_unit       VARCHAR(20)  NOT NULL
);

-- 중간 & 자식 테이블 생성
CREATE TABLE `user` (
                        user_pk          BIGINT       PRIMARY KEY AUTO_INCREMENT,
                        school_pk        BIGINT       NOT NULL,
                        login_id         VARCHAR(20)  NOT NULL UNIQUE,
                        password         VARCHAR(60)  NOT NULL,
                        nutritionist_name VARCHAR(10) NOT NULL,
                        created_at       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
                        updated_at       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        FOREIGN KEY (school_pk)
                            REFERENCES school(school_pk)
                            ON DELETE CASCADE
                            ON UPDATE CASCADE
);

CREATE TABLE student (
                         student_pk   BIGINT       PRIMARY KEY AUTO_INCREMENT,
                         school_pk    BIGINT       NOT NULL,
                         student_name VARCHAR(10)  NOT NULL,
                         gender       VARCHAR(10)  NOT NULL,
                         grade        INT          NOT NULL,
                         class        INT          NOT NULL,
                         number       INT          NOT NULL,
                         height       FLOAT        NOT NULL,
                         weight       FLOAT        NOT NULL,
                         content      TEXT,
                         content_date DATE,
                         image        TEXT,
                         image_date   DATE,
                         created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
                         updated_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                         FOREIGN KEY (school_pk)
                             REFERENCES school(school_pk)
                             ON DELETE CASCADE
                             ON UPDATE CASCADE
);

CREATE TABLE menu (
                      menu_pk     BIGINT       PRIMARY KEY AUTO_INCREMENT,
                      school_pk   BIGINT       NOT NULL,
                      menu_date   DATE         NOT NULL,
                      menu_name   TEXT         NOT NULL,
                      category    VARCHAR(20)  NOT NULL,
                      amount      INT,
                      favorite    FLOAT,
                      votes       INT,
                      alternatives JSON,
                      created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
                      updated_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                      FOREIGN KEY (school_pk)
                          REFERENCES school(school_pk)
                          ON DELETE CASCADE
                          ON UPDATE CASCADE
);

CREATE TABLE menu_nutrient (
                               menu_pk     BIGINT NOT NULL,
                               nutrient_pk BIGINT NOT NULL,
                               amount      FLOAT  NOT NULL,
                               created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                               updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                               PRIMARY KEY (menu_pk, nutrient_pk),
                               FOREIGN KEY (menu_pk)
                                   REFERENCES menu(menu_pk)
                                   ON DELETE CASCADE
                                   ON UPDATE CASCADE,
                               FOREIGN KEY (nutrient_pk)
                                   REFERENCES nutrient(nutrient_pk)
                                   ON DELETE RESTRICT
                                   ON UPDATE CASCADE
);

CREATE TABLE leftover (
                          leftover_pk     BIGINT       PRIMARY KEY AUTO_INCREMENT,
                          menu_pk         BIGINT       NOT NULL,
                          student_pk      BIGINT       NOT NULL,
                          leftover_date   DATE         NOT NULL,
                          left_menu_name  TEXT         NOT NULL,
                          leftover_rate   FLOAT        NOT NULL,
                          created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
                          updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                          FOREIGN KEY (menu_pk)
                              REFERENCES menu(menu_pk)
                              ON DELETE CASCADE
                              ON UPDATE CASCADE,
                          FOREIGN KEY (student_pk)
                              REFERENCES student(student_pk)
                              ON DELETE CASCADE
                              ON UPDATE CASCADE
);

CREATE TABLE controller_performance (
                                       id                BIGINT       PRIMARY KEY AUTO_INCREMENT,
                                       controller_name   VARCHAR(255),
                                       method_name       VARCHAR(255),
                                       execution_time_ms BIGINT,
                                       timestamp         TIMESTAMP,
                                       request_path      VARCHAR(255),
                                       http_method       VARCHAR(20),
                                       is_success        BOOLEAN,
                                       status_code       INT,
                                       error_message     TEXT
);