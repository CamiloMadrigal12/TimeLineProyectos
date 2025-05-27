# TimeLineProyectos - Sistema de Gestión Municipal

## Descripción
Sistema de gestión para el Departamento Administrativo de Planeación de la Alcaldía de Copacabana.

## Desarrollo Local

### Prerrequisitos
- Node.js 18 o superior
- npm o yarn

### Instalación
\`\`\`bash
npm install
\`\`\`

### Desarrollo Local
\`\`\`bash
# Ejecutar servidor de desarrollo
npm run dev

# El servidor estará disponible en:
# http://localhost:3000
\`\`\`

### Pruebas de API
\`\`\`bash
# Probar endpoint de consulta
curl -X POST http://localhost:3000/api/consulta-radicado \
  -H "Content-Type: application/json" \
  -d '{"radicado":"123"}'

# Probar endpoint de estado
curl http://localhost:3000/api/test
\`\`\`

### Despliegue en Vercel
\`\`\`bash
# Instalar Vercel CLI
npm i -g vercel

# Desplegar
vercel

# Para desarrollo con Vercel
npm start
\`\`\`

## Estructura del Proyecto
\`\`\`
/
├── api/
│   └── consulta_radicado.js    # API serverless para consulta de radicados
├── assets/                     # Recursos estáticos
├── diagnosticos/              # HTML generados automáticamente
├── server.js                  # Servidor Express para desarrollo local
├── index.html                 # Página principal
├── package.json
├── vercel.json               # Configuración de Vercel
└── README.md
\`\`\`

## Funcionalidades
- ✅ Consulta de radicados en tiempo real
- ✅ Generación automática de HTML desde Excel
- ✅ Sistema de semáforos para seguimiento
- ✅ Responsive design
- ✅ Compatible con Vercel/Netlify

## Comandos Útiles
- `npm run dev` - Servidor de desarrollo local
- `npm start` - Vercel dev (para pruebas con Vercel)
- `vercel --prod` - Despliegue a producción
