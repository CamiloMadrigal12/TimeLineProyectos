import fetch from "node-fetch";
import * as XLSX from "xlsx";

// ⚠️ Pega aquí el link público de descarga (download.aspx?share=...).
const EXCEL_URL_LICENCIAS = "https://.../download.aspx?share=XXXXXXXX";

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
  // Solo anuncia credenciales si NO usas "*"
  if (allowOrigin !== "*") res.setHeader("Access-Control-Allow-Credentials", "true");
}

function normalizeLic(val) {
  // Normaliza espacios, guiones y mayúsculas.
  // Estandariza guiones (— – − → -), quita espacios extra y tildes.
  const s = String(val ?? "")
    .normalize("NFKD")
    .replace(/[\u2010-\u2015\u2212]/g, "-") // distintos tipos de guion a '-'
    .replace(/\s+/g, "")
    .toUpperCase();
  return s;
}

export default async function handler(req, res) {
  setCORS(req, res);

  // Preflight
  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido", allowedMethods: ["POST"] });
  }

  const { licencia } = req.body || {};
  if (!licencia || String(licencia).trim() === "") {
    return res.status(400).json({ error: "No se recibió número de licencia", required: "licencia" });
  }

  // Licencia buscada en formato normalizado
  const target = normalizeLic(licencia);

  try {
    // Descarga del Excel
    const response = await fetch(EXCEL_URL_LICENCIAS, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,*/*",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
      // @ts-ignore: node-fetch v2 soporta timeout
      timeout: 25000,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return res.status(response.status || 500).json({
        error: "No se pudo descargar el archivo desde SharePoint",
        details: `HTTP ${response.status} ${response.statusText}`.trim(),
        sample: body.slice(0, 300),
        hint: "Valida que el enlace público descargue en modo incógnito.",
      });
    }

    const buf = Buffer.from(await response.arrayBuffer());
    const workbook = XLSX.read(buf, { type: "buffer" });

    // Hojas candidatas (2024/2025); si no, usa todas
    const preferidas = workbook.SheetNames.filter(
      (n) => /2024|2025/i.test(n)
    );
    const hojas = preferidas.length ? preferidas : workbook.SheetNames;

    let resultados = [];
    let totalFilasProcesadas = 0;

    for (const nombreHoja of hojas) {
      const ws = workbook.Sheets[nombreHoja];
      if (!ws) continue;

      // Array de arrays para evitar depender de cabeceras
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: false });
      const limpias = rows.filter((r) => Array.isArray(r) && r.some((c) => String(c).trim() !== ""));
      totalFilasProcesadas += limpias.length;

      // Columna A (índice 0) es el RDO / número de licencia en tu archivo
      for (const row of limpias) {
        const rdo = normalizeLic(row[0] ?? "");
        if (rdo && rdo === target) {
          resultados.push({
            RDO: row[0] ?? "",
            F_L_REV: row[38] ?? "", // Columna AM
            ESTADO: row[39] ?? "",  // Columna AN
            HOJA: nombreHoja,
          });
        }
      }
    }

    if (resultados.length === 0) {
      return res.status(404).json({
        mensaje: "No se encontró la licencia",
        licenciaBuscada: licencia,
        licenciaNormalizada: target,
        hojasConsultadas: hojas,
        totalFilasProcesadas,
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
  } catch (error) {
    const msg = String(error?.message || error);
    let code = 500;
    let human = "Error interno del servidor";

    if (/timeout/i.test(msg)) {
      code = 504;
      human = "Timeout al consultar SharePoint";
    } else if (/fetch/i.test(msg) || /ENOTFOUND|ECONNRESET|EAI_AGAIN/.test(msg)) {
      code = 503;
      human = "Error de conexión con SharePoint";
    }

    return res.status(code).json({
      error: human,
      details: msg,
      timestamp: new Date().toISOString(),
      suggestion: "Reintenta en unos minutos o valida la URL pública del Excel.",
    });
  }
}
