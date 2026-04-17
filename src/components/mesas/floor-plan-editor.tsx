'use client'

// ─────────────────────────────────────────────────────────────────────────────
// IMPORTS
// ─────────────────────────────────────────────────────────────────────────────
import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react'
import { Stage, Layer, Rect, Circle, Line, Text, Transformer, Group } from 'react-konva'
import type Konva from 'konva'
import { nanoid } from 'nanoid'
import { motion, AnimatePresence } from 'framer-motion'
import {
  RotateCcw, Save, ZoomIn, ZoomOut, Grid3x3, Trash2,
  Copy, ArrowUp, ArrowDown, Plus, X, Move,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { api } from '@/trpc/react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useDashboard } from '@/app/(dashboard)/dashboard/dashboard-ctx'

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
type ElementType =
  | 'TABLE_SQUARE' | 'TABLE_ROUND' | 'TABLE_RECTANGLE' | 'TABLE_BOOTH' | 'TABLE_LONG'
  | 'BAR_COUNTER' | 'STAGE' | 'PIANO' | 'STAIRS' | 'OUTDOOR'
  | 'SOFA' | 'PLANT' | 'BATHROOM' | 'DIVIDER'

type CanvasElement = {
  id: string; type: ElementType; x: number; y: number
  rotation: number; width: number; height: number
  label?: string; capacity?: number; area?: string; isTable: boolean
}

type AreaConfig = { name: string; color: string }
type FloorTemplate = 'wood' | 'dark' | 'marble' | 'black' | 'blue' | 'red' | 'white' | 'gray'

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const GRID = 20
const UNDO_LIMIT = 30
const CW = 13  // chair width
const CH = 9   // chair height
const CG = 5   // chair gap from table

const FLOOR_COLORS: Record<FloorTemplate, string> = {
  wood: '#3d2b1a', dark: '#111111', marble: '#d8d4ce', black: '#0a0a0a',
  blue: '#0d1b2a', red: '#1a0d0d', white: '#f0ede8', gray: '#1e1e1e',
}

const AREA_PALETTE = [
  '#3b82f6','#22c55e','#f59e0b','#a855f7',
  '#ec4899','#06b6d4','#f97316','#14b8a6','#8b5cf6','#ef4444',
]

const STRUCT_FILL: Partial<Record<ElementType, string>> = {
  BAR_COUNTER: 'rgba(180,140,100,0.12)', STAGE: 'rgba(60,60,90,0.18)',
  PIANO: 'rgba(30,30,30,0.25)', STAIRS: 'rgba(100,110,120,0.14)',
  OUTDOOR: 'rgba(40,120,60,0.14)', SOFA: 'rgba(120,90,70,0.14)',
  PLANT: 'rgba(40,130,40,0.18)', BATHROOM: 'rgba(70,120,150,0.12)',
  DIVIDER: 'rgba(180,180,180,0.18)',
}

// ─────────────────────────────────────────────────────────────────────────────
// TOOLBAR DEFINITIONS (SVG previews inline)
// ─────────────────────────────────────────────────────────────────────────────
type ToolbarItem = { type: ElementType; label: string; w: number; h: number; cap: number; preview: React.ReactNode }

const TableSquarePrev = () => (
  <svg viewBox="0 0 36 36" className="w-9 h-9">
    <rect x="8" y="8" width="20" height="20" rx="2" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"/>
    <rect x="12" y="2" width="12" height="5" rx="1.5" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
    <rect x="12" y="29" width="12" height="5" rx="1.5" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
    <rect x="2" y="12" width="5" height="12" rx="1.5" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
    <rect x="29" y="12" width="5" height="12" rx="1.5" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
  </svg>
)
const TableRoundPrev = () => (
  <svg viewBox="0 0 36 36" className="w-9 h-9">
    <circle cx="18" cy="18" r="10" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"/>
    <rect x="12" y="1" width="12" height="5" rx="2.5" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
    <rect x="12" y="30" width="12" height="5" rx="2.5" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
    <rect x="1" y="12" width="5" height="12" rx="2.5" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
    <rect x="30" y="12" width="5" height="12" rx="2.5" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
  </svg>
)
const TableRectPrev = () => (
  <svg viewBox="0 0 44 32" className="w-11 h-8">
    <rect x="9" y="7" width="26" height="18" rx="2" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"/>
    <rect x="12" y="1" width="8" height="5" rx="1.5" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
    <rect x="24" y="1" width="8" height="5" rx="1.5" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
    <rect x="12" y="26" width="8" height="5" rx="1.5" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
    <rect x="24" y="26" width="8" height="5" rx="1.5" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
    <rect x="3" y="11" width="5" height="10" rx="1.5" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
    <rect x="36" y="11" width="5" height="10" rx="1.5" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
  </svg>
)
const TableBoothPrev = () => (
  <svg viewBox="0 0 40 36" className="w-10 h-9">
    <path d="M6,4 Q6,28 20,28 Q34,28 34,4" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="7" strokeLinecap="round"/>
    <path d="M11,8 Q11,22 20,22 Q29,22 29,8" fill="rgba(255,255,255,0.06)" stroke="none"/>
    <ellipse cx="20" cy="15" rx="7" ry="5" fill="rgba(255,255,255,0.10)" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
    {[0.2,0.4,0.6,0.8].map((t, i) => {
      const a = Math.PI + t * Math.PI
      const x = 20 + Math.cos(a) * 8
      const y = 15 + Math.sin(a) * 5.5
      return <circle key={i} cx={x} cy={y} r="1.8" fill="rgba(255,255,255,0.18)"/>
    })}
  </svg>
)
const TableLongPrev = () => (
  <svg viewBox="0 0 56 28" className="w-14 h-7">
    <rect x="8" y="8" width="40" height="12" rx="2" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"/>
    {[10,18,26,34,42].map(x => (
      <React.Fragment key={x}>
        <rect x={x} y="1" width="7" height="5" rx="1.5" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
        <rect x={x} y="22" width="7" height="5" rx="1.5" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
      </React.Fragment>
    ))}
  </svg>
)

const TOOLBAR_SECTIONS: { label: string; items: ToolbarItem[] }[] = [
  {
    label: 'Mesas',
    items: [
      { type: 'TABLE_SQUARE',    label: 'Quadrada',   w: 70,  h: 70,  cap: 4,  preview: <TableSquarePrev /> },
      { type: 'TABLE_ROUND',     label: 'Redonda',    w: 70,  h: 70,  cap: 4,  preview: <TableRoundPrev /> },
      { type: 'TABLE_RECTANGLE', label: 'Retangular', w: 100, h: 60,  cap: 6,  preview: <TableRectPrev /> },
      { type: 'TABLE_BOOTH',     label: 'Booth',      w: 90,  h: 80,  cap: 4,  preview: <TableBoothPrev /> },
      { type: 'TABLE_LONG',      label: 'Banquete',   w: 160, h: 60,  cap: 12, preview: <TableLongPrev /> },
    ],
  },
  {
    label: 'Estrutura',
    items: [
      { type: 'BAR_COUNTER', label: 'Balcão',    w: 140, h: 50,  cap: 0, preview: null },
      { type: 'STAGE',       label: 'Palco',     w: 120, h: 80,  cap: 0, preview: null },
      { type: 'PIANO',       label: 'Piano',     w: 80,  h: 60,  cap: 0, preview: null },
      { type: 'STAIRS',      label: 'Escada',    w: 60,  h: 100, cap: 0, preview: null },
      { type: 'OUTDOOR',     label: 'Área Ext.', w: 120, h: 120, cap: 0, preview: null },
    ],
  },
  {
    label: 'Mobiliário',
    items: [
      { type: 'SOFA',     label: 'Sofá',      w: 100, h: 45,  cap: 0, preview: null },
      { type: 'PLANT',    label: 'Planta',    w: 35,  h: 35,  cap: 0, preview: null },
      { type: 'BATHROOM', label: 'Banheiro',  w: 55,  h: 55,  cap: 0, preview: null },
      { type: 'DIVIDER',  label: 'Divisória', w: 10,  h: 100, cap: 0, preview: null },
    ],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function snap(v: number) { return Math.round(v / GRID) * GRID }

function viewportCenter(sx: number, sy: number, sc: number, cw: number, ch: number) {
  return { x: snap((-sx + cw / 2) / sc), y: snap((-sy + ch / 2) / sc) }
}

function clampPos(
  pos: { x: number; y: number },
  els: CanvasElement[], cw: number, ch: number, sc: number
) {
  if (!els.length) return pos
  const M = 80
  const xs = els.flatMap(e => [e.x, e.x + e.width]).map(v => v * sc + pos.x)
  const ys = els.flatMap(e => [e.y, e.y + e.height]).map(v => v * sc + pos.y)
  let { x, y } = pos
  if (Math.max(...xs) < M)      x += M - Math.max(...xs)
  if (Math.min(...xs) > cw - M) x -= Math.min(...xs) - (cw - M)
  if (Math.max(...ys) < M)      y += M - Math.max(...ys)
  if (Math.min(...ys) > ch - M) y -= Math.min(...ys) - (ch - M)
  return { x, y }
}

type ChairCfg = { x: number; y: number; w: number; h: number }

function getChairs(type: ElementType, ew: number, eh: number, cap: number): ChairCfg[] {
  if (!cap || cap <= 0) return []
  const out: ChairCfg[] = []

  if (type === 'TABLE_ROUND') {
    const r = Math.min(ew, eh) / 2
    for (let i = 0; i < cap; i++) {
      const a = (i / cap) * 2 * Math.PI - Math.PI / 2
      const d = r + CG + CH / 2
      const cx = ew / 2 + Math.cos(a) * d
      const cy = eh / 2 + Math.sin(a) * d
      out.push({ x: cx - CW / 2, y: cy - CH / 2, w: CW, h: CH })
    }
    return out
  }

  if (type === 'TABLE_BOOTH') {
    // Chairs ONLY on the inner face of the U (top arc + sides, facing inward)
    const n = Math.min(cap, 12)
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0.5 : i / (n - 1) // 0→1
      const a = Math.PI + t * Math.PI        // PI → 2PI (top semicircle)
      const rx = ew * 0.28
      const ry = eh * 0.26
      const cx = ew / 2 + Math.cos(a) * rx
      const cy = eh * 0.38 + Math.sin(a) * ry
      out.push({ x: cx - CW / 2, y: cy - CH / 2, w: CW, h: CH })
    }
    return out
  }

  // TABLE_SQUARE / TABLE_RECTANGLE / TABLE_LONG — proportional 4 sides
  const perim = 2 * (ew + eh)
  let topN    = Math.round(cap * ew / perim)
  let botN    = Math.round(cap * ew / perim)
  let leftN   = Math.round(cap * eh / perim)
  let rightN  = cap - topN - botN - leftN
  if (rightN < 0) { topN += rightN; rightN = 0 }

  const place = (n: number, fx: (t: number) => number, fy: (t: number) => number) => {
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0.5 : i / (n - 1)
      out.push({ x: fx(t) - CW / 2, y: fy(t) - CH / 2, w: CW, h: CH })
    }
  }

  place(topN,   t => CW / 2 + t * (ew - CW),    () => -(CG + CH))
  place(botN,   t => CW / 2 + t * (ew - CW),    () => eh + CG)
  place(leftN,  () => -(CG + CH),                t => CW / 2 + t * (eh - CW))
  place(rightN, () => ew + CG,                   t => CW / 2 + t * (eh - CW))

  return out
}

type ZoneRect = { area: string; x: number; y: number; width: number; height: number; color: string }

function computeZones(els: CanvasElement[], cfgs: AreaConfig[]): ZoneRect[] {
  const P = 20
  return cfgs.flatMap(cfg => {
    const ae = els.filter(e => e.area === cfg.name)
    if (!ae.length) return []
    const xs = ae.flatMap(e => [e.x, e.x + e.width])
    const ys = ae.flatMap(e => [e.y, e.y + e.height])
    return [{
      area: cfg.name, color: cfg.color,
      x: Math.min(...xs) - P, y: Math.min(...ys) - P,
      width: Math.max(...xs) - Math.min(...xs) + 2 * P,
      height: Math.max(...ys) - Math.min(...ys) + 2 * P,
    }]
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// TABLE SHAPE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
type ShapeProps = {
  el: CanvasElement; selected: boolean; readonly: boolean
  onSelect: (id: string) => void
  onDragMove: (id: string, x: number, y: number) => void
  onDragEnd:  (id: string, x: number, y: number) => void
  onDblClick: (id: string) => void
  onMount:   (id: string, node: Konva.Group) => void
  onUnmount: (id: string) => void
}

const TableShape = React.memo(function TableShape({ el, selected, readonly, onSelect, onDragMove, onDragEnd, onDblClick, onMount, onUnmount }: ShapeProps) {
  const ref = useRef<Konva.Group>(null)

  useEffect(() => {
    if (ref.current) onMount(el.id, ref.current)
    return () => onUnmount(el.id)
  }, []) // eslint-disable-line

  const chairs = useMemo(() => getChairs(el.type, el.width, el.height, el.capacity ?? 0), [el.type, el.width, el.height, el.capacity])

  const fill = selected ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.07)'
  const stroke = selected ? '#3b82f6' : 'rgba(255,255,255,0.22)'
  const sw = selected ? 1.5 : 1
  const cx = el.width / 2
  const cy = el.height / 2

  const tableShape = (() => {
    if (el.type === 'TABLE_ROUND') {
      return <Circle x={cx} y={cy} radius={Math.min(el.width, el.height) / 2 - 1} fill={fill} stroke={stroke} strokeWidth={sw} />
    }
    if (el.type === 'TABLE_BOOTH') {
      const wt = Math.min(el.width, el.height) * 0.2
      return (
        <>
          <Rect x={0} y={0} width={el.width} height={wt * 1.5} cornerRadius={[wt * 0.8, wt * 0.8, 0, 0]} fill={fill} stroke={stroke} strokeWidth={sw} />
          <Rect x={0} y={wt * 0.5} width={wt} height={el.height - wt * 0.5} fill={fill} stroke={stroke} strokeWidth={sw} />
          <Rect x={el.width - wt} y={wt * 0.5} width={wt} height={el.height - wt * 0.5} fill={fill} stroke={stroke} strokeWidth={sw} />
          <Rect x={wt + 3} y={wt * 1.2} width={el.width - wt * 2 - 6} height={el.height - wt * 1.8} cornerRadius={3} fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.10)" strokeWidth={0.8} />
        </>
      )
    }
    return <Rect x={0} y={0} width={el.width} height={el.height} cornerRadius={4} fill={fill} stroke={stroke} strokeWidth={sw} />
  })()

  return (
    <Group
      ref={ref}
      x={el.x} y={el.y} rotation={el.rotation}
      draggable={!readonly}
      onClick={() => onSelect(el.id)}
      onTap={() => onSelect(el.id)}
      onDragMove={e => onDragMove(el.id, e.target.x(), e.target.y())}
      onDragEnd={e => onDragEnd(el.id, e.target.x(), e.target.y())}
      onDblClick={() => onDblClick(el.id)}
    >
      {chairs.map((c, i) => (
        <Rect key={i} x={c.x} y={c.y} width={c.w} height={c.h} cornerRadius={2}
          fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.16)" strokeWidth={0.8} listening={false} />
      ))}
      {tableShape}
      {el.label && (
        <Text x={0} y={cy - 9} width={el.width} text={el.label} align="center"
          fontSize={el.type === 'TABLE_LONG' ? 10 : 11} fontFamily="Inter, system-ui, sans-serif"
          fontStyle="bold" fill={selected ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.85)'} listening={false} />
      )}
      {!!el.capacity && el.capacity > 0 && (
        <Text x={0} y={cy + 1} width={el.width} text={`${el.capacity} pax`} align="center"
          fontSize={9} fontFamily="Inter, system-ui, sans-serif" fill="rgba(255,255,255,0.38)" listening={false} />
      )}
    </Group>
  )
})

// ─────────────────────────────────────────────────────────────────────────────
// STRUCTURE SHAPE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const StructureShape = React.memo(function StructureShape({ el, selected, readonly, onSelect, onDragMove, onDragEnd, onDblClick, onMount, onUnmount }: ShapeProps) {
  const ref = useRef<Konva.Group>(null)

  useEffect(() => {
    if (ref.current) onMount(el.id, ref.current)
    return () => onUnmount(el.id)
  }, []) // eslint-disable-line

  return (
    <Group
      ref={ref}
      x={el.x} y={el.y} rotation={el.rotation}
      draggable={!readonly}
      onClick={() => onSelect(el.id)}
      onTap={() => onSelect(el.id)}
      onDragMove={e => onDragMove(el.id, e.target.x(), e.target.y())}
      onDragEnd={e => onDragEnd(el.id, e.target.x(), e.target.y())}
      onDblClick={() => onDblClick(el.id)}
    >
      <Rect x={0} y={0} width={el.width} height={el.height} cornerRadius={3}
        fill={STRUCT_FILL[el.type] ?? 'rgba(255,255,255,0.04)'}
        stroke={selected ? '#3b82f6' : 'rgba(255,255,255,0.12)'}
        strokeWidth={selected ? 1.5 : 1} dash={[4, 3]} />
      {el.label && (
        <Text x={0} y={el.height / 2 - 6} width={el.width} text={el.label} align="center"
          fontSize={10} fontFamily="Inter, system-ui, sans-serif" fill="rgba(255,255,255,0.45)" listening={false} />
      )}
    </Group>
  )
})

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export function FloorPlanEditor({ restaurantId }: { restaurantId: string }) {
  const { userRole } = useDashboard()
  const isRO = userRole === 'STAFF'   // readonly

  // ── Canvas container ──────────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null)
  const [csz, setCsz] = useState({ w: 1200, h: 700 })
  useEffect(() => {
    const el = containerRef.current; if (!el) return
    const ro = new ResizeObserver(e => {
      for (const en of e) setCsz({ w: Math.floor(en.contentRect.width), h: Math.floor(en.contentRect.height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // ── Konva refs ─────────────────────────────────────────────────────────────
  const stageRef  = useRef<Konva.Stage>(null)
  const trRef     = useRef<Konva.Transformer>(null)
  const nodeMap   = useRef<Map<string, Konva.Group>>(new Map())
  const elsRef    = useRef<CanvasElement[]>([])
  const histRef   = useRef<CanvasElement[][]>([[]])
  const hidxRef   = useRef(0)

  // ── State ──────────────────────────────────────────────────────────────────
  const [elements,    setElements]    = useState<CanvasElement[]>([])
  const [selectedId,  setSelectedId]  = useState<string | null>(null)
  const [template,    setTemplate]    = useState<FloorTemplate>('dark')
  const [scale,       setScale]       = useState(1)
  const [stagePos,    setStagePos]    = useState({ x: 0, y: 0 })
  const [showGrid,    setShowGrid]    = useState(true)
  const [areaConfigs, setAreaConfigs] = useState<AreaConfig[]>([])
  const [isDirty,     setIsDirty]     = useState(false)
  const [histIdx,     setHistIdx]     = useState(0)   // display only
  const [newArea,     setNewArea]     = useState('')
  const [renameState, setRenameState] = useState<{ id: string; sx: number; sy: number; sw: number; value: string } | null>(null)
  const [delConfirmId, setDelConfirmId] = useState<string | null>(null)

  // Keep refs in sync
  useEffect(() => { elsRef.current = elements }, [elements])

  // ── Transformer sync ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!trRef.current) return
    const node = selectedId ? nodeMap.current.get(selectedId) : null
    trRef.current.nodes(node ? [node] : [])
    trRef.current.getLayer()?.batchDraw()
  }, [selectedId])

  // ── tRPC ───────────────────────────────────────────────────────────────────
  const { data: saved, isLoading } = api.floorPlan.get.useQuery(
    { restaurantId }, { enabled: !!restaurantId })

  useEffect(() => {
    if (!saved?.canvasData) return
    const d = saved.canvasData as any
    const els: CanvasElement[] = d?.elements ?? []
    const cfgs: AreaConfig[] = d?.areaConfigs ?? []
    setElements(els); elsRef.current = els
    setAreaConfigs(cfgs)
    histRef.current = [els]; hidxRef.current = 0; setHistIdx(0)
    if (saved.floorTemplate) setTemplate(saved.floorTemplate as FloorTemplate)
  }, [saved])

  const utils = api.useUtils()
  const saveMut = api.floorPlan.save.useMutation({
    onSuccess: () => { toast.success('Layout salvo!'); setIsDirty(false); utils.floorPlan.get.invalidate({ restaurantId }) },
    onError: e => toast.error(e.message),
  })

  const { data: tableList } = api.tables.list.useQuery({ restaurantId }, { enabled: !!restaurantId })

  // ── Beforeunload ──────────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (!isDirty) return; e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [isDirty])

  // ── History ────────────────────────────────────────────────────────────────
  const pushHistory = useCallback((els: CanvasElement[]) => {
    const next = [...histRef.current.slice(0, hidxRef.current + 1), els].slice(-UNDO_LIMIT)
    histRef.current = next
    hidxRef.current = next.length - 1
    setHistIdx(next.length - 1)
  }, [])

  const undo = useCallback(() => {
    if (hidxRef.current <= 0) return
    hidxRef.current -= 1
    const prev = histRef.current[hidxRef.current]
    setElements(prev); elsRef.current = prev
    setHistIdx(hidxRef.current)
    setIsDirty(true)
  }, [])

  // ── Element CRUD ──────────────────────────────────────────────────────────
  const updateElement = useCallback((id: string, patch: Partial<CanvasElement>) => {
    const next = elsRef.current.map(e => e.id === id ? { ...e, ...patch } : e)
    setElements(next); setIsDirty(true); pushHistory(next)
  }, [pushHistory])

  const addElement = useCallback((item: ToolbarItem) => {
    const c = viewportCenter(stagePos.x, stagePos.y, scale, csz.w, csz.h)
    const el: CanvasElement = {
      id: nanoid(), type: item.type, isTable: item.type.startsWith('TABLE_'),
      x: c.x - item.w / 2, y: c.y - item.h / 2,
      rotation: 0, width: item.w, height: item.h,
      capacity: item.cap > 0 ? item.cap : undefined,
    }
    const next = [...elsRef.current, el]
    setElements(next); setSelectedId(el.id); setIsDirty(true); pushHistory(next)
  }, [stagePos, scale, csz, pushHistory])

  const deleteEl = useCallback((id: string) => {
    const next = elsRef.current.filter(e => e.id !== id)
    setElements(next); setSelectedId(null); setIsDirty(true); pushHistory(next)
  }, [pushHistory])

  const duplicateEl = useCallback((id: string) => {
    const el = elsRef.current.find(e => e.id === id); if (!el) return
    const nu: CanvasElement = { ...el, id: nanoid(), x: snap(el.x + GRID * 2), y: snap(el.y + GRID * 2), label: el.label ? `${el.label} (cópia)` : undefined }
    const next = [...elsRef.current, nu]
    setElements(next); setSelectedId(nu.id); setIsDirty(true); pushHistory(next)
  }, [pushHistory])

  const bringForward = useCallback((id: string) => {
    const arr = [...elsRef.current]; const i = arr.findIndex(e => e.id === id)
    if (i < arr.length - 1) { [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]]; setElements(arr); setIsDirty(true); pushHistory(arr) }
  }, [pushHistory])

  const sendBackward = useCallback((id: string) => {
    const arr = [...elsRef.current]; const i = arr.findIndex(e => e.id === id)
    if (i > 0) { [arr[i], arr[i - 1]] = [arr[i - 1], arr[i]]; setElements(arr); setIsDirty(true); pushHistory(arr) }
  }, [pushHistory])

  // ── Drag handlers ─────────────────────────────────────────────────────────
  const handleDragMove = useCallback((id: string, x: number, y: number) => {
    const node = nodeMap.current.get(id); if (node) { node.x(snap(x)); node.y(snap(y)) }
  }, [])

  const handleDragEnd = useCallback((id: string, x: number, y: number) => {
    updateElement(id, { x: snap(x), y: snap(y) })
  }, [updateElement])

  // ── Transform handler ─────────────────────────────────────────────────────
  const handleTransformEnd = useCallback(() => {
    if (!selectedId) return
    const node = nodeMap.current.get(selectedId); if (!node) return
    const el = elsRef.current.find(e => e.id === selectedId); if (!el) return
    const nw = snap(Math.max(GRID * 2, el.width  * node.scaleX()))
    const nh = snap(Math.max(GRID * 2, el.height * node.scaleY()))
    node.scaleX(1); node.scaleY(1)
    updateElement(selectedId, { x: snap(node.x()), y: snap(node.y()), width: nw, height: nh, rotation: node.rotation() })
  }, [selectedId, updateElement])

  // ── Pan (right-click drag) ────────────────────────────────────────────────
  const panRef  = useRef(false)
  const lastPtr = useRef({ x: 0, y: 0 })

  const onMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.evt.button === 2) { panRef.current = true; lastPtr.current = { x: e.evt.clientX, y: e.evt.clientY } }
  }, [])
  const onMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!panRef.current) return
    const dx = e.evt.clientX - lastPtr.current.x
    const dy = e.evt.clientY - lastPtr.current.y
    lastPtr.current = { x: e.evt.clientX, y: e.evt.clientY }
    setStagePos(p => clampPos({ x: p.x + dx, y: p.y + dy }, elsRef.current, csz.w, csz.h, scale))
  }, [csz, scale])
  const onMouseUp = useCallback(() => { panRef.current = false }, [])

  // ── Wheel zoom ────────────────────────────────────────────────────────────
  const onWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()
    const stage = stageRef.current; if (!stage) return
    const old = scale
    const ns = Math.min(2, Math.max(0.3, old + (e.evt.deltaY > 0 ? -0.08 : 0.08)))
    const ptr = stage.getPointerPosition(); if (!ptr) return
    const mp = { x: (ptr.x - stagePos.x) / old, y: (ptr.y - stagePos.y) / old }
    setScale(ns)
    setStagePos(clampPos({ x: ptr.x - mp.x * ns, y: ptr.y - mp.y * ns }, elsRef.current, csz.w, csz.h, ns))
  }, [scale, stagePos, csz])

  // ── Keyboard shortcuts (only when canvas focused) ─────────────────────────
  const focused = useRef(false)

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!focused.current) return
      if ((document.activeElement as HTMLElement)?.tagName === 'INPUT') return
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        const el = elsRef.current.find(x => x.id === selectedId)
        if (el?.isTable && el.label && tableList?.find(t => t.name === el.label)) {
          setDelConfirmId(selectedId)
        } else { deleteEl(selectedId) }
      }
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') { e.preventDefault(); undo() }
        if (e.key === 's') { e.preventDefault(); handleSave() }
        if (e.key === 'd') { e.preventDefault(); if (selectedId) duplicateEl(selectedId) }
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [selectedId, tableList]) // eslint-disable-line

  // ── Double-click → inline rename ──────────────────────────────────────────
  const handleDblClick = useCallback((id: string) => {
    const el = elsRef.current.find(e => e.id === id); if (!el) return
    const cr = containerRef.current?.getBoundingClientRect(); if (!cr) return
    const s  = stageRef.current
    if (!s) return
    const sc2 = s.scaleX(); const sp = s.position()
    setRenameState({
      id, value: el.label ?? '',
      sx: el.x * sc2 + sp.x + cr.left,
      sy: el.y * sc2 + sp.y + cr.top,
      sw: el.width * sc2,
    })
  }, [])

  const commitRename = () => {
    if (!renameState) return
    updateElement(renameState.id, { label: renameState.value })
    setRenameState(null)
  }

  // ── Delete with confirmation ──────────────────────────────────────────────
  const handleDeleteEl = useCallback((id: string) => {
    const el = elsRef.current.find(e => e.id === id); if (!el) return
    if (el.isTable && el.label && tableList?.find(t => t.name === el.label)) {
      setDelConfirmId(id)
    } else { deleteEl(id) }
  }, [deleteEl, tableList])

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = useCallback(() => {
    if (!elsRef.current.filter(e => e.isTable).length) {
      toast.error('Adicione pelo menos 1 mesa antes de salvar.')
      return
    }
    saveMut.mutate({
      restaurantId,
      canvasData: { elements: elsRef.current, areaConfigs },
      floorTemplate: template,
      areas: areaConfigs.map(a => a.name),
    })
  }, [areaConfigs, template, restaurantId, saveMut])

  // ── Area management ───────────────────────────────────────────────────────
  const addArea = () => {
    const name = newArea.trim()
    if (!name || areaConfigs.find(a => a.name === name)) return
    setAreaConfigs(p => [...p, { name, color: AREA_PALETTE[p.length % AREA_PALETTE.length] }])
    setNewArea(''); setIsDirty(true)
  }
  const removeArea = (name: string) => {
    setAreaConfigs(p => p.filter(a => a.name !== name))
    const next = elsRef.current.map(e => e.area === name ? { ...e, area: undefined } : e)
    setElements(next); setIsDirty(true)
  }
  const cycleColor = (name: string) => {
    setAreaConfigs(p => p.map(a => {
      if (a.name !== name) return a
      const ni = (AREA_PALETTE.indexOf(a.color) + 1) % AREA_PALETTE.length
      return { ...a, color: AREA_PALETTE[ni] }
    }))
    setIsDirty(true)
  }

  // ── Derived values ────────────────────────────────────────────────────────
  const selectedEl  = elements.find(e => e.id === selectedId)
  const tableCount  = elements.filter(e => e.isTable).length
  const totalSeats  = elements.filter(e => e.isTable).reduce((s, e) => s + (e.capacity ?? 0), 0)
  const areaZones   = useMemo(() => computeZones(elements, areaConfigs), [elements, areaConfigs])

  // ── Grid lines (memoized) ─────────────────────────────────────────────────
  const gridLines = useMemo(() => {
    if (!showGrid) return null
    const SIZE = 2800; const lines: React.ReactNode[] = []
    for (let x = 0; x <= SIZE; x += GRID)
      lines.push(<Line key={`v${x}`} points={[x, 0, x, SIZE]} stroke="rgba(255,255,255,0.03)" strokeWidth={1} listening={false} />)
    for (let y = 0; y <= SIZE; y += GRID)
      lines.push(<Line key={`h${y}`} points={[0, y, SIZE, y]} stroke="rgba(255,255,255,0.03)" strokeWidth={1} listening={false} />)
    return lines
  }, [showGrid])

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full bg-background select-none">

      {/* ── LEFT TOOLBAR (hidden for STAFF) ─────────────────────────────── */}
      {!isRO && (
        <div className="w-48 shrink-0 border-r border-border bg-background overflow-y-auto py-2" style={{ scrollbarWidth: 'none' }}>
          {TOOLBAR_SECTIONS.map(sec => (
            <div key={sec.label} className="mb-3">
              <p className="px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{sec.label}</p>
              {sec.items.map(item => (
                <button key={item.type} onClick={() => addElement(item)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted/40 transition-colors text-left group">
                  <div className="w-11 h-11 rounded-lg bg-muted/40 flex items-center justify-center shrink-0 group-hover:bg-muted/60">
                    {item.preview ?? <div className="w-5 h-3 rounded border border-white/20 bg-white/5" />}
                  </div>
                  <div>
                    <p className="text-[12px] text-muted-foreground group-hover:text-foreground transition-colors leading-tight">{item.label}</p>
                    {item.cap > 0 && <p className="text-[10px] text-muted-foreground/50">{item.cap} lugares</p>}
                  </div>
                </button>
              ))}
            </div>
          ))}

          {/* Floor templates */}
          <div className="px-3 pt-2 border-t border-border mt-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Piso</p>
            <div className="grid grid-cols-4 gap-1.5">
              {(Object.keys(FLOOR_COLORS) as FloorTemplate[]).map(t => (
                <button key={t} onClick={() => { setTemplate(t); setIsDirty(true) }}
                  title={t}
                  className={cn('h-7 rounded border-2 transition-all', template === t ? 'border-primary scale-105' : 'border-transparent hover:border-border')}
                  style={{ backgroundColor: FLOOR_COLORS[t] }} />
              ))}
            </div>
          </div>

          {/* Area manager */}
          <div className="px-3 pt-3 border-t border-border mt-3">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Áreas</p>
            {areaConfigs.map(area => (
              <div key={area.name} className="flex items-center gap-1.5 mb-1.5 group">
                <div className="w-4 h-4 rounded-full cursor-pointer shrink-0 border border-white/10"
                  style={{ backgroundColor: area.color }}
                  onClick={() => cycleColor(area.name)}
                  title="Clique para mudar cor" />
                <span className="flex-1 text-[11px] text-muted-foreground truncate">{area.name}</span>
                <button onClick={() => removeArea(area.name)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-400">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            <div className="flex gap-1 mt-2">
              <input value={newArea} onChange={e => setNewArea(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addArea()}
                placeholder="Nova área..."
                className="flex-1 h-6 text-[11px] bg-muted/30 border border-border rounded px-2 outline-none focus:border-ring" />
              <button onClick={addArea}
                className="w-6 h-6 flex items-center justify-center rounded bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground">
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CANVAS AREA ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top toolbar */}
        <div className="h-10 flex items-center gap-1.5 px-3 border-b border-border bg-background/80 backdrop-blur shrink-0">
          {!isRO && (
            <>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={undo} disabled={histIdx <= 0} title="Desfazer (Ctrl+Z)">
                <RotateCcw className="w-3 h-3" />
              </Button>
              <div className="w-px h-4 bg-border" />
            </>
          )}
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setScale(s => Math.min(2, +(s + 0.1).toFixed(1)))}>
            <ZoomIn className="w-3 h-3" />
          </Button>
          <span className="text-[11px] text-muted-foreground w-9 text-center tabular-nums">{Math.round(scale * 100)}%</span>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setScale(s => Math.max(0.3, +(s - 0.1).toFixed(1)))}>
            <ZoomOut className="w-3 h-3" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" title="Centralizar" onClick={() => { setScale(1); setStagePos({ x: 0, y: 0 }) }}>
            <Move className="w-3 h-3" />
          </Button>
          <div className="w-px h-4 bg-border" />
          <Button size="icon" variant={showGrid ? 'secondary' : 'ghost'} className="h-7 w-7" onClick={() => setShowGrid(s => !s)}>
            <Grid3x3 className="w-3 h-3" />
          </Button>
          {selectedId && !isRO && (
            <>
              <div className="w-px h-4 bg-border" />
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => duplicateEl(selectedId!)} title="Duplicar (Ctrl+D)"><Copy className="w-3 h-3" /></Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => bringForward(selectedId!)} title="Subir na ordem"><ArrowUp className="w-3 h-3" /></Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => sendBackward(selectedId!)} title="Descer na ordem"><ArrowDown className="w-3 h-3" /></Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-300" onClick={() => handleDeleteEl(selectedId!)}><Trash2 className="w-3 h-3" /></Button>
            </>
          )}
          <div className="flex-1" />
          {isRO && <Badge variant="secondary" className="text-[10px] mr-2">Visualização</Badge>}
          <span className="text-[11px] text-muted-foreground">{tableCount} mesa{tableCount !== 1 ? 's' : ''} · {totalSeats} lugares</span>
          {!isRO && (
            <>
              <div className="w-px h-4 bg-border ml-2" />
              <Button size="sm" className="h-7 text-[12px] gap-1.5 ml-1"
                onClick={handleSave}
                disabled={saveMut.isPending || tableCount === 0}
                title="Salvar (Ctrl+S)">
                <Save className="w-3 h-3" />
                {saveMut.isPending ? 'Salvando...' : isDirty ? 'Salvar *' : 'Salvar'}
              </Button>
            </>
          )}
        </div>

        {/* Konva stage container */}
        <div
          ref={containerRef}
          className="flex-1 relative overflow-hidden"
          onContextMenu={e => e.preventDefault()}
          onMouseEnter={() => { focused.current = true }}
          onMouseLeave={() => { focused.current = false }}
          onClick={() => { focused.current = true }}
        >
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
            </div>
          )}

          {!isLoading && csz.w > 0 && csz.h > 0 && (
            <Stage
              ref={stageRef}
              width={csz.w} height={csz.h}
              scaleX={scale} scaleY={scale}
              x={stagePos.x} y={stagePos.y}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onWheel={onWheel}
              onClick={e => { if (e.target === e.currentTarget) setSelectedId(null) }}
              style={{ background: FLOOR_COLORS[template] }}
            >
              <Layer>
                <Rect x={0} y={0} width={2800} height={2800} fill={FLOOR_COLORS[template]} listening={false} />
                {gridLines}

                {/* Area zones */}
                {areaZones.map(z => (
                  <React.Fragment key={z.area}>
                    <Rect x={z.x} y={z.y} width={z.width} height={z.height} cornerRadius={12}
                      fill={z.color} opacity={0.08} listening={false} />
                    <Rect x={z.x} y={z.y} width={z.width} height={z.height} cornerRadius={12}
                      fill="transparent" stroke={z.color} strokeWidth={1} dash={[4, 3]} opacity={0.25} listening={false} />
                    <Text x={z.x + 10} y={z.y + 8} text={z.area} fontSize={10}
                      fontFamily="Inter, system-ui, sans-serif" fill={z.color} opacity={0.6} listening={false} />
                  </React.Fragment>
                ))}

                {/* Elements (z-order = array order) */}
                {elements.map(el =>
                  el.isTable ? (
                    <TableShape key={el.id} el={el} selected={selectedId === el.id} readonly={isRO}
                      onSelect={setSelectedId} onDragMove={handleDragMove} onDragEnd={handleDragEnd}
                      onDblClick={handleDblClick}
                      onMount={(id, node) => nodeMap.current.set(id, node)}
                      onUnmount={id => nodeMap.current.delete(id)} />
                  ) : (
                    <StructureShape key={el.id} el={el} selected={selectedId === el.id} readonly={isRO}
                      onSelect={setSelectedId} onDragMove={handleDragMove} onDragEnd={handleDragEnd}
                      onDblClick={handleDblClick}
                      onMount={(id, node) => nodeMap.current.set(id, node)}
                      onUnmount={id => nodeMap.current.delete(id)} />
                  )
                )}

                {!isRO && (
                  <Transformer ref={trRef}
                    rotateEnabled={true}
                    rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
                    anchorSize={8} anchorCornerRadius={2}
                    anchorFill="rgba(59,130,246,0.9)" anchorStroke="#3b82f6"
                    borderStroke="#3b82f6" borderStrokeWidth={1}
                    enabledAnchors={['top-left','top-center','top-right','middle-left','middle-right','bottom-left','bottom-center','bottom-right']}
                    boundBoxFunc={(_, nb) => ({
                      ...nb,
                      width:  Math.max(GRID * 2, snap(nb.width)),
                      height: Math.max(GRID * 2, snap(nb.height)),
                    })}
                    onTransformEnd={handleTransformEnd}
                  />
                )}
              </Layer>
            </Stage>
          )}

          {/* Inline rename input */}
          {renameState && (
            <input autoFocus value={renameState.value}
              onChange={e => setRenameState(p => p ? { ...p, value: e.target.value } : null)}
              onBlur={commitRename}
              onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenameState(null) }}
              style={{
                position: 'fixed', zIndex: 9999,
                left: renameState.sx, top: renameState.sy,
                width: Math.max(120, Math.min(220, renameState.sw)),
                fontSize: 12, fontWeight: 600, fontFamily: 'Inter, system-ui, sans-serif',
                background: 'rgba(12,12,12,0.92)', border: '1px solid rgba(255,255,255,0.22)',
                borderRadius: 4, color: 'rgba(255,255,255,0.92)', padding: '3px 8px',
                outline: 'none', backdropFilter: 'blur(8px)',
              }}
            />
          )}

          {/* Delete confirmation modal */}
          {delConfirmId && (
            <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/50">
              <div className="bg-card border border-border rounded-xl p-5 shadow-2xl max-w-xs w-full mx-4">
                <p className="text-[14px] font-semibold mb-1.5">Remover mesa?</p>
                <p className="text-[12px] text-muted-foreground mb-4 leading-relaxed">
                  Esta mesa já existe no banco de dados e pode ter reservas ativas. Removê-la do layout
                  não cancela as reservas existentes.
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => setDelConfirmId(null)}>Cancelar</Button>
                  <Button variant="destructive" size="sm" className="flex-1" onClick={() => { deleteEl(delConfirmId); setDelConfirmId(null) }}>Remover</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT PROPERTIES PANEL ──────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedEl ? 'props' : 'stats'}
          initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.14 }}
          className="w-52 shrink-0 border-l border-border bg-background overflow-y-auto"
          style={{ scrollbarWidth: 'none' }}
        >
          {selectedEl ? (
            <div className="p-3 space-y-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Propriedades</p>

              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">Nome</label>
                <Input value={selectedEl.label ?? ''} disabled={isRO} className="h-7 text-[12px]" placeholder="Ex: Mesa 12"
                  onChange={e => updateElement(selectedEl.id, { label: e.target.value })} />
              </div>

              {selectedEl.isTable && (
                <>
                  <div>
                    <label className="text-[11px] text-muted-foreground block mb-1">Capacidade</label>
                    <Input type="number" min={1} max={50} disabled={isRO} className="h-7 text-[12px]"
                      value={selectedEl.capacity ?? ''}
                      onChange={e => updateElement(selectedEl.id, { capacity: +e.target.value })} />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground block mb-1">Área</label>
                    <select value={selectedEl.area ?? ''} disabled={isRO}
                      onChange={e => updateElement(selectedEl.id, { area: e.target.value || undefined })}
                      className="w-full h-7 text-[12px] bg-muted/30 border border-border rounded px-2 outline-none focus:border-ring text-foreground">
                      <option value="">Sem área</option>
                      {areaConfigs.map(a => <option key={a.name} value={a.name}>{a.name}</option>)}
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">Rotação (°)</label>
                <Input type="number" step={15} disabled={isRO} className="h-7 text-[12px]"
                  value={Math.round(selectedEl.rotation)}
                  onChange={e => {
                    const node = nodeMap.current.get(selectedEl.id)
                    if (node) node.rotation(+e.target.value)
                    updateElement(selectedEl.id, { rotation: +e.target.value })
                  }} />
              </div>

              <div className="pt-2 border-t border-border space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-muted-foreground/60">Tipo</p>
                  <Badge variant="secondary" className="text-[9px]">{selectedEl.type.replace('TABLE_', '').replace('_', ' ')}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-muted-foreground/60">Tamanho</p>
                  <p className="text-[10px] text-muted-foreground">{selectedEl.width}×{selectedEl.height}</p>
                </div>
              </div>

              {!isRO && (
                <div className="pt-1 space-y-1.5">
                  <div className="grid grid-cols-2 gap-1">
                    <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={() => bringForward(selectedEl.id)}>
                      <ArrowUp className="w-2.5 h-2.5" />Frente
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={() => sendBackward(selectedEl.id)}>
                      <ArrowDown className="w-2.5 h-2.5" />Atrás
                    </Button>
                  </div>
                  <Button variant="outline" size="sm" className="w-full h-7 text-[11px] gap-1.5" onClick={() => duplicateEl(selectedEl.id)}>
                    <Copy className="w-3 h-3" />Duplicar
                  </Button>
                  <Button variant="destructive" size="sm" className="w-full h-7 text-[11px]" onClick={() => handleDeleteEl(selectedEl.id)}>
                    <Trash2 className="w-3 h-3 mr-1" />Remover
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Estatísticas</p>
              <div className="space-y-3">
                <div className="bg-muted/30 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold">{tableCount}</p>
                  <p className="text-[11px] text-muted-foreground">mesas</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold">{totalSeats}</p>
                  <p className="text-[11px] text-muted-foreground">lugares</p>
                </div>
                {areaConfigs.length > 0 && (
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-2">Por área</p>
                    <div className="space-y-1.5">
                      {areaConfigs.map(area => {
                        const cnt   = elements.filter(e => e.area === area.name && e.isTable).length
                        const seats = elements.filter(e => e.area === area.name && e.isTable).reduce((s, e) => s + (e.capacity ?? 0), 0)
                        return (
                          <div key={area.name} className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: area.color }} />
                            <span className="text-[11px] text-muted-foreground flex-1 truncate">{area.name}</span>
                            <span className="text-[10px] text-muted-foreground/60">{cnt}m·{seats}l</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
