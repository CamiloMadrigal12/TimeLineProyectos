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

  const EXCEL_URL_LICENCIAS =
    "https://copacabanagov-my.sharepoint.com/personal/lina_restrepo_copacabana_gov_co/_layouts/15/download.aspx?share=EUXjiKzG-KBHk1vCi7GxfaoBZ9_6pcw6mLcc1dszbrWDKQ"

  try {
    console.log(`[v0] Iniciando consulta para licencia: ${licencia}`)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 45000)

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
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.error(`[v0] Error al descargar archivo: ${response.status} ${response.statusText}`)
      return res.status(500).json({
        error: "No se pudo descargar el archivo desde SharePoint",
        details: `HTTP ${response.status}: ${response.statusText}`,
        suggestion: "Verifica que el enlace de SharePoint sea válido y esté accesible",
        url: EXCEL_URL_LICENCIAS,
      })
    }

    console.log(`[v0] Archivo descargado exitosamente`)

    const arrayBuffer = await response.arrayBuffer()
    console.log(`[v0] Tamaño del archivo: ${(arrayBuffer.byteLength / 1024 / 1024).toFixed(2)} MB`)

    const data = new Uint8Array(arrayBuffer)

    let XLSX
    try {
      XLSX = await import("xlsx")
    } catch (importError) {
      console.error(`[v0] Error importing XLSX:`, importError)
      return res.status(500).json({
        error: "Error al cargar la librería de procesamiento de Excel",
        details: importError.message,
        suggestion: "Intenta nuevamente en unos momentos",
      })
    }

    const workbook = XLSX.read(data, { type: "array" })

    console.log(`[v0] Hojas disponibles: ${workbook.SheetNames.join(", ")}`)

    // Buscar hojas que contengan 2024 o 2025 en el nombre
    const hojasDisponibles = workbook.SheetNames.filter((nombre) => nombre.includes("2024") || nombre.includes("2025"))

    // Si no encontramos hojas específicas, usar todas las hojas disponibles
    const hojas = hojasDisponibles.length > 0 ? hojasDisponibles : workbook.SheetNames

    let resultados = []
    let totalFilasProcesadas = 0

    for (const nombreHoja of hojas) {
      const worksheet = workbook.Sheets[nombreHoja]
      if (!worksheet) {
        console.log(`[v0] Hoja ${nombreHoja} no encontrada`)
        continue
      }

      console.log(`[v0] Procesando hoja: ${nombreHoja}`)

      const arrayData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1, // Usar números como encabezados (array de arrays)
        defval: "",
        raw: false,
      })

      const dataFiltrada = arrayData.filter(
        (row) => row && row.length > 0 && row.some((cell) => cell && cell.toString().trim() !== ""),
      )

      totalFilasProcesadas += dataFiltrada.length
      console.log(`[v0] Filas procesadas en ${nombreHoja}: ${dataFiltrada.length}`)

      const filtrados = dataFiltrada.filter((row) => {
        if (!row || row.length === 0) return false

        const licenciaRow = String(row[0] || "").trim() // Columna A (posición 0)
        const licenciaBuscar = String(licencia).trim()

        return licenciaRow === licenciaBuscar
      })

      if (filtrados.length > 0) {
        console.log(`[v0] Encontrados ${filtrados.length} resultados en ${nombreHoja}`)

        const resultadosFormateados = filtrados.map((row) => ({
          RDO: row[0] || "", // Columna A
          "F.L. REV.": row[38] || "", // Columna AM
          ESTADO: row[39] || "", // Columna AN
          HOJA: nombreHoja,
        }))

        resultados = resultados.concat(resultadosFormateados)
      }
    }

    if (resultados.length === 0) {
      console.log(`[v0] No se encontró la licencia ${licencia}`)
      return res.status(404).json({
        mensaje: "No se encontró la licencia",
        licenciaBuscada: licencia,
        hojasConsultadas: hojas,
        totalFilasProcesadas,
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

    console.log(`[v0] Consulta exitosa: ${datos.length} resultados encontrados`)

    return res.status(200).json({
      datos,
      encontrado: true,
      totalResultados: datos.length,
      timestamp: new Date().toISOString(),
      tipo: "licencia", // Identificador para el frontend
    })
  } catch (error) {
    console.error("[v0] Error en consulta_licencia:", error)

    let errorMessage = "Error interno del servidor"
    let errorCode = 500

    if (error.name === "AbortError") {
      errorMessage = "Timeout al consultar SharePoint - La consulta tardó más de 45 segundos"
      errorCode = 504
    } else if (error.name === "TypeError" && error.message.includes("fetch")) {
      errorMessage = "Error de conexión con SharePoint"
      errorCode = 503
    } else if (error.message.includes("timeout")) {
      errorMessage = "Timeout al consultar SharePoint"
      errorCode = 504
    } else if (error.message.includes("XLSX")) {
      errorMessage = "Error al procesar el archivo Excel"
      errorCode = 500
    } else if (error.message.includes("memory") || error.message.includes("heap")) {
      errorMessage = "Archivo demasiado grande para procesar"
      errorCode = 413
    }

    return res.status(errorCode).json({
      error: errorMessage,
      details: error.message,
      timestamp: new Date().toISOString(),
      suggestion: "Intenta nuevamente en unos momentos",
      licenciaBuscada: licencia,
    })
  }
}
