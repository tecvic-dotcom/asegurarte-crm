"use client";

import { useState } from "react";
import { esTokenBaja } from "@/lib/lectores-reglas";

export function BotonBaja({ token }: { token: string }) {
  const [fase, setFase] = useState<"listo" | "enviando" | "hecho" | "error">("listo");
  if (!esTokenBaja(token)) {
    return <p className="text-ink-soft">Esta liga no está completa. Ábrela otra vez desde el correo, o responde a cualquiera de mis correos con la palabra «Baja».</p>;
  }
  if (fase === "hecho") {
    return (
      <p role="status" className="text-lg text-ink">
        Listo, ya no recibirás más correos sobre el libro. Gracias por haber leído la guía.
      </p>
    );
  }
  return (
    <>
      <button
        type="button"
        disabled={fase === "enviando"}
        className="btn-primary"
        onClick={async () => {
          setFase("enviando");
          try {
            const r = await fetch(`/api/lectores/baja?t=${encodeURIComponent(token)}`, { method: "POST" });
            setFase(r.ok ? "hecho" : "error");
          } catch {
            setFase("error");
          }
        }}
      >
        {fase === "enviando" ? "Un momento…" : "Sí, darme de baja"}
      </button>
      {fase === "error" && (
        <p role="alert" className="mt-4 text-sm text-[#ff9a9a]">
          No se pudo completar. Inténtalo otra vez en unos minutos, o responde a cualquiera de mis correos con la palabra «Baja».
        </p>
      )}
    </>
  );
}
