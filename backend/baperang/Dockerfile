# ─────────────────────────────────────
# 1) Build stage: JDK17 + Gradle
# ─────────────────────────────────────
FROM gradle:7.6-jdk17 AS builder
WORKDIR /app

# Gradle Wrapper, 설정파일 복사 (캐시 활용)
COPY gradle gradle
COPY gradlew .
COPY build.gradle settings.gradle ./

# 소스 복사 & 빌드
COPY src src
RUN chmod +x gradlew && ./gradlew clean bootJar -x test

# ─────────────────────────────────────
# 2) Run stage: JRE만 포함
# ─────────────────────────────────────
FROM openjdk:17-jdk-slim
WORKDIR /app

# builder에서 만든 JAR 복사
COPY --from=builder /app/build/libs/*.jar app.jar

# 컨테이너 내부 포트
EXPOSE 8000

# 앱 실행
ENTRYPOINT ["java","-jar","app.jar"]