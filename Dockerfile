FROM node:16.6-alpine3.14 as build

WORKDIR /app

COPY package.json .
RUN apk add py3-pip g++ make
RUN yarn install

COPY tsconfig.json .
COPY src/ src/
RUN yarn build

FROM node:16.6-alpine3.14 as deps
WORKDIR /app
COPY --from=build /app/package.json .
RUN apk add py3-pip g++ make
RUN yarn install --prod

FROM node:16.6-alpine3.14 as run
WORKDIR /app
COPY --from=build /app/package.json .
COPY --from=build /app/build/ build/
COPY --from=deps /app/node_modules node_modules/
CMD yarn start
