import fetch from "node-fetch";
import * as XLSX from "xlsx";

/* ====== CORS ====== */
const ALLOWED_ORIGINS = [
  "https://sistemainformaciondap.netlify.app",
  "https://time-line-proyectos-lyart.vercel.app",
  "https://time-line-proyectos-git-master-camilomadrigal12s-projects.vercel.app",
  "https://time-line-proyectos-ten.vercel.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost:5502",
  "http://127.0.0.1:5502",
];
function setCORS(req, res) {
  const origin = req.headers.origin;
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : "*";
  res.setHeader("Access-Control-Allow-Origin", allowOrigin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (allowOrigin !== "*") res.setHeader("Access-Control-Allow-Credentials", "true");
}

/* ====== Auth a Graph ====== */
async function getGraphToken() {
  const tenant = process.env.GRAPH_TENANT_ID;
  const clientId = process.env.GRAPH_CLIENT_ID;
  const secret = process.env.GRAPH_CLIENT_SECRET;

  const form = new URLSearchParams();
  form.set("client_id", clientId);
  form.set("client_secret", secret);
  form.set("grant_type", "client_credentials");
  form.set("scope", "https://graph.microsoft.com/.default");

  const resp = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    throw new Error(`Token Graph fallo: HTTP ${resp.status} ${resp.statusText} ${t}`);
  }
  const json = await resp.json();
  return json.access_token;
}

/* ====== Localizar el archivo en Graph ======
   Opción A: DRIVE_ID + ITEM_ID
   Opción B: SHARE_LINK -> driveItem (usando /shares)
*/
async function getDownloadUrl(token) {
  const shareLink = process.env.GRAPH_SHARE_LINK; // opcional
  if (shareLink) {
    // codificación especial "u!" + base64 de la URL
    const b64 = Buffer.from(shareLink, "utf8").toString("base64").replace(/=+$/g, "");
    const encoded = `u!${b64}`;
    const resp = await fetch(`https://graph.microsoft.com/v1.0/shares/${encoded}/driveItem`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) {
      const t = await resp.text().catch(() => "");
      throw new Error(`shares/driveItem fallo: HTTP ${resp.status} ${resp.statusText} ${t}`);
    }
    const item = await resp.json();
    // endpoint de contenido del archivo
    return `https://graph.microsoft.com/v1.0/drives/${item.parentReference.driveId}/items/${item.id}/content`;
  }

  // Opción A: ids directos
  const driveId = process.env.GRAPH_DRIVE_ID;
  const itemId = process.env.GRAPH_ITEM_ID;
  if (!driveId || !itemId) throw new Error("Falta GRAPH_DRIVE_ID o GRAPH_ITEM_ID o GRAPH_SHARE_LINK");
  return `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${itemId}/content`;
}

/* ====== Utilidades ====== */
function normalizeLic(val) {
  return String(val ?? "")
    .normalize("NFKD")
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/\s+/g, "")
    .toUpperCase();
}

/* ====== Handler ====== */
export default async function handler(req, res) {
  setCORS(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido", allowedMethods: ["POST"] });

  const { licencia } = req.body || {};
  if (!licencia) return res.status(400).json({ error: "No se recibió número de licencia", required: "licencia" });

  const target = normalizeLic(licencia);

  try {
    // 1) Token y URL de descarga interna (sin público)
    const token = await getGraphToken();
    const fileUrl = await getDownloadUrl(token);

    // 2) Descargar binario XLSX desde Graph
    const resp = await fetch(fileUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Accept": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
      // @ts-ignore node-fetch v2
      timeout: 30000,
      redirect: "follow",
    });
    if (!resp.ok) {
      const t = await resp.text().catch(() => "");
      return res.status(resp.status || 502).json({
        error: "No se pudo leer el archivo desde Graph",
        details: `HTTP ${resp.status} ${resp.statusText}`,
        sample: t.slice(0, 300),
      });
    }

    const buf = Buffer.from(await resp.arrayBuffer());
    const wb = XLSX.read(buf, { type: "buffer" });

    // Hojas preferidas; si cambian los nombres igual usamos todas
    const preferidas = wb.SheetNames.filter((n) => /2024|2025/i.test(n));
    const hojas = preferidas.length ? preferidas : wb.SheetNames;

    let resultados = [];
    let total = 0;

    for (const sheetName of hojas) {
      const ws = wb.Sheets[sheetName];
      if (!ws) continue;
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: false });
      const limpias = rows.filter((r) => Array.isArray(r) && r.some((c) => String(c).trim() !== ""));
      total += limpias.length;

      for (const r of limpias) {
        const rdo = normalizeLic(r[0] ?? ""); // Columna A = RDO/Nro Licencia
        if (rdo === target) {
          resultados.push({
            RDO: r[0] ?? "",
            F_L_REV: r[38] ?? "", // AM
            ESTADO: r[39] ?? "",  // AN
            HOJA: sheetName,
          });
        }
      }
    }

    if (!resultados.length) {
      return res.status(404).json({
        mensaje: "No se encontró la licencia",
        licenciaBuscada: licencia,
        licenciaNormalizada: target,
        hojasConsultadas: hojas,
        totalFilasProcesadas: total,
      });
    }

    const datos = resultados.map((r) => ({
      LICENCIA: r.RDO,
      ESTADO: r.ESTADO,
      FECHA_DE_VENCIMIENTO: r.F_L_REV,
      HOJA: r.HOJA,
      ANO: /2025/.test(r.HOJA) ? "2025" : /2024/.test(r.HOJA) ? "2024" : "",
    }));

    return res.status(200).json({
      datos,
      encontrado: true,
      totalResultados: datos.length,
      timestamp: new Date().toISOString(),
      tipo: "licencia",
    });
  } catch (e) {
    const msg = String(e?.message || e);
    const code = /timeout/i.test(msg) ? 504
               : /ENOTFOUND|ECONNRESET|EAI_AGAIN/i.test(msg) ? 503
               : 500;
    return res.status(code).json({
      error: code === 504 ? "Timeout al consultar Graph"
           : code === 503 ? "Error de conexión con Graph"
           : "Error interno del servidor",
      details: msg,
      timestamp: new Date().toISOString(),
    });
  }
}
