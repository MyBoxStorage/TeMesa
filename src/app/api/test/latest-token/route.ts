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
