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

// ✅ Servir archivos estáticos desde la raíz y la carpeta 'assets'
app.use(express.static(__dirname))
app.use('/assets', express.static(path.join(__dirname, 'assets'))) // ← ESTA LÍNEA NUEVA SIRVE LA CARPETA DE IMÁGENES

// Ruta para servir el index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"))
})

// API: Consulta de radicado
app.post("/api/consulta-radicado", async (req, res) => {
  try {
    await consultaRadicadoHandler(req, res)
  } catch (error) {
    console.error("Error en consulta-radicado:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
})

// Ruta de prueba para verificar que el servidor está funcionando
const PORT = process.env.PORT || 3000

app.get("/api/test", (req, res) => {
  res.json({
    mensaje: "Servidor funcionando correctamente",
    timestamp: new Date().toISOString(),
    port: PORT,
    status: "OK",
  })
})

// Rutas para archivos HTML en la raíz del proyecto
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

// Servir cualquier archivo HTML en cualquier subcarpeta
app.get("*/:file", (req, res, next) => {
  const filePath = path.join(__dirname, req.path)
  if (filePath.endsWith(".html")) {
    res.sendFile(filePath, (err) => {
      if (err) {
        res.status(404).send("Archivo HTML no encontrado.")
      }
    })
  } else {
    next()
  }
})

// Ruta no encontrada
app.use((req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" })
})

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`)
  console.log(`📋 API de consulta disponible en http://localhost:${PORT}/api/consulta-radicado`)
  console.log(`🧪 Endpoint de prueba: http://localhost:${PORT}/api/test`)
  console.log(`📁 Archivos estáticos servidos desde: ${__dirname}`)
})

export default app
