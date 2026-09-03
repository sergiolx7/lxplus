# LX Plus — Guia de Produção

A v16 separa a interface do backend. O frontend continua abrindo em modo local, mas o diretório `backend/` já traz um scaffold de API e o schema PostgreSQL.

## Ordem recomendada
1. Criar banco PostgreSQL e aplicar `backend/sql/schema.sql`.
2. Copiar `backend/.env.example` para `.env` e configurar `DATABASE_URL`, `WEB_ORIGIN` e provider de mídia.
3. Instalar as dependências e iniciar a API.
4. Em `js/config.js`, definir `production:true` e `apiBase:'https://api.seudominio...'`.
5. Colocar vídeos/músicas em object storage; nunca dentro do frontend.
6. Adicionar worker de transcodificação FFmpeg para gerar HLS 360p/720p/1080p e thumbnails.
7. Configurar CDN e URLs assinadas para mídia privada.
8. Ativar observabilidade, backups e logs.

## Domínio
Recomendação: `www.seudominio` para web, `api.seudominio` para API e um domínio separado de mídia/CDN.

## Importante
O scaffold não inventa credenciais nem infraestrutura. Ele precisa ser conectado aos serviços que você escolher antes da abertura pública.
