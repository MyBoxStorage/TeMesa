-- TeMesa — Schema completo
-- Cole no SQL Editor do Supabase e clique em Run
--
-- IMPORTANTE: Este arquivo é a fonte de verdade para o banco de dados.
-- O Prisma usa "prisma db push" com DIRECT_URL (porta 5432, não o pooler 6543).
-- Se adicionar models ao schema.prisma, adicione a DDL equivalente aqui também.

-- ENUMS
CREATE TYPE "StaffRole" AS ENUM ('OWNER','MANAGER','HOSTESS','STAFF');
CREATE TYPE "TableStatus" AS ENUM ('AVAILABLE','RESERVED','OCCUPIED','WAITING','BLOCKED');
CREATE TYPE "TableShape" AS ENUM ('SQUARE','ROUND','RECTANGLE','BOOTH','LONG_RECTANGLE');
CREATE TYPE "ReservationStatus" AS ENUM ('PENDING','PENDING_PAYMENT','CONFIRMED','CHECKED_IN','FINISHED','NO_SHOW','CANCELLED');
CREATE TYPE "ReservationSource" AS ENUM ('MANUAL','WIDGET','WHATSAPP','IFOOD','PHONE');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING','PAID','REFUNDED','PARTIAL_REFUND','EXPIRED');
CREATE TYPE "WaitlistStatus" AS ENUM ('WAITING','NOTIFIED','CONFIRMED','DECLINED','EXPIRED');
CREATE TYPE "NotificationTrigger" AS ENUM ('RESERVATION_CREATED','REMINDER_24H','REMINDER_2H','PAYMENT_CONFIRMED','WAITLIST_AVAILABLE','POST_VISIT','CANCELLED');
CREATE TYPE "NotificationChannel" AS ENUM ('WHATSAPP','EMAIL');

-- TABLES
CREATE TABLE "User" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "clerkId" TEXT NOT NULL UNIQUE,
  "email" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "phone" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Restaurant" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "cnpj" TEXT,
  "phone" TEXT NOT NULL,
  "address" JSONB NOT NULL,
  "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  "logoUrl" TEXT,
  "coverUrl" TEXT,
  "themeConfig" JSONB,
  "operatingHours" JSONB NOT NULL,
  "prepaymentConfig" JSONB,
  "onboardingStatus" JSONB NOT NULL DEFAULT '{"restaurant":false,"shifts":false,"tables":false,"notifications":false}',
  "bcConnectPartnerId" TEXT,
  "bcConnectApiKey" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "UserRestaurant" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "restaurantId" TEXT NOT NULL REFERENCES "Restaurant"("id") ON DELETE CASCADE,
  "role" "StaffRole" NOT NULL DEFAULT 'STAFF',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("userId","restaurantId")
);

CREATE TABLE "FloorPlan" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "restaurantId" TEXT NOT NULL UNIQUE REFERENCES "Restaurant"("id") ON DELETE CASCADE,
  "canvasData" JSONB NOT NULL,
  "floorTemplate" TEXT NOT NULL DEFAULT 'wood',
  "areas" TEXT[] NOT NULL DEFAULT ARRAY['Salão'],
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Table" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "restaurantId" TEXT NOT NULL REFERENCES "Restaurant"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "capacity" INTEGER NOT NULL,
  "minCapacity" INTEGER NOT NULL DEFAULT 1,
  "area" TEXT,
  "posX" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "posY" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "shape" "TableShape" NOT NULL DEFAULT 'SQUARE',
  "rotation" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "status" "TableStatus" NOT NULL DEFAULT 'AVAILABLE'
);

CREATE TABLE "Shift" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "restaurantId" TEXT NOT NULL REFERENCES "Restaurant"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "daysOfWeek" INTEGER[] NOT NULL,
  "maxCapacity" INTEGER,
  "turnDuration" INTEGER NOT NULL DEFAULT 90,
  "isActive" BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE "Customer" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "restaurantId" TEXT NOT NULL REFERENCES "Restaurant"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "email" TEXT,
  "birthdate" TIMESTAMP(3),
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "preferences" JSONB,
  "notes" TEXT,
  "lgpdConsent" BOOLEAN NOT NULL DEFAULT false,
  "lgpdConsentAt" TIMESTAMP(3),
  "noShowCount" INTEGER NOT NULL DEFAULT 0,
  "visitCount" INTEGER NOT NULL DEFAULT 0,
  "totalSpentCents" INTEGER NOT NULL DEFAULT 0,
  "reliabilityScore" DOUBLE PRECISION NOT NULL DEFAULT 100,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("restaurantId","phone")
);

CREATE TABLE "Server" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "restaurantId" TEXT NOT NULL REFERENCES "Restaurant"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "userId" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE "Reservation" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "restaurantId" TEXT NOT NULL REFERENCES "Restaurant"("id"),
  "customerId" TEXT REFERENCES "Customer"("id"),
  "tableId" TEXT REFERENCES "Table"("id"),
  "shiftId" TEXT REFERENCES "Shift"("id"),
  "serverId" TEXT REFERENCES "Server"("id"),
  "guestName" TEXT NOT NULL,
  "guestPhone" TEXT NOT NULL,
  "guestEmail" TEXT,
  "partySize" INTEGER NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "status" "ReservationStatus" NOT NULL DEFAULT 'PENDING',
  "occasion" TEXT,
  "notes" TEXT,
  "dietaryNotes" TEXT,
  "source" "ReservationSource" NOT NULL DEFAULT 'MANUAL',
  "confirmToken" TEXT UNIQUE,
  "confirmTokenExpiresAt" TIMESTAMP(3),
  "lgpdConsent" BOOLEAN NOT NULL DEFAULT false,
  "lgpdConsentAt" TIMESTAMP(3),
  "bcConnectSent" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "ReservationStatusHistory" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "reservationId" TEXT NOT NULL REFERENCES "Reservation"("id") ON DELETE CASCADE,
  "fromStatus" "ReservationStatus",
  "toStatus" "ReservationStatus" NOT NULL,
  "changedBy" TEXT,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "PrepaymentRecord" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "reservationId" TEXT NOT NULL UNIQUE REFERENCES "Reservation"("id"),
  "amountCents" INTEGER NOT NULL,
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "pixCode" TEXT,
  "pixQrCodeUrl" TEXT,
  "pagarmeOrderId" TEXT,
  "paidAt" TIMESTAMP(3),
  "refundedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3)
);

CREATE TABLE "WaitlistEntry" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "restaurantId" TEXT NOT NULL REFERENCES "Restaurant"("id") ON DELETE CASCADE,
  "shiftId" TEXT REFERENCES "Shift"("id"),
  "guestName" TEXT NOT NULL,
  "guestPhone" TEXT NOT NULL,
  "guestEmail" TEXT,
  "partySize" INTEGER NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "position" INTEGER NOT NULL,
  "status" "WaitlistStatus" NOT NULL DEFAULT 'WAITING',
  "notifiedAt" TIMESTAMP(3),
  "responseDeadline" TIMESTAMP(3),
  "confirmToken" TEXT UNIQUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "NotificationTemplate" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "restaurantId" TEXT NOT NULL REFERENCES "Restaurant"("id") ON DELETE CASCADE,
  "trigger" "NotificationTrigger" NOT NULL,
  "channel" "NotificationChannel" NOT NULL,
  "templatePtBr" TEXT NOT NULL,
  "templateEn" TEXT,
  "templateEs" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  UNIQUE("restaurantId","trigger","channel")
);

CREATE TABLE "AutoTag" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "restaurantId" TEXT NOT NULL REFERENCES "Restaurant"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "color" TEXT NOT NULL DEFAULT '#6366f1',
  "icon" TEXT,
  "conditions" JSONB NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "ServerTableAssignment" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "serverId" TEXT NOT NULL REFERENCES "Server"("id") ON DELETE CASCADE,
  "tableId" TEXT NOT NULL REFERENCES "Table"("id") ON DELETE CASCADE,
  "date" DATE NOT NULL,
  "shiftId" TEXT,
  UNIQUE("serverId","tableId","date")
);

-- Informar ao Prisma que as migrations foram aplicadas
INSERT INTO "_prisma_migrations" ("id","checksum","finished_at","migration_name","logs","rolled_back_at","started_at","applied_steps_count")
VALUES ('temesa-init','0000000000000000000000000000000000000000000000000000000000000000',NOW(),'temesa_init',NULL,NULL,NOW(),1)
ON CONFLICT DO NOTHING;

-- ── ADMIN & INVITATIONS ───────────────────────────────────────────────────────

-- Add isAdmin flag to existing User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isAdmin" BOOLEAN NOT NULL DEFAULT false;

-- Add plan field to existing Restaurant table
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "plan" TEXT NOT NULL DEFAULT 'GRATUITO';

-- InvitationStatus enum
DO $$ BEGIN
  CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'USED', 'EXPIRED', 'REVOKED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Invitation table
CREATE TABLE IF NOT EXISTS "Invitation" (
  "id"             TEXT        NOT NULL PRIMARY KEY,
  "email"          TEXT        NOT NULL,
  "restaurantName" TEXT        NOT NULL,
  "token"          TEXT        NOT NULL UNIQUE,
  "status"         "InvitationStatus" NOT NULL DEFAULT 'PENDING',
  "expiresAt"      TIMESTAMP(3) NOT NULL,
  "usedAt"         TIMESTAMP(3),
  "notes"          TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "Invitation_email_idx" ON "Invitation"("email");
CREATE INDEX IF NOT EXISTS "Invitation_token_idx" ON "Invitation"("token");

-- How to make yourself admin (run after first sign-up):
-- UPDATE "User" SET "isAdmin" = true WHERE email = 'seu@email.com';
-- Tabela de contadores para rate limiting serverless (widget público).
-- Upsert atômico garante corretude entre múltiplas instâncias do Vercel.
CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  key       TEXT        PRIMARY KEY,
  count     INTEGER     NOT NULL DEFAULT 1,
  "resetAt" TIMESTAMPTZ NOT NULL
);

-- Lembranças / pós-visita: evita reenvio duplicado pelo cron
ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "reminder24hSentAt" TIMESTAMPTZ;
ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "reminder2hSentAt" TIMESTAMPTZ;
ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "postVisitSentAt" TIMESTAMPTZ;
