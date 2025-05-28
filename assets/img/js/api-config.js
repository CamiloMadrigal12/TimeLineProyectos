// Configuración de API para funcionar en Netlify y Vercel
class ApiConfig {
  static getApiUrl() {
    const hostname = window.location.hostname;
    
    if (hostname.includes('netlify.app') || hostname.includes('netlify.com')) {
      // Si estamos en Netlify, usar la API de Vercel
      return 'https://time-line-proyectos-lyart.vercel.app/api/consulta-radicado';
    } else if (hostname.includes('vercel.app')) {
      // Si estamos en Vercel, usar la API local
      return '/api/consulta-radicado';
    } else if (hostname === 'localhost' || hostname === '127.0.0.1') {
      // Para desarrollo local
      return 'http://localhost:3000/api/consulta-radicado';
    } else {
      // Fallback - usar Vercel por defecto
      return 'https://time-line-proyectos-lyart.vercel.app/api/consulta-radicado';
    }
  }

  static async consultarRadicado(numeroRadicado) {
    const apiUrl = this.getApiUrl();
    
    console.log(`🔍 Consultando radicado ${numeroRadicado} en: ${apiUrl}`);
    
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ radicado: numeroRadicado })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ Respuesta recibida:', data);
      return data;
    } catch (error) {
      console.error('❌ Error en consulta:', error);
      throw error;
    }
  }
}

// Hacer disponible globalmente
window.ApiConfig = ApiConfig;