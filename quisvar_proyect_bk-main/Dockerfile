ARG NODE_VERSION=22.23.1
ARG PRISMA_GENERATE_DATABASE_URL=postgresql://prisma:prisma@127.0.0.1:5432/prisma?schema=public

# -------- Etapa 1: Build --------
FROM node:${NODE_VERSION}-alpine3.23 AS builder

ARG PRISMA_GENERATE_DATABASE_URL

# Crear el directorio de trabajo dentro del contenedor
WORKDIR /app

# Prisma necesita OpenSSL durante la generación del cliente
RUN apk add --no-cache openssl

# Copiar el archivo de configuración de Prisma
COPY prisma/ ./prisma/
# Copiar el archivo de configuración de npm
COPY scripts/ ./scripts/

# Copiar package.json y package-lock.json (si existe)
COPY package*.json ./

# Instalar dependencias de forma reproducible
RUN DATABASE_URL="${PRISMA_GENERATE_DATABASE_URL}" npm ci

# Copiar los archivos de la aplicación
COPY src/ ./src/
COPY types/ ./types/
COPY tsconfig.json ./

# Compilar de typescript a javascript
RUN npm run build
  
# -------- Etapa 2: Producción --------
FROM node:${NODE_VERSION}-bookworm-slim AS production

ARG PRISMA_GENERATE_DATABASE_URL
    
WORKDIR /app

# Configurar producción e instalar dependencias del sistema
ENV NODE_ENV=production \
    TZ=America/Lima
RUN apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      ca-certificates \
      fontconfig \
      fonts-crosextra-caladea \
      fonts-crosextra-carlito \
      fonts-liberation2 \
      libreoffice-writer \
      openssl \
      poppler-utils \
      qpdf \
      tzdata \
    && rm -rf /var/lib/apt/lists/* \
    && ln -snf /usr/share/zoneinfo/$TZ /etc/localtime \
    && echo $TZ > /etc/timezone \
    && fc-cache -f

# Copiar el archivo de configuración de Prisma
COPY scripts/ ./scripts/
# Copiar el archivo de configuración de npm
COPY prisma/ ./prisma/

# Solo copiar e instalar los archivos necesarios para producción
COPY package*.json ./
RUN DATABASE_URL="${PRISMA_GENERATE_DATABASE_URL}" npm ci --omit=dev

# Copiar los archivos compilados desde el build
COPY --from=builder /app/dist ./dist
# swagger-jsdoc resuelve estos YAML desde ./src/docs en tiempo de ejecución.
# Mantenerlos en la imagen conserva el contrato expuesto por la configuración Docker local.
COPY --from=builder /app/src/docs ./src/docs
COPY 404_page/ ./404_page/
COPY resource/ ./resource/
COPY jsonData/ ./jsonData/

# Expone el puerto de la aplicación
EXPOSE 8081

# Comando de ejecución
CMD ["node", "dist/src/app.js"]
