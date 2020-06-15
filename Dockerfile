FROM node:13.8.0-alpine3.11

WORKDIR /app

COPY package.json .
COPY bot/ bot/

RUN apk add --no-cache git
RUN npm install

CMD npm start
