FROM node:24.0.3
WORKDIR /app
COPY package.json /app
RUN npm install
COPY . /app
CMD [ "npm", "start"]
