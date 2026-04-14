# TeMesa — Mega-Prompt para Agente de Frontend (Kimi)

> **Para o agente Kimi:** Você é um designer-engenheiro de interfaces de altíssimo nível, especialista em React, Tailwind CSS, shadcn/ui e Konva.js. Sua missão é construir do zero todo o frontend do TeMesa com qualidade de produto comercial premium. Leia este documento integralmente. As referências visuais descritas neste documento são baseadas em prints reais do SevenRooms e produtos similares — replique a sofisticação, não a cópia.

---

## 1. Contexto do Produto

**TeMesa** é um SaaS de gestão de reservas para restaurantes. O frontend é uma aplicação Next.js que inclui:
1. **Dashboard do restaurante** — painel de operações (reservas, mesas, clientes, garçons, relatórios)
2. **Editor de mapa de mesas** — canvas Konva.js drag-and-drop estilo Canva
3. **Widget público embeddable** — iframe para o site do restaurante
4. **Página de confirmação/cancelamento** — link recebido via WhatsApp
5. **Onboarding guiado** — wizard passo a passo skippable
6. **PWA** — Progressive Web App instalável, com push notifications

**Repositório:** https://github.com/MyBoxStorage/TeMesa

---

## 2. Stack do Frontend — Locked

| Tecnologia | Versão | Uso |
|---|---|---|
| Next.js | 14+ App Router | Framework |
| TypeScript | strict | Linguagem |
| Tailwind CSS | latest | Estilo |
| shadcn/ui | latest | Componentes base |
| Konva.js + react-konva | latest | Editor de mapa de mesas |
| react-i18next | latest | Internacionalização PT-BR / EN / ES |
| date-fns | latest | Manipulação de datas |
| Recharts | latest | Gráficos de analytics |
| next-pwa | latest | PWA |
| Framer Motion | latest | Animações |

---

## 3. Sistema de Design

### 3.1 Tema Padrão (white/black neutro)
O tema padrão é branco e preto. Cada restaurante pode sobrescrever via `themeConfig`:
```typescript
interface ThemeConfig {
  primaryColor: string    // ex: "#000000" (padrão preto)
  secondaryColor: string  // ex: "#ffffff" (padrão branco)
  accentColor: string     // ex: "#f59e0b" (dourado opcional)
  fontFamily: string      // ex: "Inter" | "Playfair Display" | "Montserrat"
  borderRadius: string    // ex: "0.5rem" | "0rem" | "1rem"
}
```

O tema é aplicado via CSS variables no elemento root da página pública e do widget.
O dashboard interno SEMPRE usa o tema padrão (preto/branco) independente do restaurante.

### 3.2 Tokens Globais (tailwind.config.js)
```javascript
colors: {
  brand: { DEFAULT: 'var(--primary)', foreground: 'var(--primary-foreground)' },
  surface: { DEFAULT: '#ffffff', dark: '#0a0a0a' },
  muted: { DEFAULT: '#f4f4f5', foreground: '#71717a' },
  // Status de mesas:
  'table-available': '#22c55e',   // verde
  'table-reserved': '#3b82f6',    // azul
  'table-occupied': '#f59e0b',    // âmbar
  'table-waiting': '#a855f7',     // roxo
  'table-blocked': '#ef4444',     // vermelho
}
```


---

## 4. Referências Visuais — Descrição Detalhada dos 14 Prints

### Print 1 — Widget Público (Mobile + Embedded)
**O que mostra:** widget de reserva do restaurante "Five Figs" em duas versões (mobile e card flutuante).
**Elementos visuais:**
- Logo do restaurante no topo centralizado (ícone + nome em caps)
- Foto do restaurante em formato retangular (16:9)
- Ícones de redes sociais em círculos sobrepostos (TripAdvisor, Instagram, Facebook, Google, "+more")
- Card de seleção com 3 colunas: Guests (número + ícone pessoa), Time (horário + duração), Date ("Today"/dia)
- Botão "Book Now" / "Reservar Agora" preto 100% largura
- Grade 2×2 de horários disponíveis em cards pretos com texto branco: "5:00 pm / Indoor"
- Cards de horário indisponíveis aparecem em cinza claro

**Replicar:** layout mobile-first, proporções exatas, cards de horário com hover suave

### Print 2 — Waitlist Management (Dark Theme)
**O que mostra:** painel de gestão da fila de espera em tema escuro (dark mode).
**Elementos visuais:**
- Header: data atual com setas ◀ ▶, ícone de configuração, dropdown de turno "Dinner"
- Tabs superiores: Active | Seated | Removed (tabs simples, sem bordas)
- Campo de busca full-width com ícone de filtro (|||) à direita
- Tabela com colunas: NAME ▼, TABLE, GUESTS, TAGS, ELAPSED ▼, QUOTED ▼, REMAINING ⓘ
- Seção "TABLE READY": fundo ligeiramente mais claro, 1 linha com botão "Seat" azul/ciano
- Seção "WAITING": linhas com avatar circular (inicial do nome + cor), barras de progresso coloridas
  - Barra verde: tempo ok (elapsed < quoted)
  - Barra amarela/laranja: tempo chegando no limite
  - Barra vermelha: tempo ultrapassado (elapsed > quoted)
- Coluna ELAPSED mostra minutos em texto colorido (verde/laranja/vermelho)
- Botão "Ready" cinza com 3 pontos ⋮ para opções
- Card "Scan To Join Our Waitlist" com QR code (canto inferior direito)
- Todos os números de mesa são pequenos e discretos

### Print 3 — Floorplan com Reservas (Dark, iPad Landscape)
**O que mostra:** visão principal do mapa de mesas com lista lateral de reservas.
**Elementos visuais:**
- Sidebar esquerda (≈35% da tela): campo de busca no topo, lista de reservas agrupadas em seções
  - "ARRIVED (2/10)": reservas que chegaram — badge com número total
  - "UPCOMING (8/31)": próximas reservas
  - Cada item: horário em azul, nome em branco, número de pessoas, código da mesa, ícones de status
- Área do mapa (≈65%): fundo escuro (#1a1a1a), mesas distribuídas pelo espaço
  - Mesas redondas: círculos com número no centro, borda colorida por status
  - Mesas quadradas: retângulos arredondados
  - Mesa com reserva confirmada: círculo azul com nome do cliente abaixo
  - Mesa VIP/especial: borda dourada
  - Mesa disponível: cinza escuro (#3a3a3a)
- Tabs de área no canto inferior direito: ícone de camadas + MAIN | ROOF | LOUNGE
- Header da área: botões de navegação de data, "Go To Now", seletor de turno

### Print 4 — Floorplan com Booth (Dark, iPad)
**O que mostra:** layout com mesas em formato booth (meia-lua) e diferentes shapes.
**Elementos visuais:**
- Mesas booth: formato de semicírculo/D, capacidade 3-4
- Sidebar com seções ARRIVED e SEATED com contadores
- Mesas em cores: cinza (disponível), azul (reservada/ocupada), verde-teal (chegou)
- Avatar circular colorido ao lado do nome do cliente na sidebar

### Print 5 — Floorplan Colorido (Light/Wood Theme)
**O que mostra:** mapa com fundo de madeira e código de cores por status.
**Elementos visuais:**
- Fundo: textura de madeira clara (#c8a97e pattern simulado com gradiente)
- Mesas com cores: verde (#22c55e) = matched, amarelo (#eab308) = bill printed, vermelho (#ef4444) = unmatched
- Legenda textual no mapa explicando cada cor
- Ícones de elementos: caixa registradora ($), bancada (=====), ícones de banheiro
- Mesas retangulares com cadeiras ilustradas ao redor (pequenos quadrados nas bordas)
- Status bar inferior: nome do operador, data/hora, versão do sistema


### Print 6 — Customer CRM Profile Card (Light Theme)
**O que mostra:** card detalhado do perfil de um cliente (estilo SevenRooms).
**Elementos visuais:**
- Foto circular do cliente (avatar) no topo centralizado, tamanho grande (~80px)
- Nome em fonte grande e negrita centralizado
- Subtítulo de perfil: "Friday Regular" em cinza
- Grade de tags coloridas (pills/badges arredondados):
  - Rosa claro: "Shellfish Allergy"
  - Dourado com ⭐: "VIP"
  - Teal com ↺: "Big Spender"
  - Roxo claro: "July Birthday"
  - Verde com ↺: "Regular"
  - Roxo com ✦: "Welcome Drink"
  - Amarelo: "Visits: 8"
  - Cinza com ↺: "Positive Reviewer"
- Linha divisória
- Grid 4 colunas de stats: TOTAL SPEND ($3,109) | # OF ORDERS (13) | VISITS (21) | REVIEWS (⭐⭐⭐⭐⭐)
- Seção "LAST VISIT" com nome do estabelecimento e valor total à direita
- Lista de itens pedidos: quantidade, nome do item, valor

**Replicar:** tags com cores distintas, foto circular com borda, stats em destaque

### Print 7 — Auto-Tag Creation (Dark Modal)
**O que mostra:** modal de criação de auto-tag com builder de condições.
**Elementos visuais:**
- Modal dark com header "Create Auto-Tag"
- Seção SETTINGS: input "Auto-tag name" com valor "Wine Big Spender"
- Seção CONDITIONS:
  - Linha 1: dropdown "Visit: POS Item Price" | dropdown "greater than"
  - Linha 2: input "$" + "500" | dropdown "ever" | dropdown "greater than or equal to"
  - Linha 3: input "1" | texto "time(s)"
  - Botão "+ And" em teal/verde para adicionar condição
  - Linha 4 (segunda condição): dropdown "POS Item Name" | dropdown "Contains" | input "Wine"
- Botão "Create" preto full-width no fundo
- Preview card à direita mostrando o cliente com a nova tag aplicada

**Replicar:** builder de condições dinâmico (adicionar/remover linhas)

### Print 9 — Add Reservation Form + Mobile Widget
**O que mostra:** dois elementos lado a lado.
**Elemento esquerdo — "Add Reservation" (Light):**
- Header: "Add Reservation" com ícone de calendário
- Seção Availability: dropdown Location, input Date, seletor Guests (números 2-10 em boxes clicáveis, o selecionado em azul/dark)
- Dropdowns: Shift, Duration (com "Default"), Seating area
- Toggle "Show Access Rule Availability" + dropdown Audience
- Tabela de disponibilidade: colunas = venues, linhas = horários, células com horário + tipo (Indoor/Outdoor)

**Elemento direito — Mobile Widget com tema personalizado:**
- Fundo verde escuro (#2d5a27) com logo "the local" em fonte cursiva branca
- Foto do restaurante
- Seletor de guests/time/date em row
- Grade de horários: cards verdes grandes 2 colunas
- Horário indisponível: card branco com texto "Alert Me" e ícone de sino

### Print 10 — Floorplan Completo com Servers (Dark)
**O que mostra:** visão completa com waitlist, reservas e seção de garçons.
**Elementos visuais:**
- Sidebar compacta com 3 seções: Waitlist (contadores de tempo em fila), Reservations (lista por horário), Seated (com horário de sentar)
- Seção "Servers" no final da sidebar (vazia neste print)
- Mapa: mesas em magenta/rosa = ocupadas, com ícone de garfo+faca nas mesas com reserva
- Mesas disponíveis: cinza claro
- Canto inferior: tabs de área

### Print 11 — Floorplan com Servers Listados
**Similar ao Print 10, mas Servers section mostra:**
- "UNASSIGNED SERVERS" com lista de nomes (BAR, Jake, Jon)
- Cada servidor tem initial colorida em badge circular

### Print 12 — Timeline View (OpenTable Style, Dark)
**O que mostra:** visão de linha do tempo das reservas, estilo grade.
**Elementos visuais:**
- Header: seletor de data central, ponto de status (verde = ao vivo), dropdown de turno
- Grid principal:
  - Eixo Y (esquerda): número da mesa + capacidade (ex: "1  4", "11  4", "12  8")
  - Eixo X (topo): horários em intervalos de 15min (5:00, 5:15, 5:30... 10:00)
  - Linhas horizontais zebra (alternando #1a1a1a e #222222)
  - Blocos de reserva: retângulos horizontais semitransparentes cinza escuro, spanning pelo tempo
    - Texto dentro: ícone de tipo + nome do cliente + ícone de notas + número de pessoas
- Rodapé: contadores por slot (covers/capacity: "14/30", "8/10" etc.)
- Ícones: 🍽️ = reserva padrão, 🌐 = online, 👤 = vip, 📝 = tem notes

### Print 13 — Reservation Detail Panel (Dark, iPad)
**O que mostra:** painel lateral de detalhes de uma reserva com perfil do cliente.
**Elementos visuais:**
- Sidebar esquerda: lista de reservas do dia com check ✓ verde nas confirmadas, horário + nome + seção/mesa
- Painel direito (detalhe):
  - Header: "Today, 12:45 PM / Confirmed / Patio" em linha, com botão ✕ e ⋯
  - Row de info: 🕐 12:45PM | 👥 3 | ⏱ 2h | 🪑 P6
  - Tabs: Guests | Reservation | Chat | History
  - Aba Guests: mini-card do cliente com nome, badge VIP vermelho, stats horizontais (Reservations:69, Visits:70, etc.)
  - Seção VISIT (expansível), GUEST com tags coloridas, nota em destaque (borda esquerda colorida), CONTACT INFO

### Print 14 — Dashboard Overview + Floor Plan Editor
**O que mostra:** visão multi-device do sistema completo.
**Dashboard (tablet esquerdo):** cards de stats (25 Covers, 9 Parties, 125 Expected), 3 botões de ação (Timeline, Service, Operations), gráfico de barras "Service Overview", gauge "Today's snapshot"
**Floor Plan Editor (tablet direito):** painel esquerdo com lista de TABLE TYPES e capacidades, canvas de edição com mesas arrastáveis e pontos de conexão para combinação (laranja = não conectado, azul = conectado)


---

## 5. Todas as Telas a Implementar

### 5.1 Autenticação (Clerk — componentes prontos)
- `/sign-in` — página de login usando `<SignIn />` do Clerk, centralizado, tema neutro
- `/sign-up` — página de cadastro usando `<SignUp />` do Clerk

### 5.2 Onboarding Guiado (/onboarding)
**Visual:** wizard em steps com barra de progresso no topo (4 steps).
**Etapa 1 — Restaurante:**
  - Upload de logo (drag-and-drop + preview circular)
  - Upload de foto de capa (preview retangular)
  - Campos: Nome do restaurante, Telefone, CNPJ (opcional), Endereço
  - Botão "Próximo" e link "Pular por agora" discreto

**Etapa 2 — Turnos:**
  - Card para adicionar turno com: nome, horário início/fim, dias da semana (chips clicáveis), duração por mesa, capacidade máxima
  - Lista dos turnos criados com opção de editar/deletar
  - Sugestões rápidas: "Almoço 12h-15h" / "Jantar 19h-23h" (botões de atalho)

**Etapa 3 — Mesas:**
  - Opção A: "Configurar depois" (pula para dashboard)
  - Opção B: Ir para o editor de mesas
  - Mini-preview do editor Konva

**Etapa 4 — Notificações:**
  - Campo para número do WhatsApp (com verificação de formato +55)
  - Pré-visualização dos templates de mensagem em card
  - Toggle para ativar/desativar cada notificação
  - Botão "Concluir" com animação de confetti ao completar

### 5.3 Dashboard Layout (src/app/(dashboard)/layout.tsx)
**Sidebar fixa à esquerda (desktop) ou bottom nav (mobile):**
```
Logo/nome do restaurante no topo
────────────────
📋 Reservas     (badge com count do dia)
🗺️  Mesas
⏳ Waitlist     (badge com count atual)
👥 Clientes
🍽️  Garçons
📊 Relatórios
────────────────
⚙️  Configurações
```
- Sidebar colapsável no desktop
- Header com: nome do restaurante, seletor de data (↔ navegar dias), seletor de turno, avatar do usuário

### 5.4 Página de Reservas (/reservas)
**Três views toggle (como prints 3, 12, 13):**

**View 1 — Floorplan (padrão, como Print 3/4):**
- Split: sidebar esquerda (lista) + canvas Konva direita (mapa)
- Sidebar: busca, filtros de status, grupos ARRIVED/UPCOMING/SEATED
- Cada item na sidebar: horário colorido, nome, partySize, código da mesa, ícones de status
- Clicar num item: abre painel de detalhe deslizante pela direita (como Print 13)
- Clicar em mesa no canvas: abre o mesmo painel ou quick-action menu
- Tabs de área no canto inferior

**View 2 — Timeline (como Print 12):**
- Grid com mesas nas linhas e horários nas colunas
- Blocos de reserva arrastáveis para trocar de horário/mesa
- Zoom: 15min por coluna (ajustável)
- Rodapé com contadores de covers por slot

**View 3 — Lista (como Print 2 — mais compacta):**
- Tabela com colunas: Nome, Mesa, Pessoas, Tags, Chegada, Status
- Filtros por status, busca, ordenação

**Ações disponíveis (menu contextual ou painel):**
- Check-in, No-show, Cancelar, Finalizar, Trocar mesa, Atribuir garçom

### 5.5 Painel de Detalhe da Reserva (Sheet/Drawer — como Print 13)
- Header com status badge colorido
- Tabs: Hóspede | Reserva | Histórico
- Aba Hóspede: perfil do cliente (como Print 6) com tags, stats, notes
- Aba Reserva: todos os campos editáveis inline
- Aba Histórico: timeline de mudanças de status


### 5.6 Waitlist (/waitlist — como Print 2/8)
- Header: data + turno
- Abas: Aguardando | Sentados | Removidos
- Tabela dark: nome, mesa, pessoas, tags, tempo decorrido (barra colorida), tempo cotado, restante
- Botões: "Sentar" (azul, para TABLE READY), "Pronto" (cinza)
- Seção QR Code: "Escaneie para entrar na fila" com QR gerado dinamicamente
- Toast quando novo cliente entra na fila

### 5.7 Editor de Mesas (/mesas) — COMPONENTE MAIS COMPLEXO
Ver seção 6 dedicada ao editor Konva.

### 5.8 Clientes (/clientes)
**Lista:**
- Busca por nome/telefone/email
- Grid de cards (não tabela) com: foto/avatar, nome, tags (máx 3 + "+N"), visitCount, reliabilityScore como gauge colorido
- Filtros por tags (chips selecionáveis)
- Ordenação por: visitas, score, último no-show

**Perfil do cliente (/clientes/[id]) — como Print 6:**
- Avatar grande, nome, role/badge
- Tags coloridas (todas visíveis)
- Stats: Total gasto | Reservas | Visitas | No-shows | Avaliações
- Histórico de reservas em lista (com status badge)
- Botão "Editar" e "Excluir dados (LGPD)"

### 5.9 Garçons (/garcons)
- Lista de garçons com: nome, avatar inicial colorida, mesas atribuídas hoje, status (ativo/inativo)
- Botão "Atribuir mesas" abre modal com o mapa de mesas para seleção drag-or-click
- Visualização de qual garçom atende qual mesa (aparece no floorplan como cor diferente)

### 5.10 Relatórios (/relatorios)
**Cards de KPI:**
- Reservas hoje (número + delta vs. ontem)
- Taxa de ocupação (gauge circular %)
- No-shows este mês (número + trend)
- Clientes novos (30 dias)

**Gráficos (Recharts):**
- Barra: ocupação por dia (últimos 30 dias) — horizontal, barras empilhadas por turno
- Pizza/Donut: reservas por canal de origem (Widget, Manual, WhatsApp, etc.)
- Linha: no-shows por semana (últimas 12 semanas)
- Tabela: top 10 clientes (nome, visitas, gasto estimado)

### 5.11 Configurações (/configuracoes)
**Tabs laterais:**
- Geral: nome, telefone, CNPJ, endereço, horário de funcionamento
- Tema: color pickers, font selector, preview ao vivo do widget
- Turnos: CRUD completo de turnos (cards editáveis)
- Notificações: accordion por trigger, textarea para template PT-BR/EN/ES, toggle ativo/inativo
- Auto-Tags: lista de tags + modal de criação (como Print 7)
- Garçons: CRUD de garçons
- Pagamento: toggle para ativar módulo de pagamento antecipado + campos de config (se ativo)
- Integração: campo para BC Connect Partner ID + API Key


---

## 6. Editor de Mesas Konva.js — Especificação Completa

Este é o componente mais complexo do projeto. Deve ter qualidade de produto comercial (similar ao Print 14 do Canva-style editor).

### 6.1 Estrutura do Componente
```
FloorPlanEditor/
├── index.tsx              ← componente principal exportado
├── Toolbar.tsx            ← barra lateral esquerda com elementos
├── Canvas.tsx             ← Stage + Layer do Konva
├── ElementPanel.tsx       ← painel de propriedades do elemento selecionado
├── FloorTemplates.tsx     ← seletor de fundo/piso
├── AreaManager.tsx        ← gerenciar áreas (Salão, Varanda, Bar...)
└── elements/              ← shapes Konva para cada tipo de elemento
    ├── TableSquare.tsx
    ├── TableRound.tsx
    ├── TableRectangle.tsx
    ├── TableBooth.tsx
    ├── TableLongRect.tsx
    ├── Chair.tsx
    ├── BarCounter.tsx
    ├── Stage.tsx           ← palco (renomear para avoid conflict)
    ├── Piano.tsx
    ├── Bathroom.tsx
    ├── OutdoorArea.tsx
    ├── Sofa.tsx
    ├── Plant.tsx
    ├── Stairs.tsx
    └── DecorativeElement.tsx
```

### 6.2 Funcionalidades Obrigatórias do Editor
- **Drag-and-drop:** elementos arrastados da toolbar para o canvas, reposicionáveis livremente
- **Seleção:** clicar seleciona elemento (highlight com handles de redimensionamento)
- **Rotação:** handle de rotação ao selecionar (Konva Transformer)
- **Redimensionamento:** handles nos cantos (apenas para elementos decorativos — mesas têm tamanho fixo por capacidade)
- **Duplo-clique:** abre painel de propriedades do elemento
- **Delete:** tecla Delete ou Backspace remove elemento selecionado
- **Ctrl+Z / Ctrl+Y:** undo/redo (histórico de 20 estados)
- **Zoom:** scroll do mouse + botões + / - na toolbar
- **Pan:** arrastar com espaço pressionado ou com o scroll médio
- **Multi-select:** Shift+click ou drag-select na área vazia
- **Snap-to-grid:** opcional, toggle na toolbar (grid 20px)
- **Salvar:** botão "Salvar Layout" envia canvasData ao backend
- **Template de piso:** dropdown de texturas (ver lista abaixo)
- **Gerenciar áreas:** criar/renomear/deletar áreas, associar elementos a uma área

### 6.3 Toolbar Lateral Esquerda
Organizada em seções colapsáveis:

**🪑 Mesas** (elementos com propriedades de capacidade):
- Mesa Quadrada (2-4 lugares) — ícone: quadrado com cadeiras
- Mesa Redonda (2-6 lugares) — ícone: círculo
- Mesa Retangular (4-8 lugares) — ícone: retângulo
- Mesa Booth (3-5 lugares) — ícone: D arredondado
- Mesa Long (8-20 lugares) — ícone: retângulo longo

**🏠 Estrutura** (elementos decorativos sem propriedades de reserva):
- Balcão de Bar — ícone: L ou U
- Palco — ícone: retângulo com nota musical
- Piano — ícone: silhueta de piano
- Escada — ícone: degraus
- Área Externa — ícone: círculo tracejado

**🛋️ Mobiliário** (decorativo):
- Sofá — ícone: sofá
- Poltrona — ícone: poltrona
- Planta/Vaso — ícone: folha
- Balcão de Recepção — ícone: mesa com pessoa

**🚻 Facilidades**:
- Banheiro Masculino / Feminino
- Saída de Emergência
- Elevador

**💡 Decoração** (ícones genéricos):
- Texto livre (para nomear áreas)
- Separador / Divisória

### 6.4 Painel de Propriedades (ao clicar num elemento)
**Para mesas (elementos com reserva):**
- Nome/número: input (ex: "Mesa 12", "Varanda A")
- Capacidade mínima: número
- Capacidade máxima: número
- Área: select (das áreas cadastradas)
- Cor de status: exibida automaticamente pelo status real da mesa

**Para elementos decorativos:**
- Label: input de texto (opcional, aparece sob o elemento)
- Cor de fundo: color picker
- Tamanho: slider de escala

### 6.5 Templates de Piso
Cada template é uma cor/gradiente/padrão aplicado como fundo do canvas:
```
wood     → gradiente linear (#c8a97e → #a0784a) — madeira clara
marble   → branco com textura (#f5f5f5 sólido)
dark     → dark gray (#1a1a1a) — estilo noturno
black    → preto puro (#0a0a0a)
red      → bordô escuro (#2d0a0a)
blue     → azul naval (#0a0a2d)
brown    → marrom escuro (#1a0f0a)
white    → branco puro (#ffffff)
gray     → cinza neutro (#3a3a3a)
```

### 6.6 Salvar/Carregar o Canvas
```typescript
// Salvar: serializar o estado do Konva
const saveCanvas = () => {
  const stageData = stageRef.current?.toJSON()     // Konva nativo
  const positions = extractTablePositions(stageData) // para sincronizar DB
  trpc.floorPlan.save.mutate({ restaurantId, canvasData: stageData, floorTemplate, areas })
}

// Carregar: hidratar o canvas a partir do JSON salvo
const loadCanvas = (canvasData: unknown) => {
  const stage = Konva.Node.create(canvasData, containerId)
  // Re-attach event listeners nos elementos do tipo mesa
}
```

### 6.7 Status Visual das Mesas em Tempo Real
O FloorPlan Viewer (versão read-only do editor, usado na página de reservas):
- Usa o hook `useRealtime(restaurantId)` para assinar mudanças de status
- Cada mesa é colorida pelo status atual: verde=available, azul=reserved, âmbar=occupied, roxo=waiting, vermelho=blocked
- Ao passar o mouse: tooltip com nome da mesa, status, nome do cliente (se OCCUPIED/RESERVED)
- Ao clicar: abre painel de detalhe da reserva vinculada


---

## 7. Widget Público Embeddable (/r/[slug])

Esta página é servida como iframe no site do restaurante. Deve ser completamente autossuficiente em estilo (não depende do layout do dashboard) e aplicar o themeConfig do restaurante.

### 7.1 Estrutura da Página
```
BookingWidget/
├── index.tsx            ← página principal /r/[slug]
├── StepSelector.tsx     ← Step 1: selecionar guests/data/turno
├── StepSlots.tsx        ← Step 2: grade de horários disponíveis
├── StepForm.tsx         ← Step 3: formulário do cliente
├── StepSuccess.tsx      ← Step 4: confirmação de sucesso
└── WaitlistForm.tsx     ← formulário alternativo para waitlist
```

### 7.2 Fluxo Visual (como Print 1 e Print 9 — mobile widget)

**Header:**
- Logo do restaurante (logoUrl) centralizado
- Nome do restaurante em caps, fonte elegante
- Foto de capa (coverUrl) em 16:9 abaixo do logo
- Ícones de redes sociais em círculos sobrepostos (configurados no restaurante)

**Step 1 — Seleção:**
- Row com 3 blocos clicáveis: Guests (número + ícone 👤) | Horário (HH:mm + duração) | Data ("Hoje"/"Amanhã"/data)
- Ao clicar em Guests: popover com stepper numérico (-/+)
- Ao clicar em Horário: popover com input de horário (ou apenas decorativo para o setor definir)
- Ao clicar em Data: calendar picker

**Step 2 — Horários disponíveis:**
- Botão "Reservar Agora" / "Book Now" / "Reservar Ahora" — cor primaryColor do restaurante, 100% largura, texto branco
- Grade 2×N de cards de horário:
  - Disponível: fundo primaryColor, texto branco, hover com leve brilho
  - Indisponível: fundo cinza claro, texto muted, sem hover, sem clique
  - Cada card: horário em negrito + área (Indoor/Outdoor/Varanda etc.)
- Se não há horários: mensagem "Sem disponibilidade" + botão "Entrar na lista de espera"

**Step 3 — Formulário:**
- Nome completo* (obrigatório)
- Telefone WhatsApp* (com máscara BR: (00) 00000-0000)
- E-mail (opcional)
- Ocasião especial (select: Aniversário, Lua de Mel, Negócios, Outro...)
- Restrições alimentares (textarea)
- Observações (textarea)
- **Checkboxes LGPD:**
  - ☑ "Li e aceito os Termos de Uso e a Política de Privacidade do {restaurantName}" (obrigatório)
  - ☐ "🎁 Quero participar dos sorteios semanais e receber ofertas exclusivas dos parceiros do Porto Cabral BC em Balneário Camboriú. Opcional. Autorizo o compartilhamento do meu perfil com parceiros para promoções personalizadas. Revogável a qualquer momento. LGPD — Lei 13.709/2018." (opcional)
- Botão de confirmação com cor primaryColor

**Step 4 — Sucesso:**
- Ícone ✅ animado (Framer Motion)
- "Reserva confirmada!"
- Resumo: nome, data, horário, pessoas, restaurante
- "Você receberá uma mensagem no WhatsApp com os detalhes"
- Botão "Fazer outra reserva" para resetar o widget

### 7.3 Aplicação do Tema do Restaurante
```typescript
// Em /r/[slug]/page.tsx (Server Component)
// 1. Buscar themeConfig do restaurante via tRPC/API pública
// 2. Injetar CSS variables no <style> tag do head:
const themeStyle = `
  :root {
    --primary: ${themeConfig.primaryColor};
    --primary-foreground: #ffffff;
    --accent: ${themeConfig.accentColor};
    --radius: ${themeConfig.borderRadius};
    --font-family: '${themeConfig.fontFamily}', sans-serif;
  }
`
```

### 7.4 Iframe Embeddable
O restaurante recebe este snippet para colar no site:
```html
<iframe
  src="https://temesa.app/r/SEU-SLUG"
  width="100%"
  height="700"
  frameborder="0"
  style="border-radius: 12px; max-width: 480px; margin: 0 auto; display: block;"
></iframe>
```
A guia de implementação (documento separado, gerado automaticamente) documenta como usar este snippet.


---

## 8. Página de Confirmação/Cancelamento (/confirmar/[token])

Esta página é acessada pelo cliente via link recebido no WhatsApp. Deve ter o design e tema do restaurante (não o dashboard).

### 8.1 Estados da Página

**Estado: Carregando**
- Spinner centralizado com logo do restaurante

**Estado: Válido (reserva aguardando confirmação)**
- Logo e nome do restaurante (com themeConfig aplicado)
- Foto de capa do restaurante
- Card centralizado com detalhes da reserva:
  - 📅 Data e dia da semana
  - ⏰ Horário
  - 👥 Número de pessoas
  - 🪑 Área/mesa (se atribuída)
- Dois botões grandes:
  - ✅ "Confirmar minha presença" — fundo primaryColor
  - ❌ "Cancelar reserva" — borda vermelha, fundo transparente
- Aviso: "Este link expira 1 hora antes do horário da reserva"

**Estado: Já confirmada**
- Ícone ✅ verde animado
- "Reserva confirmada! Até logo, [guestName]!"
- Data e horário em destaque

**Estado: Cancelada com sucesso**
- Ícone ❌ com animação suave
- "Sua reserva foi cancelada."
- "Esperamos vê-lo em breve no [restaurantName]!"

**Estado: Link expirado**
- Ícone ⏱ âmbar
- "Este link não é mais válido."
- "Para alterar sua reserva, entre em contato: [phone do restaurante]"
- Botão "WhatsApp" que abre wa.me/[phone]

**Estado: Reserva não encontrada**
- Ícone 🔍
- "Reserva não encontrada ou link inválido."

### 8.2 UX Requirements
- Totalmente responsivo (mobile-first — cliente vai abrir no celular)
- Tema do restaurante aplicado (CSS variables)
- Sem menu, sem sidebar — apenas a ação
- Animações suaves com Framer Motion nas transições de estado
- Meta tags corretas para preview no WhatsApp (og:title, og:image)

---

## 9. Internacionalização (i18n) — PT-BR / EN / ES

### 9.1 Configuração
```typescript
// src/i18n/config.ts
// Idiomas: pt-BR (padrão), en, es
// Namespace principal: "common"
// Namespaces adicionais: "widget", "dashboard", "confirmation"
```

### 9.2 Arquivos de Tradução (public/locales/)
```
public/locales/
├── pt-BR/
│   ├── common.json
│   ├── widget.json
│   └── confirmation.json
├── en/
│   ├── common.json
│   ├── widget.json
│   └── confirmation.json
└── es/
    ├── common.json
    ├── widget.json
    └── confirmation.json
```

### 9.3 Onde o i18n é Aplicado
- Widget público (/r/[slug]): detecta idioma do navegador, permite troca manual
- Página de confirmação (/confirmar/[token]): mesmo comportamento
- Dashboard: apenas PT-BR (operadores são brasileiros)
- Seletor de idioma no widget: bandeirinha discreta no canto superior direito

### 9.4 Chaves Obrigatórias (widget.json)
```json
{
  "bookNow": "Reservar Agora",
  "guests": "Pessoas",
  "date": "Data",
  "time": "Horário",
  "today": "Hoje",
  "tomorrow": "Amanhã",
  "noAvailability": "Sem disponibilidade para esta data",
  "joinWaitlist": "Entrar na lista de espera",
  "fullName": "Nome completo",
  "whatsapp": "WhatsApp",
  "email": "E-mail (opcional)",
  "specialOccasion": "Ocasião especial",
  "dietaryRestrictions": "Restrições alimentares",
  "notes": "Observações",
  "confirmReservation": "Confirmar reserva",
  "reservationConfirmed": "Reserva confirmada!",
  "receiveWhatsapp": "Você receberá uma confirmação no WhatsApp",
  "lgpdRequired": "Li e aceito os Termos de Uso e a Política de Privacidade",
  "lgpdOptional": "🎁 Quero participar dos sorteios semanais e receber ofertas exclusivas dos parceiros do Porto Cabral BC em Balneário Camboriú. Opcional. Autorizo o compartilhamento do meu perfil com parceiros para promoções personalizadas. Revogável a qualquer momento. LGPD — Lei 13.709/2018.",
  "indoor": "Interno",
  "outdoor": "Externo",
  "selectGuests": "Selecione o número de pessoas",
  "anotherReservation": "Fazer outra reserva"
}
```


---

## 10. PWA — Progressive Web App

### 10.1 Manifesto (public/manifest.json)
```json
{
  "name": "TeMesa",
  "short_name": "TeMesa",
  "description": "Gestão de reservas para restaurantes",
  "start_url": "/dashboard/reservas",
  "display": "standalone",
  "orientation": "any",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

### 10.2 next.config.js com next-pwa
```javascript
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
})

module.exports = withPWA({
  i18n: { locales: ['pt-BR', 'en', 'es'], defaultLocale: 'pt-BR' },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'krwizgdhhtgxkwdamjpc.supabase.co' }],
  },
})
```

### 10.3 Push Notifications para Hostess
```typescript
// Quando nova reserva chega via widget:
// 1. Backend emite evento via Supabase Realtime (canal reservations:restaurantId)
// 2. Hook useRealtime detecta o evento
// 3. Chama navigator.serviceWorker.ready.then(sw => sw.showNotification(...))
// Notificação: título = "Nova reserva!", body = "[nome] para [X] pessoas às [hora]"
// Ícone: logo do restaurante

// Solicitar permissão de push no primeiro login do HOSTESS/MANAGER:
const requestPushPermission = async () => {
  const permission = await Notification.requestPermission()
  // Armazenar estado no localStorage (não indexedDB — apenas booleano)
}
```

---

## 11. Componentes Globais Obrigatórios

### StatusBadge (src/components/reservas/status-badge.tsx)
```typescript
// Cores por status:
// PENDING: cinza | PENDING_PAYMENT: âmbar | CONFIRMED: azul
// CHECKED_IN: verde | FINISHED: verde-escuro | NO_SHOW: vermelho | CANCELLED: cinza-escuro
// Labels PT-BR: Pendente | Ag. Pagamento | Confirmada | Check-in | Finalizada | Não compareceu | Cancelada
```

### TableStatusDot (src/components/mesas/table-status-dot.tsx)
```typescript
// Círculo colorido pequeno para indicar status da mesa nas listas
// AVAILABLE: #22c55e | RESERVED: #3b82f6 | OCCUPIED: #f59e0b
// WAITING: #a855f7 | BLOCKED: #ef4444
```

### CustomerAvatar (src/components/clientes/customer-avatar.tsx)
```typescript
// Fallback: inicial do nome em fundo colorido (hash do nome → cor)
// Com foto: next/image circular
// Tamanhos: sm(24px), md(40px), lg(80px)
```

### ReliabilityBadge (src/components/clientes/reliability-badge.tsx)
```typescript
// Score 0-100 exibido como:
// 90-100: verde "Excelente"
// 70-89: azul "Bom"
// 50-69: âmbar "Regular"
// 0-49: vermelho "Atenção"
```

### EmptyState (src/components/ui/empty-state.tsx)
```typescript
// Ícone + título + descrição + botão de ação opcional
// Usar em: lista de reservas vazia, sem clientes, fila vazia etc.
```

---

## 12. Formulário de Nova Reserva (Dashboard — como Print 9 esquerdo)

Modal ou Sheet que abre ao clicar "+ Nova Reserva":

**Campos:**
1. Data: DatePicker (inline, não input) com destaque para dias com reservas
2. Turno: Select (carrega turnos ativos para a data selecionada)
3. Horário: Select (slots disponíveis do turno)
4. Pessoas: Stepper numérico ou chips clicáveis (1-20)
5. Mesa: Select (mesas compatíveis com o partySize, filtradas por área) ou "Atribuição automática"
6. Nome completo: Input
7. Telefone WhatsApp: Input com máscara
8. E-mail: Input
9. Ocasião: Select
10. Restrições alimentares: Textarea
11. Observações: Textarea
12. Garçom: Select (opcional)
13. Origem: Select (Manual/Telefone/WhatsApp/etc.)

**Busca de cliente existente:**
- Ao digitar telefone: busca cliente existente no CRM
- Se encontrado: preenche nome/email automaticamente com animação suave
- Exibe badge "Cliente conhecido" com visitCount e noShowCount


---

## 13. Configurações de Tema — Tela de Personalização

A tela `/configuracoes/tema` é onde o dono personaliza a identidade visual do widget.

**Layout:** split 60/40 — formulário à esquerda, preview ao vivo à direita

**Formulário:**
- Upload de logo: drag-and-drop com preview circular, suporte a PNG/SVG/JPG
- Upload de capa: drag-and-drop com preview 16:9
- Cor primária: color picker (input hex + swatch visual)
- Cor de destaque: color picker
- Fonte: select com preview — Inter | Playfair Display | Montserrat | Lato | Poppins | Cormorant Garamond
- Arredondamento: slider (0px → 24px, com preview nos botões)
- Redes sociais: campos para TripAdvisor, Instagram, Facebook, Google Reviews URL

**Preview ao vivo (direita):**
- Mini-versão do widget público com os dados reais do restaurante
- Atualiza em tempo real conforme o usuário muda os valores (sem precisar salvar)
- Botão "Salvar tema" no fundo do formulário

---

## 14. Configurações de Notificações — Tela de Templates

A tela `/configuracoes/notificacoes` permite customizar as 7 mensagens.

**Layout:** accordion por trigger, expandido ao clicar

**Cada accordion tem:**
- Toggle ON/OFF para ativar/desativar
- Tabs: PT-BR | EN | ES
- Textarea grande com a mensagem (variáveis destacadas com chip visual: `{{guestName}}`)
- Lista de variáveis disponíveis em chips clicáveis (ao clicar: insere no cursor da textarea)
- Botão "Restaurar padrão" (pequeno, discreto)
- Botão "Enviar teste" → abre modal para digitar telefone de teste

---

## 15. Padrões de UX Obrigatórios

### Loading States
- Skeleton loaders (não spinners) em todas as listas e tabelas
- Skeleton do mapa de mesas: retângulos cinza nos lugares das mesas
- Usar `<Skeleton />` do shadcn/ui

### Toast Notifications
- Usar `<Toaster />` do shadcn/ui
- Posição: canto inferior direito (desktop) / topo (mobile)
- Sucesso: verde | Erro: vermelho | Aviso: âmbar | Info: azul
- Duração: 4 segundos (erros: 6 segundos)
- Mensagens sempre em PT-BR no dashboard

### Empty States
- Cada lista vazia tem seu próprio empty state com ilustração SVG simples e call-to-action
- Ex: Lista de reservas vazia → "Nenhuma reserva para hoje" + botão "Criar primeira reserva"

### Mobile Responsividade
- Dashboard: sidebar vira bottom navigation no mobile
- Floorplan: no mobile, lista e mapa ficam em tabs (não split)
- Timeline view: scroll horizontal no mobile
- Todos os modals viram bottom sheets no mobile (usar `<Drawer />` do shadcn/ui)

### Animações (Framer Motion)
- Entrada de cards: fade + slide up suave (duration 0.2s)
- Modal/Sheet: slide from right (desktop) / slide from bottom (mobile)
- Status badge: pulse suave quando status muda
- Confetti no onboarding concluído: usar `canvas-confetti`
- NÃO usar animações em dados que atualizam frequentemente (tempo real)

### Acessibilidade
- Todos os inputs com label associado
- Botões com aria-label quando ícone sem texto
- Contraste mínimo 4.5:1 em todos os textos
- Focus ring visível em todos os elementos interativos

---

## 16. Estrutura de Pastas do Frontend

```
src/
├── app/                         (descrita anteriormente)
├── components/
│   ├── ui/                      ← shadcn/ui (auto-gerado, não editar)
│   ├── dashboard/
│   │   ├── sidebar.tsx          ← navegação lateral colapsável
│   │   ├── header.tsx           ← data, turno, avatar
│   │   └── mobile-nav.tsx       ← bottom tabs para mobile
│   ├── reservas/
│   │   ├── reservation-list.tsx ← sidebar da view Floorplan
│   │   ├── reservation-card.tsx ← item individual na lista
│   │   ├── reservation-form.tsx ← formulário nova/editar reserva
│   │   ├── reservation-detail.tsx ← painel de detalhe (Sheet)
│   │   ├── timeline-view.tsx    ← view estilo OpenTable
│   │   ├── list-view.tsx        ← view tabela simples
│   │   └── status-badge.tsx
│   ├── mesas/
│   │   ├── floor-plan-editor/   ← Konva editor (ver seção 6)
│   │   └── floor-plan-viewer.tsx ← versão read-only para /reservas
│   ├── clientes/
│   │   ├── customer-list.tsx
│   │   ├── customer-card.tsx    ← card do grid
│   │   ├── customer-profile.tsx ← perfil completo (como Print 6)
│   │   └── auto-tag-builder.tsx ← builder de condições (como Print 7)
│   ├── waitlist/
│   │   ├── waitlist-table.tsx   ← tabela da fila (como Print 2)
│   │   └── qrcode-card.tsx
│   ├── onboarding/
│   │   └── onboarding-wizard.tsx
│   └── widget/
│       ├── booking-widget.tsx   ← widget público completo
│       └── confirmation-page.tsx
├── hooks/
│   ├── use-trpc.ts              ← wrapper do tRPC client
│   ├── use-realtime.ts          ← Supabase Realtime
│   ├── use-restaurant.ts        ← contexto do restaurante atual
│   └── use-theme.ts             ← aplicar themeConfig como CSS vars
├── lib/
│   └── utils.ts                 ← cn(), formatBRL(), formatDate(), etc.
└── types/
    └── index.ts
```


---

## 17. Guia de Implementação do Widget (WIDGET_GUIDE.md)

Criar este arquivo separado na raiz do projeto para entregar ao cliente:

```markdown
# TeMesa — Guia de Implementação do Widget de Reservas

## O que é o Widget TeMesa
O Widget de Reservas TeMesa é um componente embeddable que pode ser adicionado
ao seu site em qualquer plataforma (WordPress, Webflow, Wix, HTML puro, etc.)
em menos de 2 minutos.

## Como adicionar ao seu site

### Método 1: iFrame (recomendado para a maioria dos sites)
Cole este código HTML onde deseja que o widget apareça:

<iframe
  src="https://temesa.app/r/SEU-SLUG"
  width="100%"
  height="700px"
  frameborder="0"
  scrolling="no"
  style="border-radius: 12px; max-width: 480px; margin: 0 auto; display: block; border: none;"
  title="Reservas — [Nome do seu restaurante]">
</iframe>

Substitua SEU-SLUG pelo slug do seu restaurante (ex: restaurante-alfa).

### Método 2: Página dedicada de reservas
Você pode criar uma página no seu site e simplesmente usar a URL:
https://temesa.app/r/SEU-SLUG

### Como encontrar o slug do seu restaurante
Acesse: Configurações → Geral → Campo "Slug do restaurante"

## Personalização
O widget herda automaticamente as cores e fontes configuradas em:
Configurações → Tema

## Suporte a idiomas
O widget detecta automaticamente o idioma do navegador do visitante.
Idiomas suportados: Português (padrão), English, Español.
```

---

## 18. Checklist de Entrega do Frontend

### Setup
- [ ] `pnpm create next-app` executado corretamente
- [ ] shadcn/ui inicializado com todos os componentes necessários instalados
- [ ] Konva.js + react-konva instalados e testados
- [ ] next-pwa configurado (manifest.json + ícones)
- [ ] i18n configurado com os 3 idiomas e todas as chaves do widget
- [ ] Framer Motion instalado
- [ ] Recharts instalado

### Telas Implementadas
- [ ] Sign-in / Sign-up (Clerk)
- [ ] Onboarding wizard completo (4 etapas + confetti)
- [ ] Dashboard layout (sidebar + header + bottom nav mobile)
- [ ] Página de reservas — view Floorplan (lista + mapa)
- [ ] Página de reservas — view Timeline (grade OpenTable)
- [ ] Página de reservas — view Lista (tabela)
- [ ] Painel de detalhe da reserva (Sheet com 3 tabs)
- [ ] Formulário de nova/editar reserva
- [ ] Editor de mesas Konva (toolbar + canvas + propriedades + templates de piso)
- [ ] FloorPlanViewer com cores de status em tempo real
- [ ] Waitlist (tabela dark + QR code)
- [ ] Lista de clientes (grid de cards)
- [ ] Perfil do cliente (avatar + tags + stats + histórico)
- [ ] Auto-tag builder (condições dinâmicas)
- [ ] Garçons (lista + atribuição de mesas)
- [ ] Relatórios (KPIs + 4 gráficos)
- [ ] Configurações — Geral
- [ ] Configurações — Tema (com preview ao vivo)
- [ ] Configurações — Turnos
- [ ] Configurações — Notificações (accordion + templates editáveis)
- [ ] Configurações — Auto-Tags
- [ ] Configurações — Garçons
- [ ] Configurações — Pagamento
- [ ] Configurações — Integração BC Connect
- [ ] Widget público (/r/[slug]) — 4 steps + LGPD
- [ ] Página de confirmação/cancelamento (/confirmar/[token]) — 6 estados
- [ ] WIDGET_GUIDE.md criado na raiz do projeto

### Qualidade
- [ ] Todos os loading states com skeleton (não spinner)
- [ ] Empty states em todas as listas
- [ ] Todos os modals viram bottom sheets no mobile
- [ ] Tema customizável funcionando no widget e na página de confirmação
- [ ] i18n funcionando no widget (PT-BR / EN / ES)
- [ ] PWA instalável (manifest.json válido + service worker)
- [ ] Push notification funcional para nova reserva
- [ ] Nenhum `any` no TypeScript
- [ ] `pnpm run type-check` sem erros
- [ ] Responsivo em: 375px (iPhone SE), 768px (iPad), 1280px (desktop), 1440px (wide)

---

## 19. Observações Finais Críticas

1. **O dashboard é sempre tema neutro** (preto/branco) — não aplicar themeConfig no dashboard interno
2. **O widget e a página de confirmação SEMPRE aplicam** o themeConfig do restaurante
3. **O editor Konva é separado do viewer** — o editor salva JSON, o viewer apenas lê e coloriza por status
4. **LGPD checkbox é obrigatório** para submeter o formulário do widget — sem ele não há reserva
5. **Todos os formulários usam react-hook-form + Zod** para validação client-side consistente
6. **Datas sempre em UTC** no banco — exibir sempre no fuso "America/Sao_Paulo"
7. **Valores monetários** formatados como BRL: `new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(value/100)`
8. **Telefones** com máscara brasileira no display, armazenados em E.164
9. **O painel de detalhes da reserva** deve mostrar o perfil do cliente mesmo que o cliente não tenha cadastro completo (usar guestName/guestPhone como fallback)
10. **Quando o Backend ainda não estiver pronto:** use dados mockados realistas (nomes brasileiros, endereços de Balneário Camboriú, datas de hoje) para que o agente possa implementar a UI sem depender do backend
