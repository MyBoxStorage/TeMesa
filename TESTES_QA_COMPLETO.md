# PROMPT — Guia Completo de Testes e QA | TeMesa

> **Para o agente de testes**: siga este documento seção por seção.
> Para cada teste, registre: ✅ passou, ❌ falhou (com descrição do erro), ⚠️ parcial.
> Se encontrar um bug, descreva: o que fez, o que esperava, o que aconteceu, e screenshot se possível.
> **NÃO corrija bugs** — apenas documente. As correções são feitas em prompt separado.
> Este guia pressupõe que o dev (dono do projeto) executa os comandos no terminal.

---

## Índice

1. [Preparação do ambiente](#1-preparação-do-ambiente)
2. [Verificação de build](#2-verificação-de-build)
3. [Testes do Widget público](#3-testes-do-widget-público)
4. [Testes do Dashboard — Autenticação](#4-testes-do-dashboard--autenticação)
5. [Testes do Dashboard — Visão geral (Hoje)](#5-testes-do-dashboard--visão-geral)
6. [Testes do Dashboard — Reservas](#6-testes-do-dashboard--reservas)
7. [Testes do Dashboard — Mesas](#7-testes-do-dashboard--mesas)
8. [Testes do Dashboard — Waitlist](#8-testes-do-dashboard--waitlist)
9. [Testes do Dashboard — Clientes (CRM)](#9-testes-do-dashboard--clientes)
10. [Testes do Dashboard — Configurações](#10-testes-do-dashboard--configurações)
11. [Testes do Dashboard — Relatórios](#11-testes-do-dashboard--relatórios)
12. [Testes do Dashboard — Garçons](#12-testes-do-dashboard--garçons)
13. [Testes do Dashboard — Hostess (PWA)](#13-testes-do-dashboard--hostess)
14. [Testes de Notificações WhatsApp](#14-testes-de-notificações-whatsapp)
15. [Testes de Notificações E-mail](#15-testes-de-notificações-e-mail)
16. [Testes de Confirmação/Cancelamento pelo cliente](#16-testes-de-confirmaçãocancelamento-pelo-cliente)
17. [Testes de Avaliação pós-visita](#17-testes-de-avaliação-pós-visita)
18. [Testes de Webhook WPPConnect (resposta 1-toque)](#18-testes-de-webhook-wppconnect)
19. [Testes dos Crons](#19-testes-dos-crons)
20. [Testes de Onboarding](#20-testes-de-onboarding)
21. [Testes de Responsividade](#21-testes-de-responsividade)
22. [Testes de Segurança e LGPD](#22-testes-de-segurança-e-lgpd)
23. [Testes de Performance](#23-testes-de-performance)
24. [Testes unitários existentes](#24-testes-unitários)
25. [Checklist final de produção](#25-checklist-final)

---

## 1. Preparação do ambiente

### 1.1 — Serviços necessários

O TeMesa depende de 4 serviços rodando em paralelo. O script `start-all.ps1` abre 4 janelas PowerShell:

| Serviço | Diretório | Porta | Comando |
|---|---|---|---|
| **WPPConnect** (WhatsApp) | `C:\Users\pc\Desktop\wpp-temesa` | 21465 | `node index.mjs` |
| **ngrok** (túnel para WPPConnect) | — | — | `ngrok http 21465` |
| **BC Connect** | `C:\Users\pc\Desktop\Projetos\balneario-camboriu\bc-conect` | — | `pnpm dev` |
| **TeMesa** (Next.js) | `C:\Users\pc\Desktop\Projetos\balneario-camboriu\TeMesa` | 3000 | `pnpm dev` |

**Comandos para o dev executar:**
```powershell
# Opção A: iniciar tudo de uma vez
cd C:\Users\pc\Desktop\Projetos\balneario-camboriu\TeMesa
.\start-all.ps1

# Opção B: iniciar apenas o TeMesa (para testes que não precisam de WhatsApp)
cd C:\Users\pc\Desktop\Projetos\balneario-camboriu\TeMesa
pnpm dev
```

### 1.2 — Verificar que os serviços estão rodando

| Verificação | Como testar | Esperado |
|---|---|---|
| TeMesa rodando | Abrir `http://localhost:3000` | Página carrega (redirect para login ou widget) |
| WPPConnect rodando | Abrir `http://localhost:21465` (ou testar via ngrok URL) | API responde |
| ngrok ativo | Verificar URL no terminal do ngrok | URL tipo `https://xxx.ngrok-free.dev` |
| Env WPPCONNECT_URL | Verificar `.env` | Deve ter a URL do ngrok atual |

### 1.3 — Dados de teste

O restaurante **Porto Cabral BC** já existe via seed:
- **Slug**: `porto-cabral-bc`
- **Widget URL**: `http://localhost:3000/r/porto-cabral-bc`
- **Turnos**: Almoço (12-15:30), Happy Hour (17-19), Jantar (19-23)

### 1.4 — Contas de teste

| Recurso | Credencial |
|---|---|
| Dashboard (Clerk) | Sua conta de dev — login em `http://localhost:3000/sign-in` |
| Supabase | Dashboard em `https://supabase.com/dashboard` — projeto `krwizgdhhtgxkwdamjpc` |

---

## 2. Verificação de build

**Comandos para o dev executar:**

```powershell
# 2.1 — Type check
pnpm type-check
# Esperado: nenhum erro. Se houver, listar todos.

# 2.2 — Build completo
pnpm build --webpack
# Esperado: build completa sem erros. Anotar tempo de build.

# 2.3 — Testes unitários
pnpm test
# Esperado: todos os testes passam (atualmente: reservationRules.test.ts)

# 2.4 — Lint
pnpm lint
# Esperado: sem erros. Warnings são aceitáveis.
```

**Registrar resultados:**
```
□ type-check: ✅/❌ (erros: ___)
□ build: ✅/❌ (tempo: ___s, erros: ___)
□ test: ✅/❌ (testes passando: __/__)
□ lint: ✅/❌ (warnings: ___)
```

---

## 3. Testes do Widget público

### URL: `http://localhost:3000/r/porto-cabral-bc`

### 3.1 — Carregamento inicial

| # | Teste | Esperado | Resultado |
|---|---|---|---|
| 3.1.1 | Abrir URL do widget | Página carrega com nome "Porto Cabral BC" e tema dourado (#C8A96E) | □ |
| 3.1.2 | Logo ou inicial | Logo do restaurante OU letra "P" em fundo dourado aparece | □ |
| 3.1.3 | Texto "Reservas online" | Visível no header | □ |
| 3.1.4 | Idioma padrão | PT-BR selecionado | □ |
| 3.1.5 | Seletor de idioma | Botões PT / EN / ES visíveis no rodapé | □ |
| 3.1.6 | "Powered by TeMesa" | Visível no rodapé | □ |

### 3.2 — Fluxo completo de reserva (happy path)

| # | Passo | Ação | Esperado | Resultado |
|---|---|---|---|---|
| 3.2.1 | Ocasião | Selecionar "Curtindo mesmo" | Card fica selecionado (cor primária). Avança automaticamente (se auto-advance implementado) OU botão "Continuar" visível | □ |
| 3.2.2 | Pessoas | Selecionar "2 pessoas" | Card selecionado | □ |
| 3.2.3 | Data | Selecionar data de hoje | Data marcada como selecionada. Dias sem turno devem estar esmaecidos | □ |
| 3.2.4 | Horários | Slots aparecem | Turnos ativos para o dia selecionado. Pelo menos Almoço/Jantar em dias úteis | □ |
| 3.2.5 | Slot | Selecionar um horário | Card selecionado, botão "Continuar" ativo | □ |
| 3.2.6 | Nome | Digitar "Teste QA" | Campo aceita texto | □ |
| 3.2.7 | WhatsApp | Digitar "(47) 99999-0001" | Máscara aplicada (se implementada). Formato final E.164 | □ |
| 3.2.8 | E-mail | Deixar vazio (opcional) | Campo aceita vazio | □ |
| 3.2.9 | Extras | Preencher ou pular seções (origem, frequência, preferências, referral) | Todos opcionais. Não bloqueia submit | □ |
| 3.2.10 | LGPD | Marcar checkbox LGPD | Obrigatório. Sem marcar, botão "Confirmar" desabilitado | □ |
| 3.2.11 | Opt-in marketing | Marcar (opcional) | Checkbox funciona | □ |
| 3.2.12 | Confirmar | Clicar "Confirmar reserva" | Loading spinner → tela de sucesso "Reserva confirmada! 🎉" | □ |
| 3.2.13 | Sucesso | Tela de sucesso | Mostra data, horário, nº pessoas. Texto "Você receberá uma confirmação no WhatsApp." | □ |
| 3.2.14 | WhatsApp | (Se WPPConnect ativo) | Mensagem de confirmação chega no número informado | □ |
| 3.2.15 | Dashboard | Abrir `/dashboard/reservas` | Reserva "Teste QA" aparece na lista do dia | □ |

### 3.3 — Validações do widget

| # | Teste | Ação | Esperado | Resultado |
|---|---|---|---|---|
| 3.3.1 | Nome vazio | Tentar avançar sem nome | Erro: "Informe seu nome" ou validação visual | □ |
| 3.3.2 | Telefone vazio | Tentar avançar sem telefone | Erro: "Informe seu WhatsApp" | □ |
| 3.3.3 | Telefone inválido | Digitar "123" | Erro de formato ou impedido de avançar | □ |
| 3.3.4 | LGPD não marcado | Tentar confirmar sem LGPD | Botão desabilitado | □ |
| 3.3.5 | Data sem turno | Selecionar dia sem turno ativo | Mensagem "Sem horários disponíveis" ou dia não clicável | □ |
| 3.3.6 | Data bloqueada | Se houver data bloqueada configurada | Data aparece como indisponível | □ |
| 3.3.7 | Voltar steps | Clicar "← Voltar" em cada step | Volta ao step anterior com dados preservados | □ |
| 3.3.8 | "Fazer outra reserva" | Na tela de sucesso | Reseta form e volta ao início | □ |

### 3.4 — Widget: idiomas

| # | Teste | Esperado | Resultado |
|---|---|---|---|
| 3.4.1 | Trocar para EN | Todos os textos mudam para inglês | □ |
| 3.4.2 | Trocar para ES | Todos os textos mudam para espanhol | □ |
| 3.4.3 | Voltar para PT | Textos restaurados em português | □ |
| 3.4.4 | Completar reserva em EN | Fluxo funciona integralmente em inglês | □ |

### 3.5 — Widget: slug inexistente

| # | Teste | Esperado | Resultado |
|---|---|---|---|
| 3.5.1 | Abrir `/r/slug-que-nao-existe` | Página 404 (notFound) | □ |

---

## 4. Testes do Dashboard — Autenticação

| # | Teste | Ação | Esperado | Resultado |
|---|---|---|---|---|
| 4.1 | Acessar `/dashboard` sem login | Abrir URL diretamente | Redirect para `/sign-in` | □ |
| 4.2 | Login com Clerk | Fazer login com credenciais de dev | Redirect para `/dashboard/reservas` ou `/dashboard` | □ |
| 4.3 | Logout | Clicar no avatar → Sign out | Volta para login | □ |
| 4.4 | Middleware protege rotas | Acessar `/dashboard/clientes` sem login | Redirect para `/sign-in` | □ |
| 4.5 | Rotas públicas liberadas | Acessar `/r/porto-cabral-bc` sem login | Widget carrega normalmente | □ |
| 4.6 | `/confirmar/[token]` público | Acessar com token válido | Página carrega sem pedir login | □ |

---

## 5. Testes do Dashboard — Visão geral

### URL: `http://localhost:3000/dashboard`

| # | Teste | Esperado | Resultado |
|---|---|---|---|
| 5.1 | Página carrega | Mostra data de hoje em português, cards de métricas | □ |
| 5.2 | Cards de métricas | Confirmadas, Check-in, Pendentes, Pessoas esperadas — valores coerentes | □ |
| 5.3 | Cards de canceladas/no-show | Valores exibidos | □ |
| 5.4 | Alertas de no-show risk | Se existirem clientes com 2+ no-shows, alerta aparece em âmbar | □ |
| 5.5 | Alertas de ocasião especial | Se existirem reservas com ocasião, alerta aparece em rosa | □ |
| 5.6 | Alertas de restrição alimentar | Se existirem, alerta aparece em vermelho | □ |
| 5.7 | Link "Ver todas" | Clicar leva para `/dashboard/reservas` | □ |
| 5.8 | Auto-refresh | Esperar 30s — dados atualizam se houve mudança | □ |

---

## 6. Testes do Dashboard — Reservas

### URL: `http://localhost:3000/dashboard/reservas`

### 6.1 — Listagem

| # | Teste | Esperado | Resultado |
|---|---|---|---|
| 6.1.1 | Lista carrega | Mostra reservas do dia atual agrupadas por status | □ |
| 6.1.2 | Grupos visuais | Seções: Check-in (verde), Confirmadas (azul), Pendentes (âmbar), Finalizadas (cinza) | □ |
| 6.1.3 | Card de reserva | Avatar com iniciais, nome, horário, nº pessoas, mesa (se atribuída), badge de status | □ |
| 6.1.4 | Contagem | "X reservas · YYYY-MM-DD" no topo | □ |
| 6.1.5 | Badge no-show serial | Se cliente tem 2+ no-shows, badge âmbar "⚠️ X no-shows" no card | □ |

### 6.2 — Filtros

| # | Teste | Ação | Esperado | Resultado |
|---|---|---|---|---|
| 6.2.1 | Filtrar por status | Clicar "Confirmadas" | Só mostra reservas confirmadas | □ |
| 6.2.2 | Filtrar "Todas" | Clicar "Todas" | Mostra todas novamente | □ |
| 6.2.3 | Busca por nome | Digitar nome no campo de busca | Filtra em tempo real | □ |
| 6.2.4 | Busca por telefone | Digitar telefone | Filtra em tempo real | □ |
| 6.2.5 | Busca sem resultado | Digitar texto que não existe | Empty state com CTA | □ |

### 6.3 — Navegação de data

| # | Teste | Ação | Esperado | Resultado |
|---|---|---|---|---|
| 6.3.1 | Avançar dia | Clicar `>` no header | Data muda, lista recarrega | □ |
| 6.3.2 | Retroceder dia | Clicar `<` no header | Data muda, lista recarrega | □ |
| 6.3.3 | Voltar para hoje | Clicar no botão de data (ou "Hoje") | Data volta para hoje | □ |

### 6.4 — Criar reserva manual

| # | Teste | Ação | Esperado | Resultado |
|---|---|---|---|---|
| 6.4.1 | Abrir formulário | Clicar "Nova reserva" | Modal/drawer abre com formulário | □ |
| 6.4.2 | Preencher campos | Nome, telefone E.164, data, partySize, LGPD | Campos aceitam input | □ |
| 6.4.3 | Salvar | Clicar botão de salvar | Reserva criada com status CONFIRMED (manual sempre confirma direto) | □ |
| 6.4.4 | Aparece na lista | Após salvar | Nova reserva visível na lista | □ |
| 6.4.5 | WhatsApp enviado | (Se WPPConnect ativo) | Confirmação de reserva chega no WhatsApp | □ |
| 6.4.6 | Alerta no-show | Usar telefone de cliente com 2+ no-shows | Banner de alerta aparece no formulário | □ |

### 6.5 — Detalhe da reserva (painel lateral)

| # | Teste | Ação | Esperado | Resultado |
|---|---|---|---|---|
| 6.5.1 | Abrir detalhe | Clicar em um card de reserva | Painel lateral abre com informações completas | □ |
| 6.5.2 | Info do hóspede | Tab "Hóspede" | Nome, telefone, e-mail, origem, frequência, preferências, restrições | □ |
| 6.5.3 | Info da reserva | Tab "Reserva" | Data, horário, pessoas, mesa, turno, garçom, origem, LGPD | □ |
| 6.5.4 | Histórico | Tab "Histórico" | Timeline de mudanças de status | □ |
| 6.5.5 | Fechar painel | Clicar X ou fora | Painel fecha | □ |

### 6.6 — Ciclo de vida de status

| # | Teste | Ação | Esperado | Resultado |
|---|---|---|---|---|
| 6.6.1 | PENDING → CONFIRMED | Clicar "Confirmar" | Status muda, badge atualiza, card move de grupo | □ |
| 6.6.2 | CONFIRMED → CHECKED_IN | Clicar "Check-in" | Status muda para Check-in (verde) | □ |
| 6.6.3 | CHECKED_IN → FINISHED | Clicar "Finalizar" | Status muda para Finalizada | □ |
| 6.6.4 | CONFIRMED → NO_SHOW | Clicar "No-show" | Status muda, counter de no-show do cliente incrementa | □ |
| 6.6.5 | CONFIRMED → CANCELLED | Clicar "Cancelar" | Status muda, WhatsApp de cancelamento enviado | □ |
| 6.6.6 | PENDING → CANCELLED | Clicar "Cancelar" | Status muda | □ |

### 6.7 — Views alternativas

| # | Teste | Esperado | Resultado |
|---|---|---|---|
| 6.7.1 | View Timeline | Clicar ícone de relógio | Mostra timeline horizontal por horário | □ |
| 6.7.2 | View Lista | Clicar ícone de lista | Volta para lista agrupada | □ |

---

## 7. Testes do Dashboard — Mesas

### URL: `http://localhost:3000/dashboard/mesas`

| # | Teste | Esperado | Resultado |
|---|---|---|---|
| 7.1 | Editor carrega | Canvas do Konva renderiza com mesas existentes | □ |
| 7.2 | Criar mesa | Adicionar nova mesa pelo editor | Mesa aparece no canvas | □ |
| 7.3 | Mover mesa | Drag-and-drop uma mesa | Posição persiste após salvar | □ |
| 7.4 | Editar mesa | Alterar nome/capacidade | Dados salvos corretamente | □ |
| 7.5 | Excluir mesa | Remover mesa | Mesa desaparece do canvas | □ |
| 7.6 | Salvar mapa | Clicar "Salvar mapa" | Toast de sucesso, dados persistidos | □ |
| 7.7 | Status visual | Mesas com reservas ativas mostram cor de status | □ |

---

## 8. Testes do Dashboard — Waitlist

### URL: `http://localhost:3000/dashboard/waitlist`

| # | Teste | Esperado | Resultado |
|---|---|---|---|
| 8.1 | Página carrega | Lista de fila de espera (pode estar vazia) | □ |
| 8.2 | Adicionar à fila | Criar entrada na waitlist | Entrada aparece com posição | □ |
| 8.3 | Notificar cliente | (Se WPPConnect ativo) Marcar como notificado | WhatsApp enviado ao cliente | □ |
| 8.4 | Cliente confirma | Mudar status para CONFIRMED | Entrada sai da waitlist, reserva é criada | □ |
| 8.5 | Cliente recusa | Mudar status para DECLINED | Entrada removida, próximo na fila notificado | □ |

---

## 9. Testes do Dashboard — Clientes

### URL: `http://localhost:3000/dashboard/clientes`

| # | Teste | Esperado | Resultado |
|---|---|---|---|
| 9.1 | Lista de clientes | Clientes criados via reservas aparecem | □ |
| 9.2 | Busca de cliente | Buscar por nome ou telefone | Resultados filtrados | □ |
| 9.3 | Detalhe do cliente | Clicar em cliente | Perfil completo: nome, telefone, tags, score, histórico de reservas | □ |
| 9.4 | Score de confiabilidade | Cliente com no-shows tem score < 100 | □ |
| 9.5 | Tags | Se auto-tags configuradas, tags aplicadas automaticamente | □ |
| 9.6 | Reserva recorrente | (Se implementado) Seção "Reserva recorrente" visível no detalhe | □ |

---

## 10. Testes do Dashboard — Configurações

### URL: `http://localhost:3000/dashboard/configuracoes`

### 10.1 — Navegação por tabs

| # | Teste | Esperado | Resultado |
|---|---|---|---|
| 10.1.1 | Tab Geral | Mostra form com nome, slug, telefone, CNPJ | □ |
| 10.1.2 | Tab Tema | Mostra campos de cor, fonte, border-radius | □ |
| 10.1.3 | Tab Turnos | Lista de turnos existentes + botão criar | □ |
| 10.1.4 | Tab Disponibilidade | Calendário de datas bloqueadas | □ |
| 10.1.5 | Tab Notificações | Templates editáveis por trigger | □ |
| 10.1.6 | Tab Pagamento | Config de pagamento antecipado (Pix) | □ |
| 10.1.7 | Tab Auto-Tags | Regras de auto-tagging | □ |
| 10.1.8 | Tab Garçons | Lista de garçons | □ |
| 10.1.9 | Tab Integração | BC Connect e outras integrações | □ |

### 10.2 — Turnos (CRUD)

| # | Teste | Ação | Esperado | Resultado |
|---|---|---|---|---|
| 10.2.1 | Criar turno | Preencher nome, início, fim, dias, capacidade | Turno criado, aparece na lista | □ |
| 10.2.2 | Editar turno | Alterar horário de um turno existente | Alteração salva | □ |
| 10.2.3 | Desativar turno | Toggle isActive para false | Turno não aparece mais no widget | □ |
| 10.2.4 | Excluir turno | Remover turno | Turno removido da lista | □ |
| 10.2.5 | Widget reflete | Após alterar turnos, verificar widget | Slots de horário atualizados | □ |

### 10.3 — Pagamento antecipado

| # | Teste | Ação | Esperado | Resultado |
|---|---|---|---|---|
| 10.3.1 | Desativado por padrão | Abrir tab Pagamento | prepayment_enabled = false | □ |
| 10.3.2 | Ativar pagamento | Ligar toggle | Campos de configuração aparecem | □ |
| 10.3.3 | Configurar valores | Definir tipo (POR_PESSOA), valor (R$50), política | Salvar com sucesso | □ |
| 10.3.4 | Widget com Pix | Fazer reserva pelo widget | Fluxo de Pix aparece (QR Code + copia-cola). **NOTA**: sem PAGARME_API_KEY real, o Pix não funciona — verificar se o fluxo degrada graciosamente | □ |
| 10.3.5 | Desativar pagamento | Desligar toggle | Fluxo volta ao normal (sem Pix) | □ |

### 10.4 — Proteção No-Show (add-on)

| # | Teste | Esperado | Resultado |
|---|---|---|---|
| 10.4.1 | Link visível | Card "Proteção No-Show" visível na página de configurações | □ |
| 10.4.2 | Abrir página | `/dashboard/configuracoes/protecao-noshow` carrega | □ |
| 10.4.3 | Toggle add-on | Ativar/desativar o add-on | Toggle funciona, toast de sucesso | □ |

---

## 11. Testes do Dashboard — Relatórios

### URL: `http://localhost:3000/dashboard/relatorios`

| # | Teste | Esperado | Resultado |
|---|---|---|---|
| 11.1 | Página carrega | Gráficos e métricas de relatório | □ |
| 11.2 | Filtro por período | Selecionar semana/mês | Dados atualizam | □ |
| 11.3 | Export CSV | Clicar botão de export | Arquivo CSV baixa com dados | □ |
| 11.4 | Export PDF | Clicar botão de export PDF | Arquivo PDF gera corretamente | □ |

---

## 12. Testes do Dashboard — Garçons

### URL: `http://localhost:3000/dashboard/garcons`

| # | Teste | Esperado | Resultado |
|---|---|---|---|
| 12.1 | Lista de garçons | Garçons cadastrados aparecem | □ |
| 12.2 | Criar garçom | Adicionar nome | Garçom criado | □ |
| 12.3 | Atribuir mesas | Associar mesas a um garçom | Atribuição salva | □ |
| 12.4 | Desativar garçom | Toggle isActive | Garçom não aparece em seleções | □ |

---

## 13. Testes do Dashboard — Hostess (PWA)

### URL: `http://localhost:3000/dashboard/hostess`

| # | Teste | Esperado | Resultado |
|---|---|---|---|
| 13.1 | Página carrega | Lista de reservas do dia atual, view mobile-friendly | □ |
| 13.2 | Cards grandes | Nome, horário, nº pessoas, badges (VIP, alergia, no-show risk) visíveis | □ |
| 13.3 | Check-in | Clicar botão "Check-in" em reserva confirmada | Status muda para CHECKED_IN, toast | □ |
| 13.4 | Finalizar | Clicar "Finalizar mesa" em reserva checked-in | Status muda para FINISHED | □ |
| 13.5 | Auto-refresh | Esperar 15s | Lista atualiza automaticamente | □ |
| 13.6 | Em mobile (viewport 375px) | Abrir via DevTools em modo mobile | Layout responsivo, cards touch-friendly | □ |

---

## 14. Testes de Notificações WhatsApp

**Pré-requisito**: WPPConnect rodando + ngrok ativo + WPPCONNECT_URL correto no `.env`

| # | Teste | Trigger | Mensagem esperada | Resultado |
|---|---|---|---|---|
| 14.1 | Reserva criada | Criar reserva (widget ou manual) | ✅ "Reserva confirmada!" com data, hora, link confirmação | □ |
| 14.2 | Lembrete 24h | Cron `/api/cron/reminders` com reserva confirmada 24h à frente | ⏰ "Lembrete de reserva" + instruções 1/2 | □ |
| 14.3 | Lembrete 2h | Cron com reserva 2h à frente | 🍽️ Lembrete 2h + instruções 1/2 | □ |
| 14.4 | Cancelamento | Cancelar reserva no dashboard | ❌ "Reserva cancelada" | □ |
| 14.5 | Pós-visita | Cron com reserva FINISHED 2-4h atrás | 🙏 "Obrigado pela visita" + link avaliação | □ |
| 14.6 | Waitlist disponível | Notificar cliente na fila | 🎉 "Mesa disponível!" | □ |

**Para testar os crons manualmente**, o dev executa:
```powershell
# No PowerShell (com o TeMesa rodando):
Invoke-WebRequest -Uri "http://localhost:3000/api/cron/reminders" -Headers @{Authorization="Bearer temesa_cron_secret_2026"} -Method GET
```

---

## 15. Testes de Notificações E-mail

**Pré-requisito**: `RESEND_API_KEY` configurado com key válida do Resend

| # | Teste | Trigger | Esperado | Resultado |
|---|---|---|---|---|
| 15.1 | Reserva com e-mail | Criar reserva informando e-mail | E-mail de confirmação enviado | □ |
| 15.2 | Reserva sem e-mail | Criar reserva SEM e-mail | Nenhum erro, apenas WhatsApp | □ |
| 15.3 | Cancelamento com e-mail | Cancelar reserva que tem e-mail | E-mail de cancelamento | □ |

---

## 16. Testes de Confirmação/Cancelamento pelo cliente

### URL: `http://localhost:3000/confirmar/[token]`

Precisa de um token válido. Criar reserva e pegar o token no banco:
```sql
SELECT "confirmToken" FROM "Reservation" ORDER BY "createdAt" DESC LIMIT 1;
```

| # | Teste | Ação | Esperado | Resultado |
|---|---|---|---|---|
| 16.1 | Página carrega | Abrir URL com token válido | Mostra detalhes da reserva + botões Confirmar/Cancelar | □ |
| 16.2 | Confirmar presença | Clicar "Confirmar" | Status muda para CONFIRMED, mensagem de sucesso | □ |
| 16.3 | Cancelar reserva | Abrir com `?action=cancel` ou clicar Cancelar | Status muda para CANCELLED | □ |
| 16.4 | Token inválido | Abrir com token inexistente | Mensagem de erro adequada | □ |
| 16.5 | Reserva já finalizada | Abrir token de reserva FINISHED | Mensagem informando que a reserva já foi concluída | □ |

---

## 17. Testes de Avaliação pós-visita

### URL: `http://localhost:3000/avaliar/[token]`

Usar o mesmo `confirmToken` de uma reserva FINISHED.

| # | Teste | Ação | Esperado | Resultado |
|---|---|---|---|---|
| 17.1 | Página carrega | Abrir URL | Mostra nome do restaurante + emojis de avaliação (😞 a 🤩) | □ |
| 17.2 | Selecionar nota | Clicar emoji "🤩" | Emoji fica selecionado, campo de comentário aparece | □ |
| 17.3 | Enviar avaliação ≥4 | Enviar com nota 4 ou 5 | "Obrigado!" + redirect para Google Reviews (se googlePlaceId configurado) | □ |
| 17.4 | Enviar avaliação ≤3 | Enviar com nota 1, 2 ou 3 | "Obrigado!" SEM redirect para Google (feedback interno) | □ |
| 17.5 | Token inválido | URL com token inexistente | Tela de carregamento ou erro gracioso | □ |

---

## 18. Testes de Webhook WPPConnect (resposta 1-toque)

**Pré-requisito**: Reserva confirmada existente para um telefone específico

Simular webhook via PowerShell:

```powershell
# Confirmar reserva (resposta "1")
$body = '{"event":"onMessage","session":"temesa","data":{"from":"5547999990001@c.us","body":"1"}}'
Invoke-WebRequest -Uri "http://localhost:3000/api/webhooks/wppconnect" -Method POST -Body $body -ContentType "application/json"

# Cancelar reserva (resposta "2")
$body = '{"event":"onMessage","session":"temesa","data":{"from":"5547999990001@c.us","body":"2"}}'
Invoke-WebRequest -Uri "http://localhost:3000/api/webhooks/wppconnect" -Method POST -Body $body -ContentType "application/json"
```

| # | Teste | Ação | Esperado | Resultado |
|---|---|---|---|---|
| 18.1 | Resposta "1" (confirmar) | Enviar webhook com body "1" | Status muda para CONFIRMED, resposta WhatsApp enviada | □ |
| 18.2 | Resposta "2" (cancelar) | Enviar webhook com body "2" | Status muda para CANCELLED, resposta WhatsApp enviada | □ |
| 18.3 | Resposta irrelevante | Enviar webhook com body "olá" | Ignorado (skipped: "not-a-reply") | □ |
| 18.4 | Telefone sem reserva | Enviar com telefone que não tem reserva | Ignorado (skipped: "no-reservation") | □ |
| 18.5 | Evento não-mensagem | Enviar com event diferente | Ignorado (skipped: true) | □ |

---

## 19. Testes dos Crons

### 19.1 — Expirar reservas pendentes de pagamento

```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/cron/expire-pending" -Headers @{Authorization="Bearer temesa_cron_secret_2026"} -Method GET
```

| # | Teste | Esperado | Resultado |
|---|---|---|---|
| 19.1.1 | Sem auth | Chamar sem header Authorization | 401 Unauthorized | □ |
| 19.1.2 | Auth incorreta | Chamar com Bearer errado | 401 Unauthorized | □ |
| 19.1.3 | Auth correta | Chamar com Bearer correto | 200 OK, JSON com contagem | □ |
| 19.1.4 | Expiração real | Criar reserva PENDING_PAYMENT com expiresAt no passado, rodar cron | Reserva muda para CANCELLED | □ |

### 19.2 — Lembretes

```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/cron/reminders" -Headers @{Authorization="Bearer temesa_cron_secret_2026"} -Method GET
```

| # | Teste | Esperado | Resultado |
|---|---|---|---|
| 19.2.1 | Resposta | 200 OK com `{ reminder24h, reminder2h, postVisit }` | □ |
| 19.2.2 | Idempotência | Chamar 2x seguidas | Segundo call: 0 enviados (já marcados) | □ |

### 19.3 — Reservas recorrentes

```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/cron/recurring" -Headers @{Authorization="Bearer temesa_cron_secret_2026"} -Method GET
```

| # | Teste | Esperado | Resultado |
|---|---|---|---|
| 19.3.1 | Sem recorrências | JSON: `{ ok: true, created: 0 }` | □ |
| 19.3.2 | Com recorrência ativa | Criar recorrência, rodar cron | Reserva criada para próximo dia correspondente | □ |
| 19.3.3 | Não duplica | Rodar cron 2x | Não cria reserva duplicada | □ |

---

## 20. Testes de Onboarding

### URL: `http://localhost:3000/onboarding`

**ATENÇÃO**: Testar com conta que NÃO tem restaurante. Ou criar conta nova no Clerk.

| # | Teste | Ação | Esperado | Resultado |
|---|---|---|---|---|
| 20.1 | Página carrega | Acessar `/onboarding` | Wizard com 4 steps, Step 1 ativo | □ |
| 20.2 | Tipo de estabelecimento | Selecionar "Bar" | Card fica selecionado | □ |
| 20.3 | Preencher nome | "Teste Bar QA" | Campo aceita | □ |
| 20.4 | Preencher slug | "teste-bar-qa" | Validação: apenas letras minúsculas, números e hífens | □ |
| 20.5 | Slug duplicado | Tentar "porto-cabral-bc" (já existe) | Erro de duplicidade | □ |
| 20.6 | Preencher telefone | "+5547999990002" | Campo aceita | □ |
| 20.7 | Criar restaurante | Clicar botão de criar | Restaurante criado, avança para Step 2 | □ |
| 20.8 | Defaults criados | (Se implementado) Turnos e mesas pré-criados com base no tipo | □ |
| 20.9 | Pular steps | Pular passos 2-4 | Chega na tela final "Tudo pronto!" com confetti | □ |
| 20.10 | Redirect | Após "Tudo pronto!" | Redirect para `/dashboard/reservas` | □ |
| 20.11 | Widget funciona | Abrir `/r/teste-bar-qa` | Widget carrega (pode não ter turnos se pulou) | □ |

**Limpar após teste:**
```sql
-- Remover restaurante de teste (executar no Supabase SQL Editor)
DELETE FROM "Restaurant" WHERE slug = 'teste-bar-qa';
```

---

## 21. Testes de Responsividade

Abrir Chrome DevTools → Device Toolbar → testar em:

| Viewport | Dispositivo simulado |
|---|---|
| 375×812 | iPhone 13 |
| 390×844 | iPhone 14 |
| 360×740 | Android médio |
| 768×1024 | iPad |
| 1440×900 | Desktop |

### 21.1 — Widget

| # | Viewport | Teste | Esperado | Resultado |
|---|---|---|---|---|
| 21.1.1 | 375px | Widget carrega | Todos os steps visíveis sem scroll horizontal | □ |
| 21.1.2 | 375px | Grade de datas | 7 colunas cabem na tela | □ |
| 21.1.3 | 375px | Cards de ocasião | Grid 2 colunas, cards clicáveis com touch target ≥44px | □ |
| 21.1.4 | 375px | Tela de sucesso | Resumo legível, botões acessíveis | □ |
| 21.1.5 | 768px | Widget em iframe | Renderiza corretamente dentro de iframe 480px | □ |

### 21.2 — Dashboard

| # | Viewport | Teste | Esperado | Resultado |
|---|---|---|---|---|
| 21.2.1 | 375px | Sidebar | Escondido. Bottom nav aparece (se implementado) | □ |
| 21.2.2 | 375px | Header | Data navigator funcional. Seletor de turno pode estar escondido | □ |
| 21.2.3 | 375px | Lista de reservas | Cards full-width, legíveis | □ |
| 21.2.4 | 375px | Detalhe de reserva | Painel lateral vira fullscreen ou drawer | □ |
| 21.2.5 | 768px | Sidebar | Visível mas pode estar colapsado | □ |
| 21.2.6 | 1440px | Layout completo | Sidebar + lista + detalhe lado a lado | □ |

---

## 22. Testes de Segurança e LGPD

| # | Teste | Como verificar | Esperado | Resultado |
|---|---|---|---|---|
| 22.1 | Rate limit no widget | Fazer 60+ requests rápidos ao `getAvailableSlots` | Erro 429 "Muitas requisições" | □ |
| 22.2 | Tenant isolation | Acessar reservas de outro restaurante via tRPC (alterar restaurantId) | Erro de autorização ou sem dados | □ |
| 22.3 | LGPD consent obrigatório | Tentar criar reserva pelo widget sem marcar LGPD | Impedido | □ |
| 22.4 | X-Frame-Options widget | Verificar headers de `/r/porto-cabral-bc` | `X-Frame-Options: ALLOWALL`, `Content-Security-Policy: frame-ancestors *` | □ |
| 22.5 | X-Frame-Options dashboard | Verificar headers de `/dashboard` | `X-Frame-Options: SAMEORIGIN` | □ |
| 22.6 | Cron sem auth | Chamar `/api/cron/reminders` sem header | 401 | □ |
| 22.7 | Token de confirmação | Usar token válido em navegação anônima | Funciona (rota é pública) | □ |

**Para verificar headers:**
```powershell
(Invoke-WebRequest -Uri "http://localhost:3000/r/porto-cabral-bc" -Method HEAD).Headers
```

---

## 23. Testes de Performance

| # | Teste | Métrica | Aceitável | Resultado |
|---|---|---|---|---|
| 23.1 | Widget — First Contentful Paint | DevTools → Lighthouse | <2s em 3G | □ |
| 23.2 | Widget — Time to Interactive | DevTools → Lighthouse | <4s em 3G | □ |
| 23.3 | Dashboard — Carregamento inicial | Observar loading spinner | <3s em WiFi | □ |
| 23.4 | Lista de reservas — 50 itens | Criar 50 reservas, carregar lista | Renderiza sem lag perceptível | □ |
| 23.5 | Build size | `pnpm build` output | First Load JS < 200kB ideal, < 350kB aceitável | □ |

---

## 24. Testes unitários

**Comando para o dev:**
```powershell
pnpm test
```

| # | Teste | Esperado | Resultado |
|---|---|---|---|
| 24.1 | `reliabilityScore` — nenhum no-show | Score = 100 | □ |
| 24.2 | `reliabilityScore` — 100% no-show | Score = 0 | □ |
| 24.3 | `reliabilityScore` — misto | Score entre 0 e 100 | □ |
| 24.4 | `confirmTokenExpiresAt` | Retorna data + 2h | □ |

---

## 25. Checklist final de produção

Antes de fazer deploy para produção, verificar:

```
□ pnpm type-check — zero erros
□ pnpm build --webpack — completa sem erros
□ pnpm test — todos passam
□ .env — WPPCONNECT_URL aponta para ngrok ativo (ou URL de produção)
□ .env — RESEND_API_KEY preenchido
□ .env — NEXT_PUBLIC_APP_URL = URL de produção (não localhost)
□ .env — DATABASE_URL aponta para Supabase correto
□ Widget funciona em iframe de outro domínio
□ WhatsApp: mensagem de confirmação chega
□ WhatsApp: resposta "1" confirma, "2" cancela
□ Crons configurados no cron-job.org
□ Supabase Realtime habilitado na tabela Reservation
□ PostHog: NEXT_PUBLIC_POSTHOG_KEY preenchido (ou vazio = desabilitado, ok)
□ Prisma generate atualizado (schema bate com banco)
□ Sem console.log de debug esquecido (buscar no código)
```

---

## Formato de relatório de bugs

Ao encontrar um bug, registrar assim:

```
### BUG-[NÚMERO]
**Severidade**: Crítico / Alto / Médio / Baixo
**Seção do teste**: (ex: 3.2.12)
**Passos para reproduzir**:
1. ...
2. ...
3. ...
**Esperado**: ...
**Aconteceu**: ...
**Screenshot**: (se aplicável)
**Console errors**: (copiar erros do DevTools Console)
**Ambiente**: localhost / produção / mobile / desktop
```

---

> Documento de testes gerado em abril 2026.
> Cobrir no mínimo as seções 2-6, 14 e 16 antes de qualquer deploy.
> Seções 7-13 são importantes mas podem ser testadas após o go-live.
