import fetch from "node-fetch"
import * as XLSX from "xlsx"

const EXCEL_URL =
  "https://copacabanagov-my.sharepoint.com/:x:/g/personal/lina_restrepo_copacabana_gov_co/EcN3KQaGqONKswGD3lLdGFQBqQQnLabMWBp7NKkyinomkw?e=AtBk9F"

export default async function handler(req, res) {
  console.log("🚀 API consulta_radicado iniciada")
  console.log("📍 Método:", req.method)
  console.log("📍 Origen:", req.headers.origin)
  console.log("📍 Headers:", Object.keys(req.headers))

  // ✅ Lista actualizada de orígenes permitidos
  const allowedOrigins = [
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

  ]

  const origin = req.headers.origin

  // ✅ Configurar CORS headers SIEMPRE PRIMERO
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin)
    console.log("✅ Origen permitido:", origin)
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*")
    console.log("⚠️ Origen no en lista, usando *:", origin)
  }

  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS, GET")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
  res.setHeader("Access-Control-Allow-Credentials", "true")

  console.log("✅ Headers CORS configurados")

  // ✅ Manejar preflight requests ANTES de cualquier validación
  if (req.method === "OPTIONS") {
    console.log("🔄 Preflight request recibido y respondido")
    return res.status(200).end()
  }

  if (req.method !== "POST") {
    console.log("❌ Método no permitido:", req.method)
    return res.status(405).json({
      error: "Método no permitido",
      allowedMethods: ["POST"],
    })
  }

  const { radicado } = req.body

  if (!radicado) {
    console.log("❌ No se recibió radicado")
    return res.status(400).json({
      error: "No se recibió número de radicado",
      required: "radicado",
    })
  }

  try {
    console.log(`🔍 Consultando radicado: ${radicado} desde origen: ${origin}`)
    console.log(`📡 URL de SharePoint: ${EXCEL_URL.substring(0, 50)}...`)

    const response = await fetch(EXCEL_URL, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,*/*",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
      timeout: 25000,
    })

    if (!response.ok) {
      console.error(`❌ Error al descargar archivo: ${response.status} ${response.statusText}`)
      return res.status(500).json({
        error: "No se pudo descargar el archivo desde SharePoint",
        details: `HTTP ${response.status}: ${response.statusText}`,
        suggestion: "Verifica que el enlace de SharePoint sea válido y esté accesible",
      })
    }

    console.log(
      `✅ Archivo descargado exitosamente. Tamaño: ${response.headers.get("content-length") || "desconocido"} bytes`,
    )

    const arrayBuffer = await response.arrayBuffer()
    const data = new Uint8Array(arrayBuffer)

    console.log(`📊 Procesando archivo Excel de ${data.length} bytes`)

    const workbook = XLSX.read(data, { type: "array" })
    console.log(`📋 Hojas disponibles: ${workbook.SheetNames.join(", ")}`)

    const hojas = ["2025 CORRESPONDENCIA", "2024 CORRESPONDENCIA"]
    let resultados = []
    let totalFilasProcesadas = 0

    for (const nombreHoja of hojas) {
      const worksheet = workbook.Sheets[nombreHoja]
      if (!worksheet) {
        console.warn(`⚠️ Hoja '${nombreHoja}' no encontrada`)
        continue
      }

      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        defval: "",
        raw: false,
      })

      totalFilasProcesadas += jsonData.length
      console.log(`📊 Procesando hoja '${nombreHoja}' con ${jsonData.length} filas`)

      if (jsonData.length > 0) {
        console.log(`🔍 Columnas en '${nombreHoja}':`, Object.keys(jsonData[0]).slice(0, 5))
      }

      const filtrados = jsonData.filter((row) => {
        const radicadoRow = String(row["RADICADO"] || "").trim()
        const radicadoBuscar = String(radicado).trim()
        return radicadoRow === radicadoBuscar
      })

      if (filtrados.length > 0) {
        console.log(`✅ Encontrados ${filtrados.length} resultados en '${nombreHoja}'`)
        filtrados.forEach((fila) => (fila.HOJA = nombreHoja))
        resultados = resultados.concat(filtrados)
      }
    }

    console.log(`📈 Total de filas procesadas: ${totalFilasProcesadas}`)

    if (resultados.length === 0) {
      console.log(`❌ No se encontró el radicado: ${radicado}`)
      return res.status(404).json({
        mensaje: "No se encontró el radicado",
        radicadoBuscado: radicado,
        hojasConsultadas: hojas,
        totalFilasProcesadas,
      })
    }

    const datos = resultados.map((r) => ({
      RADICADO: r["RADICADO"] || "",
      ESTADO: r["ESTADO"] || "",
      FECHA_DE_VENCIMIENTO: r["FECHA DE VENCIMIENTO"] || "",
      HOJA: r.HOJA || "",
    }))

    console.log(`✅ Consulta exitosa para radicado: ${radicado}. Resultados: ${datos.length}`)

    return res.status(200).json({
      datos,
      encontrado: true,
      totalResultados: datos.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ Error en consulta_radicado:", error)

    let errorMessage = "Error interno del servidor"
    let errorCode = 500

    if (error.name === "TypeError" && error.message.includes("fetch")) {
      errorMessage = "Error de conexión con SharePoint"
      errorCode = 503
    } else if (error.message.includes("timeout")) {
      errorMessage = "Timeout al consultar SharePoint"
      errorCode = 504
    }

    return res.status(errorCode).json({
      error: errorMessage,
      details: error.message,
      timestamp: new Date().toISOString(),
      suggestion: "Intenta nuevamente en unos momentos",
    })
  }
}
