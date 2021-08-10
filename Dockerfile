FROM node:16.6-alpine3.14 as build

WORKDIR /app

COPY package.json .
RUN yarn install

COPY tsconfig.json .
COPY src/ src/
RUN yarn build

FROM node:16.6-alpine3.14 as run
WORKDIR /app
COPY --from=build /app/package.json .
COPY --from=build /app/build/ build/
RUN yarn install --prod
CMD yarn start
