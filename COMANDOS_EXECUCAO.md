# TeMesa — Comandos para executar no PowerShell

Execute na pasta do TeMesa:
  cd C:\Users\pc\Desktop\Projetos\balneario-camboriu\TeMesa

---

## STATUS ATUAL ✅

Banco de dados: CRIADO (supabase-schema.sql executado)
Restaurante:    CRIADO (porto-cabral-bc, ID: cmnzbponl000013bqspbcqxh5)
Turnos:         CRIADOS (Almoço, Happy Hour, Jantar)
Dev local:      FUNCIONANDO em http://localhost:3000

---

## COMANDOS DO DIA A DIA

### Iniciar servidor de desenvolvimento
  pnpm dev
  Acesse: http://localhost:3000/r/porto-cabral-bc

### Regenerar Prisma Client (após alterar schema.prisma)
  pnpm prisma generate

### Rodar seed novamente (re-cria restaurante e turnos sem duplicar)
  pnpm tsx prisma/seed.ts

### Limpar cache do Turbopack (se houver erros estranhos de CSS/resolução)
  Remove-Item -Recurse -Force .next
  pnpm dev

---

## DEPLOY PARA O NETLIFY

  git add -A
  git commit -m "sua mensagem"
  git push

O Netlify faz o build automaticamente após o push.

### Variáveis de ambiente no Netlify (configurar 1x)
No painel: unique-sfogliatella-a00c01.netlify.app → Site settings → Environment variables

  NEXT_PUBLIC_APP_URL   = https://unique-sfogliatella-a00c01.netlify.app
  DIRECT_URL            = postgresql://postgres:16841684654temesa65419864196@db.krwizgdhhtgxkwdamjpc.supabase.co:5432/postgres
  (+ todas as outras vars do .env)

### Importar todas as vars de uma vez via CLI
  netlify env:import .env

### Forçar redeploy (após mudar vars NEXT_PUBLIC_*)
  git commit --allow-empty -m "chore: trigger redeploy"
  git push

---

## TORNAR-SE ADMIN (só 1x, após primeiro login)

No SQL Editor do Supabase:
  UPDATE "User" SET "isAdmin" = true WHERE email = 'SEU@EMAIL.COM';

---

## CONFIGURAR WHATSAPP — PENDENTE

No .env, substituir os TODO:
  ZAPI_INSTANCE_ID=sua_instance_id
  ZAPI_TOKEN=seu_token
  ZAPI_CLIENT_TOKEN=seu_client_token

---

## CONFIGURAR CRONS — PENDENTE

No cron-job.org, criar 2 jobs:

  Job 1 (a cada 5min):
    URL: https://unique-sfogliatella-a00c01.netlify.app/api/cron/expire-pending
    Header: Authorization: Bearer temesa_cron_secret_2026

  Job 2 (a cada 1h):
    URL: https://unique-sfogliatella-a00c01.netlify.app/api/cron/reminders
    Header: Authorization: Bearer temesa_cron_secret_2026

---

## URLS IMPORTANTES

Widget Porto Cabral BC: https://unique-sfogliatella-a00c01.netlify.app/r/porto-cabral-bc
Dashboard:              https://unique-sfogliatella-a00c01.netlify.app/dashboard/reservas
Onboarding:             https://unique-sfogliatella-a00c01.netlify.app/onboarding
Confirmação cliente:    https://unique-sfogliatella-a00c01.netlify.app/confirmar/[token]
