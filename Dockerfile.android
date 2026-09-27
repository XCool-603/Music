FROM circleci/android:2024.01.1-node

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

COPY vite.config.ts tsconfig.json ./
COPY index.html ./
COPY public/ public/
COPY src/ src/

ENV BUILD_TARGET=capacitor
RUN npm run build:frontend

RUN npx cap sync android

RUN cd android && ./gradlew assembleDebug

RUN mkdir -p /output && \
    cp android/app/build/outputs/apk/debug/app-debug.apk /output/muse-audio.apk

CMD ["cp", "-r", "/output/.", "/output-volume/"]
