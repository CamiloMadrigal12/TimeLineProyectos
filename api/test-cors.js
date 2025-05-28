export default async function handler(req, res) {
  // Configurar headers CORS exactamente igual que en consulta_radicado.js
  const allowedOrigins = [
    "https://sistemainformaciondap.netlify.app",
    "https://time-line-proyectos-lyart.vercel.app", 
    "https://time-line-proyectos-git-master-camilomadrigal12s-projects.vercel.app",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5500",
    "http://127.0.0.1:5500"
  ];

  const origin = req.headers.origin;
  
  console.log("🔍 Origen de la solicitud:", origin);
  console.log("🔍 Orígenes permitidos:", allowedOrigins);
  
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS, GET");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  // Manejar preflight requests
  if (req.method === "OPTIONS") {
    console.log("✅ Preflight request manejado correctamente");
    return res.status(200).end();
  }

  return res.status(200).json({
    message: "CORS configurado correctamente",
    origin: origin,
    timestamp: new Date().toISOString(),
    allowedOrigins: allowedOrigins
  });
}