FROM node:23-slim
WORKDIR /app
COPY package.json /app
RUN npm install --force
COPY . /app
CMD [ "npx", "expo", "start"]