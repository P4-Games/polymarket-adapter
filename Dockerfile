FROM node:20.19.0-bullseye AS base

COPY package.json bun.lock tsconfig.json ./
RUN curl -fsSL https://bun.sh/install | bash -s "bun-v1.1.21" && \
    echo 'export BUN_INSTALL="$HOME/.bun"' >> ~/.bashrc && \
    echo 'export PATH="$BUN_INSTALL/bin:$PATH"' >> ~/.bashrc && \
    echo 'export PATH="$BUN_INSTALL/bin:$PATH"' >> ~/.profile && \
    echo 'export PATH="$BUN_INSTALL/bin:$PATH"' >> ~/.bash_profile

# Ensure Bun is available in PATH
ENV BUN_INSTALL="/root/.bun"
ENV PATH="${BUN_INSTALL}/bin:${PATH}"

RUN node -v && bun -v
WORKDIR /app

ARG AUTH_TOKEN
ENV AUTH_TOKEN=${AUTH_TOKEN}

COPY package.json bun.lock tsconfig.json ./
RUN bun install --frozen-lockfile

COPY src/ ./src
COPY tsconfig.json ./

EXPOSE 3000
ENV PORT 3000

CMD ["bun", "start"]
