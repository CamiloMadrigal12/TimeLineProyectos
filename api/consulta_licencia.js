import fetch from "node-fetch"
import * as XLSX from "xlsx"

const EXCEL_URL_LICENCIAS =
  "https://copacabanagov-my.sharepoint.com/personal/lina_restrepo_copacabana_gov_co/_layouts/15/download.aspx?share=EUXjiKzG-KBHk1vCi7GxfaoBMs44rkLEsJtkmtCYOcFV_Q"

export default async function handler(req, res) {
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

  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin)
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*")
  }

  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS, GET")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
  res.setHeader("Access-Control-Allow-Credentials", "true")

  if (req.method === "OPTIONS") {
    return res.status(200).end()
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Método no permitido",
      allowedMethods: ["POST"],
    })
  }

  const { licencia } = req.body

  if (!licencia) {
    return res.status(400).json({
      error: "No se recibió número de licencia",
      required: "licencia",
    })
  }

  try {
    const response = await fetch(EXCEL_URL_LICENCIAS, {
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
      console.error(`Error al descargar archivo: ${response.status} ${response.statusText}`)
      return res.status(500).json({
        error: "No se pudo descargar el archivo desde SharePoint",
        details: `HTTP ${response.status}: ${response.statusText}`,
        suggestion: "Verifica que el enlace de SharePoint sea válido y esté accesible",
      })
    }

    const arrayBuffer = await response.arrayBuffer()
    const data = new Uint8Array(arrayBuffer)

    const workbook = XLSX.read(data, { type: "array" })

    console.log("Hojas disponibles en el Excel:", workbook.SheetNames)

    // Buscar hojas que contengan 2024 o 2025 en el nombre (más flexible)
    const hojasDisponibles = workbook.SheetNames.filter(
      (nombre) => nombre.toLowerCase().includes("2024") || nombre.toLowerCase().includes("2025"),
    )

    console.log("Hojas filtradas que contienen 2024 o 2025:", hojasDisponibles)

    // y ser más flexible con los nombres de hojas
    let hojas = []
    if (hojasDisponibles.length > 0) {
      hojas = hojasDisponibles.sort() // Ordenar alfabéticamente (2024 antes que 2025)
    } else {
      // Buscar hojas que puedan tener nombres diferentes
      const posiblesHojas2024 = workbook.SheetNames.filter((nombre) => nombre.includes("2024") || nombre.includes("24"))
      const posiblesHojas2025 = workbook.SheetNames.filter((nombre) => nombre.includes("2025") || nombre.includes("25"))
      hojas = [...posiblesHojas2024, ...posiblesHojas2025]

      // Si aún no encuentra nada, usar nombres por defecto
      if (hojas.length === 0) {
        hojas = ["2024", "2025"]
      }
    }

    console.log("Hojas que se van a procesar:", hojas)

    let resultados = []
    let totalFilasProcesadas = 0
    const hojasEncontradas = []
    const hojasNoEncontradas = []

    for (const nombreHoja of hojas) {
      console.log(`Procesando hoja: ${nombreHoja}`)

      const worksheet = workbook.Sheets[nombreHoja]
      if (!worksheet) {
        console.log(`Hoja ${nombreHoja} no encontrada`)
        hojasNoEncontradas.push(nombreHoja)
        continue
      }

      hojasEncontradas.push(nombreHoja)

      const arrayData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1, // Usar números como encabezados (array de arrays)
        defval: "",
        raw: false,
      })

      const dataFiltrada = arrayData.filter(
        (row) => row && row.length > 0 && row.some((cell) => cell && cell.toString().trim() !== ""),
      )

      totalFilasProcesadas += dataFiltrada.length
      console.log(`Filas procesadas en ${nombreHoja}: ${dataFiltrada.length}`)

      const filtrados = dataFiltrada.filter((row) => {
        if (!row || row.length === 0) return false

        const licenciaRow = String(row[0] || "").trim() // Columna A (posición 0)
        const licenciaBuscar = String(licencia).trim()

        return licenciaRow === licenciaBuscar
      })

      console.log(`Registros encontrados en ${nombreHoja}: ${filtrados.length}`)

      if (filtrados.length > 0) {
        const resultadosFormateados = filtrados.map((row) => ({
          RDO: row[0] || "", // Columna A
          "F.L. REV.": row[38] || "", // Columna AM
          ESTADO: row[61] || "", // Columna BJ
          HOJA: nombreHoja,
        }))

        resultados = resultados.concat(resultadosFormateados)
      }
    }

    if (resultados.length === 0) {
      return res.status(404).json({
        mensaje: "No se encontró la licencia",
        licenciaBuscada: licencia,
        hojasConsultadas: hojas,
        hojasEncontradas,
        hojasNoEncontradas,
        totalFilasProcesadas,
        debug: {
          todasLasHojasDisponibles: workbook.SheetNames,
        },
      })
    }

    const datos = resultados.map((r) => ({
      LICENCIA: r["RDO"] || "",
      ESTADO: r["ESTADO"] || "",
      FECHA_DE_VENCIMIENTO: r["F.L. REV."] || "",
      HOJA: r.HOJA || "",
      ANO: r.HOJA
        ? r.HOJA.includes("2025")
          ? "2025"
          : r.HOJA.includes("2024")
            ? "2024"
            : new Date().getFullYear().toString()
        : new Date().getFullYear().toString(),
    }))

    return res.status(200).json({
      datos,
      encontrado: true,
      totalResultados: datos.length,
      timestamp: new Date().toISOString(),
      tipo: "licencia",
      debug: {
        hojasEncontradas,
        hojasNoEncontradas,
        totalFilasProcesadas,
      },
    })
  } catch (error) {
    console.error("Error en consulta_licencia:", error)

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
