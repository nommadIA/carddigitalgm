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
  const targetTenant = tenantId || "global";
  const path = `${targetTenant}/bio/${filename}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, fileToUpload, { upsert: true, contentType: fileToUpload.type || (isVideo ? "video/mp4" : `image/${ext}`) });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
