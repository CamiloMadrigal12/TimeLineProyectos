export default async function handler(req, res) {
  console.log("🔍 Test CORS - Método:", req.method)
  console.log("🔍 Test CORS - Origen:", req.headers.origin)

  // Lista actualizada de orígenes permitidos
  const allowedOrigins = [
    "https://sistemainformaciondap.netlify.app",
    "https://time-line-proyectos-lyart.vercel.app",
    "https://time-line-proyectos-git-master-camilomadrigal12s-projects.vercel.app",
    "https://time-line-proyectos-ten.vercel.app",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
  ]

  const origin = req.headers.origin

  // Configurar headers CORS
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin)
    console.log("✅ Origen permitido:", origin)
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*")
    console.log("⚠️ Origen no en lista, usando *:", origin)
  }

  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
  res.setHeader("Access-Control-Allow-Credentials", "true")

  // Manejar preflight requests
  if (req.method === "OPTIONS") {
    console.log("🔄 Preflight request recibido desde:", origin)
    return res.status(200).end()
  }

  return res.status(200).json({
    message: "CORS funcionando correctamente",
    timestamp: new Date().toISOString(),
    method: req.method,
    origin: req.headers.origin || "No origin",
    allowedOrigins: allowedOrigins,
    corsHeaders: {
      "Access-Control-Allow-Origin": res.getHeader("Access-Control-Allow-Origin"),
      "Access-Control-Allow-Methods": res.getHeader("Access-Control-Allow-Methods"),
      "Access-Control-Allow-Headers": res.getHeader("Access-Control-Allow-Headers"),
    },
  })
}
