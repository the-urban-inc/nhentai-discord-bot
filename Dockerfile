FROM node:13.8.0-alpine3.11 as build

WORKDIR /app

COPY package.json .
RUN yarn install

COPY tsconfig.json .
COPY bot/ bot/
RUN yarn build

FROM node:13.8.0-alpine3.11 as run
WORKDIR /app
COPY --from=build /app/package.json .
COPY --from=build /app/dist/ dist/
RUN yarn install --prod
CMD yarn start
