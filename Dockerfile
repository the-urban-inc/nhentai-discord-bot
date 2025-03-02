FROM node:22.13.0-bullseye as deps
WORKDIR /app

COPY package.json .
COPY yarn.lock .
RUN apt-get update
RUN apt-get install -y python3-pip g++ make
RUN yarn install --frozen-lockfile

FROM deps as build
COPY tsconfig.json .
COPY src/ src/
RUN yarn build

FROM node:22.13.0-bullseye as run
WORKDIR /app
COPY --from=mwader/static-ffmpeg:6.1.1 /ffmpeg /usr/bin
COPY --from=mwader/static-ffmpeg:6.1.1 /ffprobe /usr/bin
RUN chmod +x /usr/bin/ffmpeg /usr/bin/ffprobe
COPY --from=build /app/package.json .
COPY --from=build /app/build/ build/
COPY --from=deps /app/node_modules node_modules/
CMD yarn start
