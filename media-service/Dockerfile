FROM node:24-alpine

LABEL authors="praneeth"

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --omit=dev

COPY . .

EXPOSE 3003

CMD ["node", "src/index.js"]