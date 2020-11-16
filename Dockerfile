FROM node:14.15.0-alpine3.11 as build

WORKDIR /app

COPY package.json .
RUN yarn install

COPY tsconfig.json .
COPY config.json .
COPY src/ src/
RUN yarn build

FROM node:14.15.0-alpine3.11 as run
WORKDIR /app
COPY --from=build /app/package.json .
COPY --from=build /app/build/ build/
RUN yarn install --prod
CMD yarn start
