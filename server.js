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
    ],
    credentials: true,
  }),
)
app.use(express.json())

// Servir archivos estáticos desde la raíz
app.use(express.static(__dirname))

// Ruta para servir el index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"))
})

// API Routes
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
    port: PORT,
    status: "OK",
  })
})

// Servir archivos HTML específicos
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
    res.sendFile(path.join(__dirname, file))
  })
})

// Manejar rutas no encontradas
app.use((req, res) => {
  if (req.path.endsWith(".html")) {
    const filePath = path.join(__dirname, req.path)
    res.sendFile(filePath, (err) => {
      if (err) {
        res.status(404).json({ error: "Archivo no encontrado" })
      }
    })
  } else {
    res.status(404).json({ error: "Ruta no encontrada" })
  }
})

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`)
  console.log(`📋 API de consulta disponible en http://localhost:${PORT}/api/consulta-radicado`)
  console.log(`🧪 Endpoint de prueba: http://localhost:${PORT}/api/test`)
  console.log(`📁 Archivos estáticos servidos desde: ${__dirname}`)
})

export default app
