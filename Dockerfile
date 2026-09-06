FROM node:lts-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma

RUN npm install

COPY . .

RUN DATABASE_URL=postgresql://unused:unused@localhost:5432/unused npm run db:generate
RUN npm run build

COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

EXPOSE 3000
ENTRYPOINT [ "./entrypoint.sh" ]
