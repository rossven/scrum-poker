# Tek imaj: önce frontend, sonra backend derlenir; frontend JAR'ın içine gömülür.

FROM node:22-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

FROM eclipse-temurin:21-jdk AS backend
WORKDIR /app/backend
COPY backend/gradlew backend/settings.gradle backend/build.gradle ./
COPY backend/gradle ./gradle
RUN ./gradlew --no-daemon dependencies > /dev/null
COPY backend/src ./src
COPY --from=frontend /app/frontend/dist /app/frontend/dist
RUN ./gradlew --no-daemon bootJar -x test

FROM eclipse-temurin:21-jre
WORKDIR /app
RUN useradd --system --uid 1001 app
COPY --from=backend /app/backend/build/libs/sprintmasasi-*.jar /app/app.jar
USER app
EXPOSE 8080
# Render ücretsiz plan 512 MB: heap %55'te kalır, JVM'in kendi ek yüküne yer açılır.
# %75'te toplam bellek sınırı aşılıp süreç öldürülüyor, bellekteki odalar kayboluyordu.
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=55", "-jar", "/app/app.jar"]
