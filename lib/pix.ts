// lib/pix.ts

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function emv(id: string, value: string) {
  const len = pad2(value.length);
  return `${id}${len}${value}`;
}

function crc16(payload: string) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

// Remove acentos e caracteres especiais que quebram o QR em alguns bancos
function sanitize(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")     // remove acentos
    .replace(/[^A-Za-z0-9 \-\.]/g, "")  // remove caracteres estranhos (mantém letras, nums, espaço, ponto e traço)
    .trim();
}

export function buildPixPayload(input: {
  pixKey: string;
  merchantName: string;   // até 25 caracteres
  merchantCity: string;   // até 15 caracteres
  amount?: number;
  txid?: string;          // até 25 caracteres
  message?: string;       // opcional (curta)
}) {
  let pixKey = input.pixKey.trim();
  
  if (!pixKey) throw new Error("Chave Pix vazia");

  // Se parecer e-mail, força minúsculo e remove espaços internos (Itaú strict)
  if (pixKey.includes("@")) {
    pixKey = pixKey.toLowerCase().replace(/\s+/g, "");
  }

  const merchantName = sanitize(input.merchantName).toUpperCase().slice(0, 25) || "GM PRO";
  const merchantCity = sanitize(input.merchantCity).toUpperCase().slice(0, 15) || "SAO LUIS";
  const txid = sanitize(input.txid ?? "***").slice(0, 25) || "***";
  const message = input.message ? sanitize(input.message).slice(0, 60) : "";

  // Merchant Account Information (26): GUI + Key + (opcional) description
  const gui = emv("00", "br.gov.bcb.pix");
  const key = emv("01", pixKey);
  const desc = message ? emv("02", message) : "";
  const mai = emv("26", gui + key + desc);

  // Payload base
  const payload =
    emv("00", "01") +
    emv("01", "11") + // ✅ 11 = QR Code Estático (Maior compatibilidade, especialmente Itaú)
    mai +
    emv("52", "0000") +
    emv("53", "986") + // Moeda: BRL
    (typeof input.amount === "number" ? emv("54", input.amount.toFixed(2)) : "") +
    emv("58", "BR") +
    emv("59", merchantName) +
    emv("60", merchantCity) +
    emv("62", emv("05", txid));

  // CRC Calculation
  const toCrc = payload + "6304";
  return toCrc + crc16(toCrc);
}