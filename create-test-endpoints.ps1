# =============================================================================
# create-test-endpoints.ps1
# Compativel com Windows PowerShell 5.x e PowerShell 7+
# Execute com: pwsh -ExecutionPolicy Bypass -File .\create-test-endpoints.ps1
# =============================================================================

$base = "app\api\test"

# Helper: cria arquivo com conteudo, usando LiteralPath para evitar problema
# com colchetes [ ] em nomes de pasta (Next.js usa [id], [slug], etc.)
function Write-RouteFile {
  param([string]$Path, [string]$Content)
  $dir = Split-Path $Path -Parent
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
  [System.IO.File]::WriteAllText(
    (Join-Path (Get-Location) $Path),
    $Content,
    [System.Text.Encoding]::UTF8
  )
}

# -----------------------------------------------------------------------------
# 1. GET /api/test/latest-token
# -----------------------------------------------------------------------------
Write-RouteFile "$base\latest-token\route.ts" @'
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  if (process.env.NODE_ENV !== "test") {
    return new Response("Forbidden", { status: 403 });
  }

  const reservation = await prisma.reservation.findFirst({
    orderBy: { createdAt: "desc" },
    select: { confirmToken: true },
  });

  return NextResponse.json({ token: reservation?.confirmToken ?? null });
}
'@

# -----------------------------------------------------------------------------
# 2. GET /api/test/finished-token
# -----------------------------------------------------------------------------
Write-RouteFile "$base\finished-token\route.ts" @'
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  if (process.env.NODE_ENV !== "test") {
    return new Response("Forbidden", { status: 403 });
  }

  const reservation = await prisma.reservation.findFirst({
    where: { status: "FINISHED" },
    orderBy: { updatedAt: "desc" },
    select: { confirmToken: true },
  });

  return NextResponse.json({ token: reservation?.confirmToken ?? null });
}
'@

# -----------------------------------------------------------------------------
# 3. POST /api/test/create-test-reservation
# -----------------------------------------------------------------------------
Write-RouteFile "$base\create-test-reservation\route.ts" @'
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  if (process.env.NODE_ENV !== "test") {
    return new Response("Forbidden", { status: 403 });
  }

  const body = await req.json();

  const restaurant = await prisma.restaurant.findFirst({
    where: { slug: "porto-cabral-bc" },
  });

  if (!restaurant) {
    return new Response("Restaurant not found", { status: 404 });
  }

  const shift = await prisma.shift.findFirst({
    where: { restaurantId: restaurant.id, isActive: true },
    select: { id: true },
  });

  const reservation = await prisma.reservation.create({
    data: {
      restaurantId: restaurant.id,
      guestName:    body.guestName  ?? "QA Test",
      guestPhone:   body.guestPhone ?? "+5547999990099",
      partySize:    body.partySize  ?? 2,
      date:         body.date ? new Date(body.date) : new Date(),
      shift:        shift?.id ?? "JANTAR",
      status:       body.status ?? "PENDING",
      source:       "MANUAL",
      lgpdConsent:  true,
      ...(body.expiresAt && { expiresAt: new Date(body.expiresAt) }),
    },
  });

  return NextResponse.json({ id: reservation.id, status: reservation.status });
}
'@

# -----------------------------------------------------------------------------
# 4. GET /api/test/reservation/[id]
# -----------------------------------------------------------------------------
Write-RouteFile "app\api\test\reservation\[id]\route.ts" @'
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  if (process.env.NODE_ENV !== "test") {
    return new Response("Forbidden", { status: 403 });
  }

  const reservation = await prisma.reservation.findUnique({
    where: { id: params.id },
    select: { id: true, status: true, guestName: true },
  });

  if (!reservation) {
    return new Response("Not found", { status: 404 });
  }

  return NextResponse.json(reservation);
}
'@

# -----------------------------------------------------------------------------
# 5. DELETE /api/test/restaurant/[slug]
# -----------------------------------------------------------------------------
Write-RouteFile "app\api\test\restaurant\[slug]\route.ts" @'
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  if (process.env.NODE_ENV !== "test") {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    await prisma.restaurant.delete({ where: { slug: params.slug } });
    return NextResponse.json({ deleted: true });
  } catch {
    return NextResponse.json({ deleted: false }, { status: 404 });
  }
}
'@

# -----------------------------------------------------------------------------
# Confirmar arquivos criados
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host "Endpoints criados com sucesso:" -ForegroundColor Green
$arquivos = @(
  "app/api/test/latest-token/route.ts",
  "app/api/test/finished-token/route.ts",
  "app/api/test/create-test-reservation/route.ts",
  "app/api/test/reservation/[id]/route.ts",
  "app/api/test/restaurant/[slug]/route.ts"
)
foreach ($f in $arquivos) {
  $fullPath = Join-Path (Get-Location) $f.Replace("/", "\")
  if (Test-Path -LiteralPath $fullPath) {
    Write-Host "  [OK] /$f" -ForegroundColor Cyan
  } else {
    Write-Host "  [ERRO] /$f" -ForegroundColor Red
  }
}

Write-Host ""
Write-Host "Importante: esses endpoints so respondem com NODE_ENV=test" -ForegroundColor Yellow
Write-Host "Para rodar o servidor em modo test:" -ForegroundColor Yellow
Write-Host '  $env:NODE_ENV="test"; pnpm dev' -ForegroundColor White
