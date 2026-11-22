import { NextResponse, type NextRequest } from "next/server";
import { PLATAFORMAS, PLATAFORMA_PRINCIPAL, VENTA_ABIERTA } from "@/lib/libro";

/** /comprar, /comprar/hotmart, /comprar/whop → pago de esa plataforma. Ver PLATAFORMAS en lib/libro.ts. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ plataforma?: string[] }> }) {
  const { plataforma } = await ctx.params;
  const clave = (plataforma?.[0] ?? PLATAFORMA_PRINCIPAL).toLowerCase();
  const liga = VENTA_ABIERTA && Object.hasOwn(PLATAFORMAS, clave) ? PLATAFORMAS[clave] : "";

  if (!liga || (plataforma?.length ?? 0) > 1) {
    return NextResponse.redirect(new URL("/libro", req.url), 302);
  }
  const destino = new URL(liga);
  req.nextUrl.searchParams.forEach((valor, nombre) => destino.searchParams.set(nombre, valor));
  return NextResponse.redirect(destino, 302);
}
