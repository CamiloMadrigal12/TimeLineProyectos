import { readdirSync, statSync } from 'fs'
import path from 'path'

function listFiles(dir, level = 0) {
  const items = readdirSync(dir)
  const indent = '  '.repeat(level)
  
  items.forEach(item => {
    if (item.startsWith('.')) return
    
    const fullPath = path.join(dir, item)
    const stats = statSync(fullPath)
    
    if (stats.isDirectory()) {
      console.log(`${indent}📁 ${item}/`)
      if (level < 3) { // Limitar profundidad
        listFiles(fullPath, level + 1)
      }
    } else {
      console.log(`${indent}📄 ${item}`)
    }
  })
}

console.log("📋 Estructura del proyecto:")
listFiles('.')

console.log("\n🖼️ Archivos en assets/img:")
try {
  const assetsPath = './assets/img'
  const images = readdirSync(assetsPath)
  images.forEach(img => console.log(`  - ${img}`))
} catch (error) {
  console.log("❌ No se pudo leer assets/img:", error.message)
}