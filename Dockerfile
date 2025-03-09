FROM node:22.14.0-bullseye-slim

# Set working directory
WORKDIR /app

# Define volumes for persistent data storage
VOLUME [ "/app/db", "/app/assets", "/app/dist/assets", "/app/extras" ]

# Install pnpm globally
RUN npm install pnpm@10 -g

# SHA used for versioning
ARG SHA=unknown

# Add package files and install dependencies
ADD package.json pnpm-lock.yaml ./
RUN pnpm i --frozen-lockfile

# Add configuration and source files
ADD tailwind.config.js tsconfig.json .babelrc .postcssrc .prettierrc srv.tsconfig.json ./
ADD common/ ./common/
ADD srv/ ./srv/
ADD web/ ./web

# Build the server and replace SHA in index.html
RUN pnpm run build:server && \
    sed -i "s/{{unknown}}/${SHA}/g" /app/web/index.html && \
    pnpm run build && mkdir -p /app/assets && \
    echo "${SHA}" > /app/version.txt

# Set environment variables
ENV LOG_LEVEL=info \
    INITIAL_USER=administrator \
    DB_NAME=agnai \
    ASSET_FOLDER=/app/dist/assets

# Expose application ports
EXPOSE 3001
EXPOSE 5001

# Set the entry point and default command
ENTRYPOINT [ "pnpm" ]
CMD ["run", "server"]
