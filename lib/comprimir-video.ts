/**
 * Comprime un video en el propio navegador (celular o computadora) antes de subirlo: lado largo ≤ 960 px, H.264 a ~1.3 Mbps,
 * MP4 listo para reproducirse al instante (moov al inicio). Un video de celular de 100–300 MB queda en 5–15 MB.
 * Usa WebCodecs vía mediabunny, que se descarga SOLO al elegir un video (no pesa en el resto del CRM).
 * SOLO CLIENTE.
 */
import { MAX_BYTES_PORTADA, MAX_BYTES_VIDEO, MAX_SEGUNDOS_VIDEO } from "./tarjeta-videos-reglas";

const LADO_LARGO = 960;
const BITRATE_VIDEO = 1_300_000;
const BITRATE_AUDIO = 96_000;

export interface VideoListo {
  blob: Blob;
  duracion: number;
  ancho: number;
  alto: number;
}

export class ErrorVideo extends Error {}

const par = (n: number) => Math.max(2, Math.round(n / 2) * 2);

/** ¿El navegador sabe comprimir video? (Chrome, Edge, Safari reciente y Firefox reciente sí). */
export function navegadorComprime(): boolean {
  return typeof window !== "undefined" && "VideoEncoder" in window && "VideoDecoder" in window;
}

export async function comprimirVideo(archivo: File, alProgreso: (p: number) => void): Promise<VideoListo> {
  if (!navegadorComprime()) {
    throw new ErrorVideo("Este navegador no puede comprimir videos. Abre el CRM en Chrome o Safari actualizado.");
  }
  const mb = await import("mediabunny");
  const entrada = new mb.Input({ source: new mb.BlobSource(archivo), formats: mb.ALL_FORMATS });
  try {
    const pista = await entrada.getPrimaryVideoTrack();
    if (!pista) throw new ErrorVideo("Ese archivo no parece un video. Elige un .mp4 o .mov.");
    if (!(await pista.canDecode())) {
      throw new ErrorVideo("Este navegador no puede leer ese formato de video. Prueba con Chrome, o exporta el video como .mp4.");
    }
    const duracion = Math.round(await entrada.computeDuration());
    if (duracion < 1) throw new ErrorVideo("El video está vacío.");
    if (duracion > MAX_SEGUNDOS_VIDEO) {
      throw new ErrorVideo(`El video dura ${Math.floor(duracion / 60)}:${String(duracion % 60).padStart(2, "0")}; el máximo es ${MAX_SEGUNDOS_VIDEO / 60} minutos.`);
    }

    const escala = Math.min(1, LADO_LARGO / Math.max(pista.displayWidth, pista.displayHeight));
    const ancho = par(pista.displayWidth * escala);
    const alto = par(pista.displayHeight * escala);
    const opcionesVideo = { codec: "avc" as const, width: ancho, height: alto, fit: "fill" as const, frameRate: 30, bitrate: BITRATE_VIDEO };
    if (!(await mb.canEncodeVideo("avc", { width: ancho, height: alto, bitrate: BITRATE_VIDEO }))) {
      throw new ErrorVideo("Este navegador no puede comprimir a H.264. Abre el CRM en Chrome o Safari actualizado.");
    }

    const salida = new mb.Output({ format: new mb.Mp4OutputFormat({ fastStart: "in-memory" }), target: new mb.BufferTarget() });
    const conversion = await mb.Conversion.init({
      input: entrada,
      output: salida,
      video: opcionesVideo,
      audio: { bitrate: BITRATE_AUDIO },
    });
    if (!conversion.isValid) throw new ErrorVideo("No pude preparar ese video para comprimirlo. Prueba con otro archivo.");
    conversion.onProgress = (p) => alProgreso(Math.min(1, Math.max(0, p)));
    await conversion.execute();
    alProgreso(1);

    const buffer = (salida.target as InstanceType<typeof mb.BufferTarget>).buffer;
    if (!buffer || !buffer.byteLength) throw new ErrorVideo("La compresión no produjo un video. Prueba con otro archivo.");
    let blob = new Blob([buffer], { type: "video/mp4" });
    // Si el original ya era más ligero (y es un mp4 normal), se queda el original.
    if (archivo.type === "video/mp4" && archivo.size < blob.size && archivo.size <= MAX_BYTES_VIDEO) blob = archivo;
    if (blob.size > MAX_BYTES_VIDEO) {
      throw new ErrorVideo(`Aun comprimido pesa ${(blob.size / 1048576).toFixed(0)} MB y el máximo es ${MAX_BYTES_VIDEO / 1048576} MB. Sube un video más corto.`);
    }
    return { blob, duracion, ancho, alto };
  } finally {
    entrada.dispose?.();
  }
}

/** Portada: un fotograma del video (alrededor del segundo 1) en JPG vertical de hasta 540 px de ancho. */
export async function portadaDelVideo(video: Blob, duracion: number): Promise<Blob> {
  const url = URL.createObjectURL(video);
  try {
    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.preload = "auto";
    v.src = url;
    await new Promise<void>((ok, mal) => {
      v.onloadeddata = () => ok();
      v.onerror = () => mal(new ErrorVideo("No pude sacar la portada del video."));
    });
    const alSegundo = Math.min(1, Math.max(0, duracion / 2));
    await new Promise<void>((ok) => {
      v.onseeked = () => ok();
      v.currentTime = alSegundo;
    });
    const escala = Math.min(1, 540 / Math.max(1, v.videoWidth));
    const c = document.createElement("canvas");
    c.width = par(v.videoWidth * escala);
    c.height = par(v.videoHeight * escala);
    c.getContext("2d")?.drawImage(v, 0, 0, c.width, c.height);
    for (const calidad of [0.82, 0.7, 0.55]) {
      const b = await new Promise<Blob | null>((ok) => c.toBlob(ok, "image/jpeg", calidad));
      if (b && b.size <= MAX_BYTES_PORTADA) return b;
    }
    throw new ErrorVideo("La portada salió demasiado pesada.");
  } finally {
    URL.revokeObjectURL(url);
  }
}
