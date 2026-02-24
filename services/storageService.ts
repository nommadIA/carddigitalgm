import { supabase } from "../lib/supabase";

const BUCKET = "tenant-assets";

export async function uploadTenantAsset(tenantId: string, file: File, kind: "logo" | "background" | "avatar") {
  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const path = `${tenantId}/${kind}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadTimbradoA4(userId: string, file: File) {
  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const path = `${userId}/timbrado_a4.${ext}`;
  
  const { error } = await supabase.storage
    .from("timbrados") 
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) throw error;

  const { data } = supabase.storage.from("timbrados").getPublicUrl(path);
  return data.publicUrl;
}
