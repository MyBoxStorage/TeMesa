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
      guestName:   body.guestName  ?? "QA Test",
      guestPhone:  body.guestPhone ?? "+5547999990099",
      partySize:   body.partySize  ?? 2,
      date:        body.date ? new Date(body.date) : new Date(),
      shift:       shift?.id ?? "JANTAR",
      status:      body.status ?? "PENDING",
      source:      "MANUAL",
      lgpdConsent: true,
      ...(body.expiresAt && { expiresAt: new Date(body.expiresAt) }),
    },
  });
  return NextResponse.json({ id: reservation.id, status: reservation.status });
}
