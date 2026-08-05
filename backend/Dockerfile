FROM maven:3.9.9-eclipse-temurin-21 AS build

WORKDIR /workspace
COPY pom.xml .
RUN set -e; \
    for attempt in 1 2 3; do \
      if mvn -B -DskipTests dependency:go-offline; then \
        exit 0; \
      fi; \
      if [ "$attempt" -eq 3 ]; then \
        exit 1; \
      fi; \
      sleep $((attempt * 15)); \
    done
COPY src ./src
RUN mvn -B -DskipTests package

FROM eclipse-temurin:21-jre-alpine

RUN apk add --no-cache curl \
    && addgroup -S spacetime \
    && adduser -S spacetime -G spacetime

WORKDIR /app
COPY --from=build /workspace/target/*.jar /app/app.jar

ENV JAVA_OPTS=""
EXPOSE 8080

USER spacetime
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/app.jar"]
