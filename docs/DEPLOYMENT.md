# Deploy do XTTS Panel em VPS ou EasyPanel

## Resultado da auditoria

A interface e o servidor Node/Express atual compilam corretamente. O servidor agora escuta `0.0.0.0` na porta fornecida por `PORT`, expõe `/health` e `/api/v1/health`, desativa `x-powered-by`, aplica headers básicos de segurança e aceita CORS somente para origens listadas em `CORS_ORIGINS`.

## Configuração no EasyPanel

Crie um serviço a partir do `Dockerfile` na raiz do repositório. Use a porta interna `3000` e configure `NODE_ENV=production`. Defina as variáveis de ambiente no painel, nunca em arquivos versionados:

| Variável | Obrigatória | Observação |
|---|---:|---|
| `DATABASE_URL` | Sim | O scaffold atual usa Drizzle com MySQL/TiDB. |
| `JWT_SECRET` | Sim | Valor aleatório longo, exclusivo por ambiente. |
| `PORT` | Sim | EasyPanel normalmente injeta este valor; o processo respeita a variável. |
| `REDIS_URL` | Recomendada | Preparação para fila e rate limit. |
| `XTTS_SERVER_URL` | Para integração | Inicialmente `http://67.217.247.57:8000`. |
| `XTTS_API_KEY` | Para integração | Somente no backend; nunca publicar no frontend. |
| `CORS_ORIGINS` | Sim | Lista separada por vírgulas, sem `*` em produção. |
| `WEBHOOK_SECRET` | Fase posterior | Somente no backend. |

Configure um volume persistente caso o storage local de áudio seja ativado. Não use o filesystem efêmero do container para arquivos que precisam sobreviver a reinícios.

## Reverse proxy e HTTPS

No EasyPanel, aponte o domínio para a porta interna do serviço e habilite TLS. Não exponha a porta do XTTS VPS diretamente ao público. Restrinja a origem da API XTTS por firewall, IP do painel ou autenticação própria.

## Banco e migrações

Execute as migrations como etapa controlada de release, usando o mesmo `DATABASE_URL` do serviço. Faça backup antes de alterações de schema. O compose incluído usa MySQL 8 porque o projeto atual foi inicializado no scaffold Drizzle/MySQL/TiDB; ele **não é PostgreSQL**.

## Bloqueio arquitetural identificado

O MVP foi inicializado no runtime WebDev com Node/Express, tRPC e Drizzle/MySQL/TiDB. Isso permite validar o painel e o deploy do frontend/backend atual, mas ainda não cumpre integralmente o alvo original FastAPI + PostgreSQL + Redis nem implementa a integração real `/api/v1/tts` → XTTS. Antes de produção definitiva, é necessário escolher entre manter este runtime ou migrar a API para FastAPI/PostgreSQL e conectar o frontend a ela.

## Checklist antes de publicar

- [ ] Configurar todos os secrets no EasyPanel.
- [ ] Confirmar que nenhum `.env` real foi enviado ao Git.
- [ ] Testar `/health` e `/api/v1/health` pelo domínio HTTPS.
- [ ] Executar migrations no banco correto.
- [ ] Confirmar conectividade backend → `67.217.247.57:8000` com timeout/retry.
- [ ] Confirmar que a API Key XTTS não aparece em bundles, logs ou respostas.
- [ ] Configurar backup dos volumes de banco, Redis e storage.
- [ ] Habilitar logs e alertas de reinício do container.
- [ ] Validar o limite de concorrência XTTS em CPU como `1`.
