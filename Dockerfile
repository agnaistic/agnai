FROM node:18-alpine

WORKDIR /app
VOLUME [ "/app/db" ]

RUN npm install pnpm -g

ADD package.json pnpm-lock.yaml ./
RUN pnpm i --frozen-lockfile

ADD public.ts requirements.txt tailwind.config.js tsconfig.json .babelrc .postcssrc .prettierrc ./
ADD common/ ./common/
ADD srv/ ./srv/
ADD web/ ./web


EXPOSE 3001
EXPOSE 5001

CMD ["pnpm", "start"]