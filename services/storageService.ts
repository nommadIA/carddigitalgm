import { supabase } from "../lib/supabase";
import { compressImage } from "../lib/imageCompressor";

const BUCKET = "tenant-assets";

export async function uploadTenantAsset(tenantId: string, file: File, kind: "logo" | "background" | "avatar") {
  const compressedFile = await compressImage(file, { quality: kind === "background" ? 0.85 : 0.90 });
  const ext = (compressedFile.name.split(".").pop() || "png").toLowerCase();
  const path = `${tenantId}/${kind}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, compressedFile, { upsert: true, contentType: compressedFile.type });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadNoteAsset(tenantId: string, file: File) {
  const compressedFile = await compressImage(file, { quality: 0.83 });
  const ext = (compressedFile.name.split(".").pop() || "png").toLowerCase();
  const filename = `note_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
  const path = `${tenantId}/notes/${filename}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, compressedFile, { upsert: true, contentType: compressedFile.type });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
}

export async function uploadTimbradoA4(userId: string, file: File) {
  const compressedFile = await compressImage(file, { quality: 0.92 });
  const ext = (compressedFile.name.split(".").pop() || "png").toLowerCase();
  const path = `${userId}/timbrado_a4.${ext}`;
  
  const { error } = await supabase.storage
    .from("timbrados") 
    .upload(path, compressedFile, { upsert: true, contentType: compressedFile.type });

  if (error) throw error;

  const { data } = supabase.storage.from("timbrados").getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadBioAsset(tenantId: string | null, file: File, prefix: string = "bio"): Promise<string> {
  const isVideo = file.type.startsWith("video/");
  let fileToUpload: File = file;
  if (!isVideo && file.type.startsWith("image/")) {
    fileToUpload = await compressImage(file, { quality: 0.88 });
  }
  const ext = (fileToUpload.name.split(".").pop() || (isVideo ? "mp4" : "png")).toLowerCase();
  const filename = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
  
  // Garante que o folder seja um UUID válido para não violar a política RLS do bucket tenant-assets
  const isValidUuid = (val: string | null | undefined) => 
    Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

  let targetFolder = isValidUuid(tenantId) ? tenantId! : null;
  if (!targetFolder && typeof localStorage !== "undefined") {
    const cached = localStorage.getItem("tenant_id");
    if (isValidUuid(cached)) targetFolder = cached!;
  }
  if (!targetFolder) {
    const { data: sess } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
    const uid = sess.session?.user?.id;
    if (isValidUuid(uid)) targetFolder = uid!;
  }
  if (!targetFolder) {
    targetFolder = "6f4ee596-eb5e-415f-9189-d571ad85ed95"; // Fallback tenant oficial
  }

  const path = `${targetFolder}/bio/${filename}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, fileToUpload, { upsert: true, contentType: fileToUpload.type || (isVideo ? "video/mp4" : `image/${ext}`) });

  if (error) {
    console.error("Erro no upload para tenant-assets:", error);
    // Tentativa alternativa no bucket branding se existir
    const fallbackRes = await supabase.storage
      .from("branding")
      .upload(path, fileToUpload, { upsert: true, contentType: fileToUpload.type || (isVideo ? "video/mp4" : `image/${ext}`) })
      .catch(() => ({ error: true, data: null }));
    if (!fallbackRes.error) {
      const { data } = supabase.storage.from("branding").getPublicUrl(path);
      return data.publicUrl;
    }
    throw error;
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
