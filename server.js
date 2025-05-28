console.log("Iniciando servidor...")

import express from "express"
import cors from "cors"
import path from "path"
import { fileURLToPath } from "url"
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
      "https://time-line-proyectos-lyart.vercel.app"
    ],
    credentials: true,
  }),
)
app.use(express.json())

// ✅ Configuración mejorada para archivos estáticos
// Servir archivos estáticos con configuración específica
app.use('/assets', express.static(path.join(__dirname, 'assets'), {
  maxAge: '1d',
  etag: false
}))

// Servir archivos estáticos desde la raíz con prioridad baja
app.use(express.static(__dirname, {
  maxAge: '1d',
  etag: false,
  index: false // Evitar que sirva index.html automáticamente
}))

// API: Consulta de radicado
app.post("/api/consulta-radicado", async (req, res) => {
  try {
    await consultaRadicadoHandler(req, res)
  } catch (error) {
    console.error("Error en consulta-radicado:", error)
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
  })
})

// Ruta para servir el index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"))
})

// Rutas para archivos HTML específicos
const htmlFiles = [
  "embudo.html",
  "formulacion.html", 
  "formulados.html",
  "mapa.html",
  "pilares.html",
  "planDesarrollo.html",
  "ProyectosPensados.html",
  "radicados.html",
  "timeLine.html",
]

htmlFiles.forEach((file) => {
  app.get(`/${file}`, (req, res) => {
    const filePath = path.join(__dirname, file)
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error(`Error sirviendo ${file}:`, err)
        res.status(404).send(`Archivo ${file} no encontrado.`)
      }
    })
  })
})

// Servir archivos HTML en subcarpetas
app.get("*/:file", (req, res, next) => {
  const filePath = path.join(__dirname, req.path)
  if (filePath.endsWith(".html")) {
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error(`Error sirviendo archivo HTML ${req.path}:`, err)
        res.status(404).send("Archivo HTML no encontrado.")
      }
    })
  } else {
    next()
  }
})

// Middleware de manejo de errores 404
app.use((req, res) => {
  console.log(`❌ Ruta no encontrada: ${req.method} ${req.path}`)
  res.status(404).json({ 
    error: "Ruta no encontrada",
    path: req.path,
    method: req.method
  })
})

const PORT = process.env.PORT || 3000

// Solo iniciar servidor en desarrollo local
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`)
    console.log(`📋 API de consulta disponible en http://localhost:${PORT}/api/consulta-radicado`)
    console.log(`🧪 Endpoint de prueba: http://localhost:${PORT}/api/test`)
    console.log(`📁 Archivos estáticos servidos desde: ${__dirname}`)
  })
}

export default app