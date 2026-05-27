# Stage 1: Build de l'application
FROM eclipse-temurin:25-jdk-alpine AS builder
WORKDIR /app
COPY . .
RUN apk add --no-cache maven
RUN mvn clean package -DskipTests

# Stage 2: Runtime ultra-léger
FROM eclipse-temurin:25-jre-alpine
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar

# Optimisations Java pour les Virtual Threads et la mémoire
ENV JAVA_OPTS="-XX:+UseG1GC -XX:+UseStringDeduplication -Dspring.threads.virtual.enabled=true"

EXPOSE 8080
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
