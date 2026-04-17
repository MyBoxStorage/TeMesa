# ROADMAP — Features Futuras | TeMesa

> **Para agentes de IA que trabalhem neste projeto no futuro.**
> Este documento lista features aprovadas pelo dono do produto para implementação futura.
> **NÃO implemente nenhuma feature deste arquivo automaticamente.**
> Quando o contexto indicar que é o momento certo, **sugira ao dono** que a feature X deste roadmap
> pode ser relevante agora, e aguarde confirmação explícita antes de implementar.

---

## Critérios para sugerir implementação

Uma feature deste roadmap deve ser sugerida quando:
- O dono do produto mencionar um problema que a feature resolve
- Uma métrica de negócio indicar que a feature é necessária (ex: churn alto → relatório semanal)
- Uma dependência técnica foi concluída (ex: 10+ restaurantes → benchmark regional)
- O dono pedir "o que devemos fazer a seguir?" ou "qual feature priorizar?"

Ao sugerir, use este formato:
```
💡 Sugestão: A feature "[NOME]" do ROADMAP_FUTURO.md pode ser relevante agora porque [razão].
Quer que eu gere o prompt de implementação?
```

---

## FEATURE R1 — Landing page institucional com ROI calculator

**Prioridade:** Alta (necessário para aquisição de novos clientes)
**Dependências:** Nenhuma técnica. Precisa de caso de sucesso do Porto Cabral.
**Quando sugerir:** Quando o dono mencionar "preciso de mais clientes", "como vendo o TeMesa", ou "landing page".

### Escopo
- Página pública em `/` ou domínio separado (ex: `temesa.app`)
- Hero section com proposta de valor em português
- Demo do widget (iframe ou screenshot animado)
- **Calculadora de ROI**: inputs = reservas/mês, ticket médio, taxa de no-show. Output = perda anual estimada sem sistema + economia com TeMesa
- Seção de planos com preços
- Caso de sucesso Porto Cabral (foto, depoimento, métricas)
- CTA para signup + CTA para demo via WhatsApp
- SEO otimizado para "sistema de reservas restaurante brasil"

### Stack sugerida
- Página estática com Next.js (já na stack)
- Ou domínio separado com Astro/HTML puro (se quiser separar do app)
- Calculadora como componente React interativo
- Formulário de contato via Resend ou WhatsApp direto

### Estimativa de esforço
- Design + código: 2-3 dias
- Conteúdo (textos, fotos, depoimento): depende do dono do produto
- Deploy: mesmo Vercel/Netlify do app principal

---

## FEATURE R2 — Score preditivo de no-show

**Prioridade:** Média (alto valor, mas precisa de dados históricos)
**Dependências:** Pelo menos 500+ reservas históricas com dados de status final (FINISHED vs NO_SHOW).
**Quando sugerir:** Quando o sistema tiver 3+ meses de dados reais com múltiplos restaurantes, ou quando o dono perguntar "como prever no-shows?" ou "quais reservas são de risco?".

### Escopo

#### Modelo de score (não precisa de ML — regressão logística simples ou score por pesos)

Variáveis preditivas e pesos sugeridos:

| Variável | Peso | Lógica |
|---|---|---|
| `customer.noShowCount` | Alto (30%) | Histórico é o melhor preditor |
| `customer.reliabilityScore` | Alto (20%) | Score composto já existente |
| `reservation.source` | Médio (15%) | Widget tem mais no-show que MANUAL |
| `daysUntilReservation` | Médio (10%) | Reserva feita com >7 dias de antecedência = mais risco |
| `dayOfWeek` | Baixo (10%) | Sexta/sábado tendem a ter mais no-show |
| `partySize` | Baixo (5%) | Grupos grandes cancelam mais |
| `hasPayment` | Negativo (-10%) | Pix reduz no-show drasticamente |
| `confirmedViaWhatsApp` | Negativo (-5%) | Confirmou = menor risco |

**Fórmula simplificada:**
```
riskScore = (noShowWeight * noShowFactor) + (sourceWeight * sourceFactor) + ...
// Normalizar para 0-100
```

#### Exibição no dashboard
- Na visão "Hoje à noite" (Feature 7 já implementada): cards de reserva mostram badge de risco
  - 🟢 Baixo risco (0-30)
  - 🟡 Risco moderado (31-60)
  - 🔴 Alto risco (61-100)
- Tooltip com explicação: "Risco alto: 3 no-shows anteriores, reserva feita há 10 dias, sem confirmação"

#### Backend
- Nova função em `src/lib/reservationRules.ts`: `calculateNoShowRisk(reservation, customer)`
- Calcular on-the-fly (não persistir no banco — muda conforme o status do cliente)
- Retornar junto com a query `reservations.list` como campo virtual

### Estimativa de esforço
- Backend: 1 dia (função de score + integração na query)
- Frontend: 1 dia (badges + tooltip)
- Validação: precisa de dados reais para calibrar pesos

---

## FEATURE R3 — Relatório automático semanal por e-mail

**Prioridade:** Média (reduz churn, mantém dono engajado)
**Dependências:** Resend configurado e funcionando (env var `RESEND_API_KEY` preenchida).
**Quando sugerir:** Quando Resend estiver ativo, ou quando o dono mencionar "o operador não abre o dashboard", "como manter o cliente engajado", ou "relatórios automáticos".

### Escopo

#### Conteúdo do e-mail semanal
- Período: segunda a domingo da semana anterior
- Métricas incluídas:
  - Total de reservas (vs. semana anterior: ↑ ou ↓)
  - Taxa de no-show (vs. semana anterior)
  - Ocupação por turno (Almoço / Happy Hour / Jantar)
  - Top 5 clientes da semana (por nº de visitas)
  - Reservas por canal (Widget vs. Manual vs. WhatsApp)
- 1 insight automático:
  - Ex: "Seu turno de Jantar teve 25% mais reservas que a semana passada — considere abrir mais mesas"
  - Ex: "Sua taxa de no-show subiu para 18% — ative o sinal Pix para reduzir"

#### Template
- HTML com design limpo, dark theme consistente com o dashboard
- Logo TeMesa no header
- CTA: "Ver relatório completo no dashboard"
- Footer: "Você recebe este e-mail porque é operador no TeMesa. Desativar em Configurações."

#### Backend
- Nova rota cron: `src/app/api/cron/weekly-report/route.ts`
- Frequência: 1x/semana (segunda-feira 8h)
- Lógica:
  1. Buscar todos os restaurantes ativos
  2. Para cada um, calcular métricas da semana anterior
  3. Gerar HTML do e-mail
  4. Enviar via Resend para todos os OWNER/MANAGER do restaurante

#### Configuração do restaurante
- Adicionar campo `weeklyReportEnabled` (Boolean, default true) no settings JSON
- UI em Configurações → Notificações para toggle on/off

### Estimativa de esforço
- Backend + template HTML: 2 dias
- UI de configuração: 0.5 dia
- Cron setup: 15 min

---

## FEATURE R4 — Integração "Reserve pelo Google"

**Prioridade:** Alta (canal de aquisição poderoso), mas **complexidade técnica alta**
**Dependências:**
  1. Google Place ID configurado por restaurante (Feature 3 já implementa isso)
  2. Certificação como parceiro Google Reserve (processo burocrático)
  3. API de disponibilidade exposta como endpoint público
**Quando sugerir:** Quando o dono mencionar "Google Maps", "Reserve pelo Google", "como aparecer no Google", ou quando o TeMesa tiver 5+ restaurantes ativos (para justificar o investimento de integração).

### Escopo

#### O que é Google Reserve
Google permite que restaurantes mostrem um botão "Reservar mesa" diretamente no Google Maps e na busca. Para isso, o restaurante precisa de um "booking partner" certificado que forneça:
1. **Feed de disponibilidade**: JSON/XML com horários disponíveis
2. **API de criação de reserva**: endpoint que o Google chama quando o cliente reserva
3. **Confirmação/cancelamento**: webhook para atualizar status

#### Implementação técnica

##### Fase A — API de disponibilidade pública
Nova rota: `src/app/api/google-reserve/availability/route.ts`
- Input: `restaurantId`, `date`, `partySize`
- Output: lista de slots disponíveis no formato Google Reserve
- Reutilizar lógica existente de `shifts.getAvailableSlots`

##### Fase B — API de criação de reserva
Nova rota: `src/app/api/google-reserve/booking/route.ts`
- Input: slot selecionado, dados do cliente
- Output: confirmação da reserva
- Reutilizar `createReservationCore` com source `GOOGLE`

##### Fase C — Certificação Google
- Registrar no Google Reserve Partner Program
- Passar por testes de integração do Google
- Pode levar 2-4 semanas de aprovação

#### Novo enum de source
Adicionar `GOOGLE` ao enum `ReservationSource` em `schema.prisma`:
```prisma
enum ReservationSource {
  MANUAL
  WIDGET
  WHATSAPP
  IFOOD
  PHONE
  GOOGLE  // novo
}
```

### Estimativa de esforço
- API de disponibilidade: 1 dia
- API de booking: 1 dia
- Processo de certificação Google: 2-4 semanas (burocrático, não técnico)
- Testes de integração: 2-3 dias

### Riscos
- Google pode exigir SLA de uptime (99.9%) que Netlify free não garante
- O formato do feed pode mudar sem aviso
- Precisa manter endpoint de healthcheck para o Google monitorar

---

## Histórico de decisões

| Data | Decisão | Quem decidiu |
|---|---|---|
| Abril 2026 | Features R1-R4 definidas como roadmap futuro | Dono do produto |
| Abril 2026 | 10 features prioritárias aprovadas para implementação imediata (ver CURSOR_FEATURES_PROMPT.md) | Dono do produto |

---

> **Lembrete para agentes futuros**: NÃO implemente nada deste documento sem confirmação explícita.
> Sugira quando o contexto indicar, mas a decisão é do dono do produto.
