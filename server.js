console.log("Iniciando servidor...")

import express from "express"
import cors from "cors"
import path from "path"
import { fileURLToPath } from "url"
import { existsSync } from "fs"
import consultaRadicadoHandler from "./api/consulta_radicado.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://localhost:5500",
      "http://127.0.0.1:5500",
      "https://camilomadrigal12.github.io",
      "https://time-line-proyectos-lyart.vercel.app",
      "https://time-line-proyectos-git-master-camilomadrigal12s-projects.vercel.app",
      "https://time-line-proyectos-ten.vercel.app",
      "https://sistemainformaciondap.netlify.app",
    ],
    credentials: true,
  }),
)
app.use(express.json())

// ✅ Middleware para servir archivos estáticos con logging
app.use((req, res, next) => {
  console.log(`📥 Solicitud: ${req.method} ${req.path}`)
  next()
})

// ✅ Servir archivos estáticos desde assets con headers correctos
app.use(
  "/assets",
  express.static(path.join(__dirname, "assets"), {
    maxAge: "1d",
    etag: false,
    setHeaders: (res, path) => {
      console.log(`📁 Sirviendo archivo estático: ${path}`)
      res.setHeader("Cache-Control", "public, max-age=86400")
    },
  }),
)

// ✅ Servir todos los archivos estáticos desde la raíz
app.use(
  express.static(__dirname, {
    maxAge: "1d",
    etag: false,
    index: false,
    setHeaders: (res, path) => {
      if (path.endsWith(".png") || path.endsWith(".jpg") || path.endsWith(".jpeg") || path.endsWith(".gif")) {
        console.log(`🖼️ Sirviendo imagen: ${path}`)
        res.setHeader("Cache-Control", "public, max-age=86400")
      }
    },
  }),
)

// ✅ API: Consulta de radicado - CORREGIDO para usar guion bajo
app.post("/api/consulta_radicado", async (req, res) => {
  try {
    console.log("📋 Procesando consulta de radicado...")
    await consultaRadicadoHandler(req, res)
  } catch (error) {
    console.error("❌ Error en consulta_radicado:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
})

// ✅ MANTENER COMPATIBILIDAD: También responder a la ruta con guion medio
app.post("/api/consulta-radicado", async (req, res) => {
  try {
    console.log("📋 Procesando consulta de radicado (compatibilidad guion medio)...")
    await consultaRadicadoHandler(req, res)
  } catch (error) {
    console.error("❌ Error en consulta-radicado:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
})

// Ruta de prueba
app.get("/api/test", (req, res) => {
  res.json({
    mensaje: "Servidor funcionando correctamente",
    timestamp: new Date().toISOString(),
    port: process.env.PORT || 3000,
    status: "OK",
    environment: process.env.NODE_ENV || "development",
  })
})

// ✅ Función para buscar archivos HTML en cualquier ubicación
function findHtmlFile(requestPath) {
  // Limpiar la ruta
  const cleanPath = requestPath.replace(/^\/+/, "").replace(/\/+$/, "")

  // Posibles ubicaciones del archivo
  const possiblePaths = [
    path.join(__dirname, `${cleanPath}.html`),
    path.join(__dirname, cleanPath, "index.html"),
    path.join(__dirname, cleanPath),
  ]

  // Buscar en subcarpetas también
  const folders = [
    "Pilares",
    "Plan de Desarrollo",
    "Dependencias",
    "diagnosticos",
    "diagnostico_radicado",
    "Ejecucion",
    "Formulación",
  ]

  folders.forEach((folder) => {
    possiblePaths.push(path.join(__dirname, folder, `${cleanPath}.html`))
    possiblePaths.push(path.join(__dirname, folder, cleanPath, "index.html"))

    // Buscar en subcarpetas de Pilares
    if (folder === "Pilares") {
      const subfolders = [
        "comunicaciones",
        "DAP",
        "desarrollo",
        "educacion",
        "gobierno",
        "hacienda",
        "infraestructura",
        "invicop",
        "junta",
        "medioAmbiente",
        "movilidad",
        "salud",
        "servicios",
      ]
      subfolders.forEach((subfolder) => {
        possiblePaths.push(path.join(__dirname, folder, subfolder, `${cleanPath}.html`))
      })
    }
  })

  // Encontrar el primer archivo que existe
  for (const filePath of possiblePaths) {
    if (existsSync(filePath)) {
      console.log(`✅ Archivo encontrado: ${filePath}`)
      return filePath
    }
  }

  console.log(`❌ Archivo no encontrado para: ${requestPath}`)
  console.log(`🔍 Rutas buscadas:`, possiblePaths.slice(0, 5))
  return null
}

// ✅ Ruta para servir el index.html
app.get("/", (req, res) => {
  const indexPath = path.join(__dirname, "index.html")
  if (existsSync(indexPath)) {
    console.log("🏠 Sirviendo index.html")
    res.sendFile(indexPath)
  } else {
    console.log("❌ index.html no encontrado")
    res.status(404).send("Página principal no encontrada")
  }
})

// ✅ Manejo dinámico de todas las rutas HTML
app.get("*", (req, res) => {
  const requestPath = req.path

  // Si es una solicitud de archivo estático, no procesarla aquí
  if (requestPath.match(/\.(png|jpg|jpeg|gif|svg|ico|css|js|pdf|xlsx|json)$/)) {
    return res.status(404).send("Archivo no encontrado")
  }

  console.log(`🔍 Buscando archivo para ruta: ${requestPath}`)

  const filePath = findHtmlFile(requestPath)

  if (filePath) {
    res.sendFile(filePath)
  } else {
    console.log(`❌ No se encontró archivo para: ${requestPath}`)
    res.status(404).send(`Archivo ${requestPath} no encontrado.`)
  }
})

// Middleware de manejo de errores
app.use((err, req, res, next) => {
  console.error("❌ Error del servidor:", err)
  res.status(500).json({
    error: "Error interno del servidor",
    message: err.message,
  })
})

const PORT = process.env.PORT || 3000

// Solo iniciar servidor en desarrollo local
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`)
    console.log(`📋 API de consulta disponible en http://localhost:${PORT}/api/consulta_radicado`)
    console.log(`🧪 Endpoint de prueba: http://localhost:${PORT}/api/test`)
    console.log(`📁 Archivos estáticos servidos desde: ${__dirname}`)
  })
}

export default app
