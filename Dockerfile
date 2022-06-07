FROM node:16.9.1-alpine3.14 as build

WORKDIR /app

COPY package.json .
COPY yarn.lock .
RUN apk add py3-pip g++ make
RUN yarn install --frozen-lockfile

COPY tsconfig.json .
COPY src/ src/
RUN yarn build

FROM node:16.9.1-alpine3.14 as deps
WORKDIR /app
COPY --from=build /app/package.json .
COPY --from=build /app/yarn.lock .
RUN apk add py3-pip g++ make
RUN yarn install --prod --frozen-lockfile

FROM node:16.9.1-alpine3.14 as run
WORKDIR /app
COPY --from=build /app/package.json .
COPY --from=build /app/build/ build/
COPY --from=deps /app/node_modules node_modules/
CMD yarn start
