"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, MoveDown, MoveUp, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SaasSwitch } from "@/components/super-admin/shared/saas-switch";
import { uploadImage } from "@/lib/storage/upload-image-client";
import { useAdminRole } from "@/components/super-admin/shell/admin-role-context";

type MediaRow = {
  key: string;
  src: string;
  alt: string | null;
  label: string | null;
  sub: string | null;
  sort_order: number | null;
  is_active: boolean | null;
};


function mediaGroupForKey(key: string): "hero" | "features" | "bento" | "contacto" | "otros" {
  if (key.startsWith("v3.hero.")) return "hero";
  if (key.startsWith("v3.feature.")) return "features";
  if (key.startsWith("v3.bento.")) return "bento";
  if (key.startsWith("v3.contact.")) return "contacto";
  return "otros";
}

function mediaTitleFromKey(key: string): string {
  if (key === "v3.hero.phone.0") return "Hero · teléfono 1";
  if (key === "v3.hero.phone.1") return "Hero · teléfono 2";
  if (key === "v3.feature.pos") return "Funciones · POS";
  if (key === "v3.feature.menu") return "Funciones · menú";
  if (key === "v3.feature.inventory") return "Funciones · inventario";
  if (key === "v3.bento.menu_mobile") return "Bento · menú móvil";
  if (key === "v3.contact.instagram") return "Contacto · Instagram";
  if (key === "v3.contact.whatsapp") return "Contacto · WhatsApp";
  return key;
}

function isContactAssetKey(key: string): boolean {
  return key.startsWith("v3.contact.");
}

/** Pestaña Editor de "Landing y tráfico": imágenes y contacto de la landing pública. */
export function LandingAdminClient() {
  const { readOnly } = useAdminRole();
  const [loading, setLoading] = useState(true);
  const [savingMedia, setSavingMedia] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [mediaRows, setMediaRows] = useState<MediaRow[]>([]);
  const [selectedMediaKey, setSelectedMediaKey] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/super-admin/landing/media", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "No se pudieron cargar las imágenes");
        if (!cancelled) setMediaRows((data.rows ?? []) as MediaRow[]);
      } catch (err) {
        if (!cancelled) {
          setMessage({ type: "error", text: err instanceof Error ? err.message : "No se pudieron cargar las imágenes" });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const orderedMediaRows = useMemo(
    () => [...mediaRows].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.key.localeCompare(b.key)),
    [mediaRows],
  );

  const selectedMediaRow = useMemo(
    () => orderedMediaRows.find((row) => row.key === selectedMediaKey) ?? null,
    [orderedMediaRows, selectedMediaKey],
  );

  const groupedMediaRows = useMemo(() => {
    const groups = {
      hero: [] as MediaRow[],
      features: [] as MediaRow[],
      bento: [] as MediaRow[],
      contacto: [] as MediaRow[],
      otros: [] as MediaRow[],
    };
    for (const row of orderedMediaRows) {
      groups[mediaGroupForKey(row.key)].push(row);
    }
    return groups;
  }, [orderedMediaRows]);

  useEffect(() => {
    if (orderedMediaRows.length === 0) {
      setSelectedMediaKey("");
      return;
    }
    if (!selectedMediaKey || !orderedMediaRows.some((row) => row.key === selectedMediaKey)) {
      setSelectedMediaKey(orderedMediaRows[0].key);
    }
  }, [orderedMediaRows, selectedMediaKey]);


  const saveMedia = async () => {
    if (readOnly) return;
    setSavingMedia(true);
    try {
      const res = await fetch("/api/super-admin/landing/media", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: mediaRows }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "No se pudieron guardar los assets");
      const mediaRes = await fetch("/api/super-admin/landing/media", { cache: "no-store" });
      const mediaData = await mediaRes.json().catch(() => ({}));
      if (mediaRes.ok) {
        setMediaRows((mediaData.rows ?? []) as MediaRow[]);
      }
      setMessage({ type: "success", text: "Landing v3 guardada. Los cambios ya están activos en la web pública." });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "No se pudieron guardar los assets" });
    } finally {
      setSavingMedia(false);
    }
  };

  const updateMediaRow = useCallback((key: string, patch: Partial<MediaRow>) => {
    setMediaRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }, []);

  const moveMediaRow = useCallback((key: string, dir: -1 | 1) => {
    setMediaRows((prev) => {
      const group = mediaGroupForKey(key);
      const list = [...prev]
        .filter((row) => mediaGroupForKey(row.key) === group)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.key.localeCompare(b.key));
      const idx = list.findIndex((row) => row.key === key);
      if (idx < 0) return prev;
      const next = idx + dir;
      if (next < 0 || next >= list.length) return prev;

      const copy = [...list];
      [copy[idx], copy[next]] = [copy[next], copy[idx]];
      const orderByKey = new Map(copy.map((row, i) => [row.key, (i + 1) * 10]));
      return prev.map((row) =>
        orderByKey.has(row.key) ? { ...row, sort_order: orderByKey.get(row.key)! } : row,
      );
    });
  }, []);

  const uploadAsset = async (key: string, file: File | null) => {
    if (!file || readOnly) return;
    setUploadingKey(key);
    try {
      const url = await uploadImage(file, "landing");
      setMediaRows((prev) => prev.map((row) => (row.key === key ? { ...row, src: url } : row)));
      setMessage({ type: "success", text: `Imagen subida para ${key}. Falta guardar cambios.` });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "No se pudo subir la imagen" });
    } finally {
      setUploadingKey(null);
    }
  };


  return (
    <div className="space-y-6">
      {message ? (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "border-red-200 bg-red-50 text-red-800 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      {loading ? (
        <Card className="rounded-2xl p-4 text-sm text-zinc-500 shadow-none dark:bg-zinc-900">Cargando imágenes…</Card>
      ) : (
        <Card className="rounded-2xl p-4 shadow-none dark:bg-zinc-900 sm:p-5">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-base font-semibold">Editor de landing v3</p>
              <p className="text-xs text-zinc-500">
                Hero, funciones, bento y contacto (Instagram / WhatsApp). Guardá para publicar en godcode.me.
              </p>
            </div>
            <Button onClick={() => void saveMedia()} disabled={readOnly || savingMedia}>
              <Save className="mr-2 h-4 w-4" />
              {savingMedia ? "Guardando..." : "Guardar assets"}
            </Button>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.05fr_1.35fr]">
            <div className="space-y-4">
              {([
                ["hero", "Hero"],
                ["features", "Funciones"],
                ["bento", "Bento"],
                ["contacto", "Contacto"],
              ] as const).map(([groupKey, title]) => {
                const list = groupedMediaRows[groupKey];
                if (list.length === 0) return null;
                return (
                  <div key={groupKey} className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-700">
                    <p className="mb-2 text-[13px] font-medium text-zinc-700 dark:text-zinc-200">{title}</p>
                    <div className="space-y-2">
                      {list.map((row) => {
                        const active = row.key === selectedMediaKey;
                        return (
                          <button
                            key={row.key}
                            type="button"
                            onClick={() => setSelectedMediaKey(row.key)}
                            className={`flex w-full items-center gap-3 rounded-lg border p-2 text-left transition ${
                              active
                                ? "border-indigo-300 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-950/30"
                                : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900"
                            }`}
                          >
                            <div className="relative flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded bg-zinc-100 dark:bg-zinc-800">
                              {isContactAssetKey(row.key) ? (
                                <span className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">
                                  {row.key.includes("instagram") ? "IG" : "WA"}
                                </span>
                              ) : (
                                <Image src={row.src} alt={row.alt || row.key} fill sizes="64px" className="object-cover" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-semibold text-zinc-800 dark:text-zinc-100">{mediaTitleFromKey(row.key)}</p>
                              <p className="truncate text-[11px] text-zinc-500">{row.key}</p>
                            </div>
                            <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${row.is_active !== false ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"}`}>
                              {row.is_active !== false ? "on" : "off"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-4">
              {selectedMediaRow ? (
                <>
                  <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-700">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">{mediaTitleFromKey(selectedMediaRow.key)}</p>
                        <p className="text-xs text-zinc-500">{selectedMediaRow.key}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="inline-flex h-8 w-8 items-center justify-center rounded border border-zinc-200 dark:border-zinc-700"
                          onClick={() => moveMediaRow(selectedMediaRow.key, -1)}
                          disabled={readOnly}
                          title="Mover arriba"
                        >
                          <MoveUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="inline-flex h-8 w-8 items-center justify-center rounded border border-zinc-200 dark:border-zinc-700"
                          onClick={() => moveMediaRow(selectedMediaRow.key, 1)}
                          disabled={readOnly}
                          title="Mover abajo"
                        >
                          <MoveDown className="h-4 w-4" />
                        </button>
                        <SaasSwitch
                          checked={selectedMediaRow.is_active !== false}
                          onChange={(checked) => updateMediaRow(selectedMediaRow.key, { is_active: checked })}
                          label="Activo"
                          disabled={readOnly}
                        />
                        <a
                          href={selectedMediaRow.src}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-8 items-center gap-1 rounded border border-zinc-200 px-2 text-xs dark:border-zinc-700"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          abrir
                        </a>
                      </div>
                    </div>

                    {!isContactAssetKey(selectedMediaRow.key) ? (
                      <div className="relative mb-3 h-64 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700">
                        <Image
                          src={selectedMediaRow.src}
                          alt={selectedMediaRow.alt || selectedMediaRow.key}
                          fill
                          sizes="(max-width: 768px) 100vw, 720px"
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="mb-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-300">
                        Valor publicado: <span className="font-medium text-zinc-900 dark:text-zinc-100">{selectedMediaRow.src}</span>
                      </div>
                    )}

                    <div className="mb-3 grid gap-2 sm:grid-cols-2">
                      <Input
                        value={selectedMediaRow.src}
                        onChange={(e) => updateMediaRow(selectedMediaRow.key, { src: e.target.value })}
                        placeholder={isContactAssetKey(selectedMediaRow.key) ? "URL o número" : "URL imagen"}
                        disabled={readOnly}
                      />
                      <Input
                        value={selectedMediaRow.alt ?? ""}
                        onChange={(e) => updateMediaRow(selectedMediaRow.key, { alt: e.target.value })}
                        placeholder="Alt / descripción"
                        disabled={readOnly}
                      />
                      {selectedMediaRow.key.startsWith("v3.hero.") ? (
                        <Input
                          value={selectedMediaRow.label ?? ""}
                          onChange={(e) => updateMediaRow(selectedMediaRow.key, { label: e.target.value })}
                          placeholder="Etiqueta del teléfono"
                          disabled={readOnly}
                        />
                      ) : null}
                    </div>

                    {!isContactAssetKey(selectedMediaRow.key) ? (
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs dark:border-zinc-700">
                        {uploadingKey === selectedMediaRow.key ? "Subiendo..." : "Subir imagen"}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => void uploadAsset(selectedMediaRow.key, e.target.files?.[0] ?? null)}
                          disabled={readOnly || uploadingKey === selectedMediaRow.key}
                        />
                      </label>
                    </div>
                    ) : null}
                  </div>

                  <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-700">
                    <p className="mb-2 text-[13px] font-medium text-zinc-700 dark:text-zinc-200">Preview landing v3</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
                        <div className="relative h-32 w-full">
                          <Image src={(orderedMediaRows.find((r) => r.key === "v3.hero.phone.0")?.src) || selectedMediaRow.src} alt="Hero teléfono 1" fill sizes="(max-width: 768px) 100vw, 320px" className="object-cover" />
                        </div>
                        <p className="px-2 py-1 text-[11px] text-zinc-500">Hero teléfono 1</p>
                      </div>
                      <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
                        <div className="relative h-32 w-full">
                          <Image src={(orderedMediaRows.find((r) => r.key === "v3.feature.menu")?.src) || selectedMediaRow.src} alt="Funciones menú" fill sizes="(max-width: 768px) 100vw, 320px" className="object-cover" />
                        </div>
                        <p className="px-2 py-1 text-[11px] text-zinc-500">Funciones · menú</p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
                  Selecciona una imagen para abrir el editor visual.
                </div>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
