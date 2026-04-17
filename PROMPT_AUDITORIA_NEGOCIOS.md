# PROMPT — Auditoria Estratégica de Produto | TeMesa
> Cole este prompt integralmente em uma conversa com Claude Opus.
> As skills instaladas no seu Claude (jobs-to-be-done, business-health-diagnostic,
> customer-journey-map, porters-five-forces, pricing-strategy,
> saas-economics-efficiency-metrics, saas-revenue-growth-metrics, product-strategy,
> swot-analysis, value-proposition, positioning-statement, finance-metrics-quickref)
> devem estar ativas. O agente NÃO implementa nada nesta etapa — apenas audita e propõe.

---

## Instruções de uso das skills — LEIA ANTES DE RESPONDER

Você tem acesso a um conjunto de skills especializadas de produto e negócio.
**Antes de começar a análise, invoque cada skill relevante explicitamente** na ordem
abaixo e aplique seus frameworks ao contexto do TeMesa.

Execute nesta sequência obrigatória:

### ETAPA 1 — Entenda os jobs reais
Invoque a skill `jobs-to-be-done`.
Aplique o framework JTBD para mapear os **jobs funcionais, emocionais e sociais**
que tanto o **restaurante** quanto o **hóspede** estão tentando realizar.
Identifique os concorrentes não-óbvios (planilha + WhatsApp manual, garçom de papel,
iFood como substituto de reservas, etc.).
Liste os jobs que o TeMesa ainda não está cumprindo ou está cumprindo mal.

### ETAPA 2 — Diagnostique a saúde do negócio
Invoque a skill `business-health-diagnostic`.
Com base nos dados disponíveis (1 cliente em produção, planos de R$0 a R$799,
sem métricas de churn ainda), aplique o diagnóstico de saúde de SaaS.
Identifique red flags, alavancas de crescimento e o que precisa ser medido urgentemente.

### ETAPA 3 — Mapeie a jornada completa
Invoque a skill `customer-journey-map`.
Crie dois mapas de jornada:
- **Jornada do hóspede**: do momento que pensa em sair para jantar até 2 dias depois da visita
- **Jornada do operador**: do onboarding até uso diário 6 meses depois

Para cada etapa, identifique: o que a pessoa pensa/sente/faz, os pontos de dor,
os momentos de prazer e as oportunidades que o TeMesa está perdendo.

### ETAPA 4 — Analise as forças competitivas
Invoque a skill `porters-five-forces`.
Aplique Porter's Five Forces ao mercado de software de reservas para restaurantes no Brasil.
Considere: WhatsApp/planilha como substitutos, iFood como ameaça de entrada, restaurantes
como compradores com baixo poder de tech, Clerk/Supabase/Z-API como fornecedores.
Conclua com qual força representa o maior risco e a maior oportunidade para o TeMesa.

### ETAPA 5 — Questione o modelo de preços
Invoque a skill `pricing-strategy`.
Analise os planos atuais (Gratuito R$0 / Essencial R$199 / Profissional R$399 /
Rede R$799 / Enterprise consulta) com base em:
- Willingness-to-pay de restaurantes brasileiros de diferentes portes
- Se o freemium (50 reservas/mês) é isca ou desperdício
- Quais funcionalidades deveriam ser add-ons cobrados separadamente
- Se há um plano "missing" que capturaria um segmento importante

### ETAPA 6 — Avalie métricas de crescimento e eficiência
Invoque as skills `saas-revenue-growth-metrics` e `saas-economics-efficiency-metrics`.
Defina quais métricas o TeMesa deveria estar rastreando hoje (MRR, churn, NRR, CAC,
LTV, payback period) e o que os dados atuais sugerem sobre o caminho para escala.
Proponha benchmarks realistas para um SaaS vertical brasileiro neste estágio.

### ETAPA 7 — Construa a estratégia de produto
Invoque a skill `product-strategy`.
Use o 9-section Product Strategy Canvas para estruturar uma visão clara:
visão, segmentos prioritários, proposta de valor central, trade-offs conscientes,
métricas de sucesso, motor de crescimento, capacidades necessárias e defensibilidade.

### ETAPA 8 — SWOT com dentes
Invoque a skill `swot-analysis`.
Faça um SWOT que vai além do óbvio — cada quadrante deve ter pelo menos
3 itens não-genéricos, específicos para o contexto do TeMesa no mercado brasileiro.
Termine com recomendações acionáveis por quadrante.

---

## O projeto: TeMesa

TeMesa é um SaaS brasileiro de gestão de reservas e relacionamento com clientes para
restaurantes, bares, lounges e espaços de eventos. Alternativa ao SevenRooms, construída
100% para o mercado brasileiro: Pix nativo, WhatsApp Business, LGPD, preços em reais.

### Stack
Next.js 14+ · Tailwind + shadcn/ui · tRPC + Prisma + PostgreSQL (Supabase)
Clerk (auth multi-tenant) · Z-API (WhatsApp) · Pagar.me (Pix) · Resend · Netlify

### O que já funciona em produção

**Widget público `/r/[slug]`** — 7 passos: welcome → ocasião → agendamento → identidade
→ perfil → preferências → indicação. Seleção de grupo por faixas, grade de 14 dias,
slots de 1h por turno (Almoço/Happy Hour/Jantar), coleta de ocasião especial, origem
(local/turista/temporada), frequência de visita, preferências de consumo, restrições
alimentares, como conheceu o restaurante, LGPD + optin marketing. PT/EN/ES. Pix opcional.

**Dashboard `/dashboard`** — Gestão de reservas (filtros, painel lateral, ciclo de vida
completo), mapa de mesas drag-and-drop, CRM com score de confiabilidade por no-shows,
waitlist com notificação WhatsApp, relatórios de ocupação/canal/top-clientes, export CSV/PDF.
Configurações: turnos, tema, datas bloqueadas, notificações, pagamento, auto-tags, garçons.

**Notificações automáticas** — WhatsApp + e-mail: reserva criada, lembretes 24h/2h,
pagamento, waitlist, pós-visita, cancelamento. Templates editáveis com variáveis dinâmicas.

### Modelo de dados
- **Restaurant**: slug, timezone, themeConfig, operatingHours, settings.blockedDates, prepaymentConfig, plan
- **Shift**: name, startTime, endTime, daysOfWeek, maxCapacity, turnDuration
- **Reservation**: partySize, date, shiftId, status (PENDING/PENDING_PAYMENT/CONFIRMED/CHECKED_IN/FINISHED/NO_SHOW/CANCELLED), occasion, source (MANUAL/WIDGET/WHATSAPP/IFOOD/PHONE), originType, visitFrequency, consumptionPreferences, dietaryRestrictions, referralSource, optinMarketing, lgpdConsent
- **Customer**: tags, preferences (JSON), noShowCount, visitCount, reliabilityScore
- **Table**: capacity, minCapacity, area, shape, status

### Planos
| Plano | Preço | Reservas/mês | Diferencial |
|---|---|---|---|
| Gratuito | R$0 | 50 | Sem pagamento antecipado |
| Essencial | R$199 | 300 | Pix habilitado |
| Profissional | R$399 | Ilimitado | Analytics avançado |
| Rede | R$799 | Ilimitado | Até 5 restaurantes |
| Enterprise | Consulta | Ilimitado | White-label, SLA |

### Contexto de mercado
- **1 cliente real em produção**: bar/restaurante em Balneário Camboriú (SC)
- **Mercado-alvo**: restaurantes, bares e lounges brasileiros de todos os portes
- **Concorrentes diretos**: SevenRooms (caro/inglês), iFood Reservas (limitado)
- **Concorrente real**: planilha + WhatsApp manual (80% do mercado ainda usa isso)
- **Integrações ativas**: BC Connect (CRM local de BC), Z-API webhooks, Pagar.me webhooks

---

## Sua tarefa de auditoria

Após executar todas as 8 etapas de skills acima, sintetize os achados em ideias de melhoria.
Pense como alguém que comprou o TeMesa hoje e tem 6 meses para torná-lo líder no Brasil.

Para cada ideia, use este formato:

```
### [CATEGORIA] Nome da ideia
**Skill que embasou esta ideia:** (ex: jobs-to-be-done, porters-five-forces, etc.)
**Impacto no negócio:** Alto / Médio / Baixo
**Complexidade técnica:** Alta / Média / Baixa
**Urgência:** Agora / 30 dias / 90 dias / Futuro
**O job não cumprido ou dor que resolve:**
**Como funciona na prática:**
**Por que é diferenciador no Brasil:**
**Risco ou cuidado:**
```

As categorias são:
1. Gaps críticos de produto (o que falta que bloqueia conversão)
2. Receita imediata (upsell, add-ons, novos planos)
3. Diferenciação competitiva (o que SevenRooms não tem para o Brasil)
4. Experiência do hóspede (antes/durante/depois da visita)
5. Experiência do operador (gerente, hostess, garçom)
6. Inteligência de dados (insights, predições, benchmarks)
7. Viralidade e crescimento (como cada reserva gera a próxima)

**Gere pelo menos 25 ideias**, distribuídas pelas 7 categorias.
Vá fundo. Use os frameworks das skills para fundamentar cada ideia — não aceite
outputs genéricos de "adicionar notificações" ou "melhorar UX". Cada ideia deve ter
uma ligação clara com um job não cumprido, uma força competitiva ou uma métrica de negócio.

---

## Após listar as ideias

Adicione duas seções finais:

### Top 5 — O que implementar primeiro
Os 5 itens que você priorizaria dado: 1 cliente em produção, equipe pequena (1-2 devs),
necessidade de crescer MRR nos próximos 90 dias. Justifique com base nos frameworks
das skills que você usou.

### Mapa de dependências
Quais ideias dependem de outras para funcionar? Quais criam fundação para várias outras?
Apresente como uma lista de blocos de construção na ordem lógica de implementação.

---

## Fase 2 — Geração do prompt para o Cursor

Quando o dono do produto revisar e me confirmar quais ideias aprovar,
gere um **prompt completo e ultra-detalhado para o agente Cursor** contendo:

- Arquivo exato a modificar com localização precisa (linha/bloco)
- Código completo a inserir ou substituir (sem omissões)
- Novos arquivos a criar com conteúdo 100% completo
- Mudanças no `schema.prisma` + SQL equivalente para rodar no Supabase
- Variáveis de ambiente novas necessárias (se houver)
- Checklist de verificação pós-implementação (`pnpm build` deve passar)

O prompt para o Cursor deve ser **totalmente autocontido** — zero perguntas,
zero decisões de arquitetura deixadas em aberto.
