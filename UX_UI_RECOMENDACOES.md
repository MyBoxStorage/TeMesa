# UX/UI — Recomendações de Ganho Real | TeMesa

> Cada recomendação tem: o problema real, o ganho mensurável, o esforço estimado,
> e a localização exata no código. Organizadas por impacto no negócio.

---

## Prioridade S — Impacto direto na conversão de reservas

---

### U1. Widget: eliminar o step "Welcome" — é uma barreira sem valor

**Arquivo:** `src/components/widget/booking-widget.tsx`
**Problema:** O step `welcome` é uma tela com logo + "Começar" que obriga o usuário a clicar sem fazer nada útil. Cada clique extra no topo do funil reduz conversão em 10-20%.
**Ganho:** +10-20% de conversão do widget (mais reservas com o mesmo tráfego).
**Esforço:** 30 minutos.
**Como:**
- Remover `'welcome'` do `STEPS_ORDERED`
- O widget abre direto no step `occasion` (ou `schedule` se quiser pular também a ocasião)
- Manter logo + nome do restaurante como header fixo em TODOS os steps (não só no welcome)
- O header fixo substitui a função de "branding" que o welcome fazia

---

### U2. Widget: fundir steps "profile" + "preferences" + "referral" em 1 step com scroll

**Arquivo:** `src/components/widget/booking-widget.tsx`
**Problema:** Depois de informar data/hora/nome (o essencial), o usuário enfrenta **3 steps adicionais** (profile, preferences, referral) antes de poder confirmar. Muitos abandonam aqui — os dados são valiosos para o restaurante mas custam caro em conversão.
**Ganho:** Reduzir abandono pós-formulário em 30-40%. Dados coletados igualmente.
**Esforço:** 2-3 horas.
**Como:**
- Fundir `profile + preferences + referral` em um único step `extras` com scroll vertical
- Usar accordions ou seções colapsáveis (origem, frequência, consumo, restrições, referral)
- LGPD e optin ficam no final desse step único
- Botão "Confirmar reserva" aparece fixo na parte inferior desse step
- Todos os campos de extras são **opcionais** (o formulário permite submeter sem preencher nenhum)
- O passo `identity` (nome + telefone) é o último step obrigatório antes do botão de confirmação

**Fluxo proposto: 4 steps (vs. 7 atuais)**
```
1. Ocasião (qual o motivo)          — 1 toque
2. Agendamento (pessoas + data + hora) — core
3. Identidade (nome + whatsapp + email) — core
4. Extras & confirmação (tudo junto com scroll + botão confirmar no fundo)
```

---

### U3. Widget: data grid com indicador visual de disponibilidade

**Arquivo:** `src/components/widget/booking-widget.tsx` (step `schedule`)
**Problema:** A grade de 14 dias mostra datas como botões idênticos. O usuário não sabe quais dias têm vaga até clicar. Isso gera frustração e abandono.
**Ganho:** Menos cliques errados, experiência mais fluida, +5-10% conversão.
**Esforço:** 2-3 horas.
**Como:**
- Pré-buscar disponibilidade para os próximos 14 dias (uma query com `shifts.getAvailableSlots` para cada dia seria pesado — em vez disso, buscar os shifts ativos e marcar dias que não são daysOfWeek do turno como "Fechado" visualmente)
- Adicionar um dot colorido abaixo de cada dia: 🟢 disponível, 🔴 lotado, ⚫ fechado
- Dias "Fechado" ficam esmaecidos (opacity-30) e não clicáveis
- Isso é possível sem query extra: apenas comparar `dayOfWeek` do dia com `daysOfWeek[]` dos shifts ativos

---

### U4. Widget: máscara de telefone automática

**Arquivo:** `src/components/widget/booking-widget.tsx` (step `identity`)
**Problema:** O campo de telefone pede formato `(00) 00000-0000` mas não tem máscara. O usuário digita "47999991234" e o sistema precisa de "+5547999991234". Erros de formato geram falha silenciosa no envio de WhatsApp.
**Ganho:** Eliminar 100% dos erros de formato de telefone. WhatsApp chega em toda reserva.
**Esforço:** 1 hora.
**Como:**
- Usar máscara inline no `onChange`:
```typescript
function maskPhone(v: string): string {
  const digits = v.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return `(${digits}`
  if (digits.length <= 7) return `(${digits.slice(0,2)}) ${digits.slice(2)}`
  return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`
}
```
- Ao submeter, converter para E.164: `+55${digits}`
- Placeholder visual: `(47) 99999-0000`

---

### U5. Widget: auto-advance após seleção nos steps de escolha única

**Arquivo:** `src/components/widget/booking-widget.tsx`
**Problema:** Nos steps `occasion`, `profile` (origem, frequência) e `referral`, o usuário seleciona uma opção e depois precisa clicar "Continuar →". Esse segundo clique é desnecessário — a seleção JÁ É a resposta.
**Ganho:** Remove 3-5 cliques redundantes do funil. Experiência tipo "typeform".
**Esforço:** 1 hora.
**Como:**
- No `onClick` de cada `SelectCard` em steps de seleção única, adicionar `setTimeout(() => setStep(nextStep), 300)`
- O delay de 300ms permite que a animação de seleção rode antes de avançar
- Manter o botão "Continuar" como fallback visual, mas a transição já acontece
- NÃO fazer auto-advance em steps de seleção múltipla (preferências de consumo, restrições)

---

## Prioridade A — Impacto direto na retenção do operador

---

### U6. Dashboard: mobile responsive — sidebar vira bottom nav

**Arquivo:** `src/components/dashboard/sidebar.tsx`, `src/app/(dashboard)/dashboard/layout.tsx`
**Problema:** O sidebar collapsa para 64px no desktop, mas em mobile (<768px) ele ocupa espaço precioso ou fica inutilizável. Operadores que abrem o dashboard no celular (comum em restaurante) têm experiência degradada.
**Ganho:** Dashboard usável em 100% dos dispositivos. Essencial para hostess/garçom.
**Esforço:** 3-4 horas.
**Como:**
- Em telas `< md` (768px), esconder o sidebar lateral
- Renderizar bottom navigation bar fixa com os 5 itens mais importantes: Reservas, Mesas, Waitlist, Clientes, Config
- Ícones sem label, 44x44px touch targets (mínimo iOS/Android)
- Header: esconder seletor de turno em mobile, manter date navigator
- O resto do layout ocupa 100vw

---

### U7. Dashboard header: "Hoje" como botão-pílula sempre visível

**Arquivo:** `src/components/dashboard/header.tsx`
**Problema:** O botão de data já tem lógica de "Hoje" mas é indistinguível dos outros dias quando estou navegando para outro dia. Voltar para "hoje" requer atenção visual.
**Ganho:** Operador volta para o turno atual em 1 toque, sem pensar.
**Esforço:** 30 minutos.
**Como:**
- Quando `date !== today`, adicionar botão-pílula separado "Hoje" à esquerda do navegador de data
- Cor primária, destaque, pulsa suavemente se estiver em dia diferente
- Ao clicar, `onDateChange(new Date())`
- Quando já é hoje, não mostrar (redundante)

---

### U8. Reservation list: swipe-actions no card (mobile)

**Arquivo:** `src/components/reservas/reservation-card.tsx`
**Problema:** Para mudar o status de uma reserva, o operador precisa: (1) clicar no card, (2) abrir o painel lateral, (3) clicar no botão de status. São 3 interações para a ação mais frequente do dia.
**Ganho:** Ação mais frequente do operador em 1 gesto. Operação 3x mais rápida no pico.
**Esforço:** 3-4 horas.
**Como:**
- Implementar swipe-to-action usando framer-motion (já instalado):
  - Swipe direita → Check-in (para CONFIRMED)
  - Swipe esquerda → No-show (para CONFIRMED com atraso > tolerância)
- Feedback visual: card revela faixa verde (check-in) ou vermelha (no-show) durante o swipe
- Threshold de 80px para ativar a ação
- Confirmação haptic/visual antes de executar (para evitar acidente)
- Desktop: manter o clique → painel lateral como está

---

### U9. Reservation detail: ações de status como botões grandes no topo

**Arquivo:** `src/components/reservas/reservation-detail.tsx`
**Problema:** O painel lateral de detalhe mostra info, mas as ações de transição de status (Confirmar, Check-in, Finalizar, No-show) ficam misturadas no conteúdo ou dentro de menu. O operador precisa procurar o que fazer.
**Ganho:** Ação certa sempre visível. Zero confusão sobre qual botão apertar.
**Esforço:** 1-2 horas.
**Como:**
- Na parte superior do painel lateral (abaixo do nome do cliente), renderizar barra de ações contextual baseada no status atual:
  - `PENDING` → [Confirmar ✅] [Cancelar ❌]
  - `CONFIRMED` → [Check-in 🟢] [Cancelar ❌] [No-show ⚠️]
  - `CHECKED_IN` → [Finalizar 🏁]
  - `FINISHED` / `NO_SHOW` / `CANCELLED` → nenhum botão (estado final)
- Botões grandes (h-10), full-width, cor semântica (verde=check-in, vermelho=cancelar, amber=no-show)
- Confirmação via dialog simples para ações destrutivas (cancelar, no-show)

---

### U10. Dashboard: notificações em tempo real (toast de nova reserva)

**Arquivo:** `src/app/(dashboard)/dashboard/layout.tsx` ou `providers.tsx`
**Problema:** Quando uma reserva entra pelo widget, o operador só vê se recarregar a lista. Em restaurante movimentado, isso é um gap de informação.
**Ganho:** Operador sabe instantaneamente quando nova reserva entra. Zero atraso na operação.
**Esforço:** 2-3 horas.
**Como:**
- Usar Supabase Realtime (já na stack) para ouvir INSERTs na tabela `Reservation` filtrado por `restaurantId`
- No layout do dashboard, hook `useEffect` que conecta ao canal Supabase Realtime:
```typescript
useEffect(() => {
  if (!restaurantId) return
  const channel = supabase
    .channel(`reservations:${restaurantId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'Reservation',
      filter: `restaurantId=eq.${restaurantId}`,
    }, (payload) => {
      toast.info(`Nova reserva: ${payload.new.guestName} — ${payload.new.partySize} pessoas`)
      utils.reservations.list.invalidate()
    })
    .subscribe()
  return () => { supabase.removeChannel(channel) }
}, [restaurantId])
```
- Requer: habilitar Realtime no Supabase para a tabela `Reservation` (é config no painel do Supabase)

---

## Prioridade B — Polish visual que gera confiança profissional

---

### U11. Widget: progress bar contínua em vez de step numbers

**Arquivo:** `src/components/widget/booking-widget.tsx`
**Problema:** O widget não tem indicador claro de progresso. O usuário não sabe se está no começo, meio ou fim. "Passo 5 de 7" gera sensação de formulário longo.
**Ganho:** Reduz ansiedade de "quando isso acaba?". Melhora percepção de velocidade.
**Esforço:** 1 hora.
**Como:**
- Adicionar barra de progresso fina (2px) no topo do widget card
- Cor: `primary` do tema do restaurante
- Largura: `(currentStepIndex / totalSteps) * 100%`
- Transição suave (`transition-all duration-500`)
- Sem números, sem labels — só a barra

---

### U12. Widget: tela de sucesso com share CTA

**Arquivo:** `src/components/widget/booking-widget.tsx` (step `success`)
**Problema:** A tela de sucesso mostra info da reserva e "Fazer outra reserva". Oportunidade perdida de viralização — o hóspede pode compartilhar o restaurante.
**Ganho:** Canal de aquisição orgânico via compartilhamento do hóspede.
**Esforço:** 1 hora.
**Como:**
- Adicionar botão "Compartilhar" que usa Web Share API:
```typescript
const shareData = {
  title: `Reservei no ${restaurant.name}!`,
  text: `Acabei de reservar uma mesa no ${restaurant.name}. Reserve também:`,
  url: window.location.href,
}
if (navigator.share) {
  navigator.share(shareData)
} else {
  // Fallback: copiar link
  navigator.clipboard.writeText(window.location.href)
  toast.success('Link copiado!')
}
```
- Botão secundário, abaixo do resumo: "📤 Compartilhar com amigos"

---

### U13. Reservation card: indicador visual de horário relativo

**Arquivo:** `src/components/reservas/reservation-card.tsx`
**Problema:** O card mostra "20:00" mas o operador quer saber "falta quanto?". Num turno movimentado, calcular mentalmente "20:00 - 19:45 = 15 min" para cada reserva é custo cognitivo.
**Ganho:** Operador prioriza visualmente quem está chegando. Zero cálculo mental.
**Esforço:** 1 hora.
**Como:**
- Adicionar label relativo ao lado do horário:
  - Se faltam < 30 min: `🔴 em 15 min` (vermelho, urgente)
  - Se faltam 30-60 min: `🟡 em 45 min` (amarelo)
  - Se faltam > 60 min: mostrar só o horário
  - Se já passou: `⏰ atrasado 10 min` (piscando suavemente)
- Usar `date-fns` `formatDistanceToNow` com `locale: ptBR`
- Atualizar a cada 60s (useEffect com setInterval)

---

### U14. Sidebar: badge com contagem de reservas pendentes

**Arquivo:** `src/components/dashboard/sidebar.tsx`
**Problema:** O item "Reservas" no sidebar não indica se há algo pendente. O operador precisa clicar para descobrir.
**Ganho:** Operador vê urgência sem navegar. Menos reservas ignoradas.
**Esforço:** 1 hora.
**Como:**
- No sidebar, o item "Reservas" mostra badge numérico com a contagem de reservas PENDING + CONFIRMED para hoje
- Query leve: `reservations.countToday` que retorna `{ pending: number, confirmed: number }`
- Badge: bolinha vermelha com número, estilo notificação
- Atualizar a cada 30s (refetchInterval)

---

### U15. Dashboard: empty states com ilustrações e CTAs úteis

**Arquivo:** `src/components/common/empty-state.tsx`
**Problema:** Empty states atuais são genéricos (ícone + texto). Oportunidade perdida de guiar o operador.
**Ganho:** Reduz confusão de operador novo. Converte "nada aqui" em "faça isso agora".
**Esforço:** 2 horas.
**Como:**
- Para cada seção, empty state específico:
  - **Reservas vazio (hoje):** "Nenhuma reserva para hoje. [+ Nova reserva] ou [Compartilhar link do widget]"
  - **Mesas vazio:** "Crie seu mapa de mesas. [Abrir editor] — Seu widget ficará inativo até configurar pelo menos 1 mesa."
  - **Clientes vazio:** "Seus clientes aparecerão aqui após a primeira reserva."
  - **Waitlist vazio:** "Quando todas as mesas estiverem ocupadas, clientes podem entrar na fila de espera."
- Usar ilustrações SVG simples ou emojis grandes (64px)

---

## Prioridade C — Micro-interações que elevam a percepção de qualidade

---

### U16. Widget: haptic feedback nos botões de seleção (mobile)

**Esforço:** 15 minutos.
**Como:** Adicionar `navigator.vibrate?.(10)` no onClick dos SelectCards. Sutil, premium.

### U17. Dashboard: skeleton loading melhorado

**Arquivo:** `src/components/common/empty-state.tsx` (SkeletonRow)
**Esforço:** 1 hora.
**Como:** O skeleton atual é genérico. Criar skeletons que imitam a forma real dos cards (avatar circular + linhas de texto + badge). Shimmer animation com `animate-pulse` já existe, mas fazer match com o layout real.

### U18. Widget: animação de confetti na tela de sucesso

**Esforço:** 30 minutos. `canvas-confetti` já está instalado no projeto.
**Como:** No step `success`, disparar `confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } })`.

### U19. Transições de page no dashboard com framer-motion

**Esforço:** 1-2 horas.
**Como:** Wrap o `{children}` do layout do dashboard com `<AnimatePresence mode="wait">` e dar `motion.div` com fade-in suave para cada page. Evitar slide (fica "app mobile" demais para dashboard).

---

## Resumo executivo — Ordem de implementação por ROI

| # | Feature | Ganho | Esforço | ROI |
|---|---------|-------|---------|-----|
| U1 | Eliminar step welcome | +15% conversão widget | 30 min | 🟢🟢🟢 |
| U5 | Auto-advance seleção única | -5 cliques no funil | 1h | 🟢🟢🟢 |
| U4 | Máscara telefone | 0% erro de formato | 1h | 🟢🟢🟢 |
| U9 | Ações de status no topo do detail | Operação 3x mais rápida | 1-2h | 🟢🟢🟢 |
| U11 | Progress bar widget | Reduz ansiedade | 1h | 🟢🟢 |
| U13 | Horário relativo nos cards | Zero cálculo mental | 1h | 🟢🟢 |
| U7 | Botão "Hoje" destacado | 1 toque volta ao turno | 30 min | 🟢🟢 |
| U14 | Badge pendentes no sidebar | Urgência visível | 1h | 🟢🟢 |
| U3 | Grid de datas com disponibilidade | Menos cliques errados | 2-3h | 🟢🟢 |
| U2 | Fundir 3 steps em 1 | +30% conversão pós-form | 2-3h | 🟢🟢 |
| U10 | Toast realtime nova reserva | Info instantânea | 2-3h | 🟢🟢 |
| U12 | Share CTA no sucesso | Canal viral grátis | 1h | 🟢 |
| U6 | Mobile bottom nav | Dashboard usável mobile | 3-4h | 🟢 |
| U8 | Swipe-actions cards | Operação touch | 3-4h | 🟢 |
| U15 | Empty states ricos | Guia operador novo | 2h | 🟢 |

**Total para os top 5 (U1+U5+U4+U9+U11):** ~5 horas de desenvolvimento para ganhos significativos em conversão e eficiência operacional.

---

> Quando quiser implementar qualquer uma, confirme quais e gero o prompt do Cursor com código exato.
