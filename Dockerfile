FROM node:20.10.0-bullseye-slim

WORKDIR /app
VOLUME [ "/app/db" ]
VOLUME [ "/app/assets" ]
VOLUME [ "/app/dist/assets" ]
VOLUME [ "/app/extras" ]

RUN npm install pnpm@8.6.0 -g

ARG SHA=unknown

ADD package.json pnpm-lock.yaml ./
RUN pnpm i --frozen-lockfile

ADD public.ts pyproject.toml poetry.lock tailwind.config.js tsconfig.json .babelrc .postcssrc .prettierrc srv.tsconfig.json ./
ADD common/ ./common/
ADD srv/ ./srv/
ADD web/ ./web

RUN pnpm run build:server && \
  sed -i "s/{{unknown}}/${SHA}/g" /app/web/index.html && \
  pnpm run build && mkdir -p /app/assets && \
  echo "${SHA}" > /app/version.txt

ENV LOG_LEVEL=info \
  INITIAL_USER=administrator \
  DB_NAME=agnai \
  ASSET_FOLDER=/app/dist/assets

EXPOSE 3001
EXPOSE 5001

ENTRYPOINT [ "pnpm" ]
CMD ["run", "server"]