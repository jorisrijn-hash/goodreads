# syntax=docker/dockerfile:1

# ---------------------------------------------------------------- build ------
FROM eclipse-temurin:25-jdk AS build
WORKDIR /build

# Dependencies first, so a source-only change does not re-download the world.
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN ./mvnw -B -q dependency:go-offline

COPY src/ src/
RUN ./mvnw -B -q clean package -DskipTests

# ----------------------------------------------------------------- run -------
FROM eclipse-temurin:25-jre
WORKDIR /app

# Not root. A web process has no business owning its own filesystem.
RUN useradd --system --uid 10001 --create-home reading
USER reading

COPY --from=build --chown=reading:reading /build/target/reading-api-*.jar app.jar

# No volume, deliberately. Covers are served from Supabase Storage in production, not
# from this container, so there is nothing here worth persisting. Declaring one would
# create an anonymous volume and imply a requirement that no longer exists — which also
# means this runs on hosts that offer no persistent disk at all, such as Render Free.

EXPOSE 8080

# Container-aware heap sizing rather than a fixed -Xmx that is wrong on every plan.
ENV JAVA_OPTS="-XX:MaxRAMPercentage=70 -XX:+UseSerialGC"

# Fails fast and loudly if a required variable is missing: there is no credential
# fallback outside the local profile, and CredentialGuard refuses an insecure cookie
# or a localhost frontend origin.
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
