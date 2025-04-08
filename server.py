from flask import Flask
import os
import time
from datetime import datetime
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import subprocess
import threading

app = Flask(__name__)

# Rutas de los archivos de Excel
ruta_excel_proyecto = r"C:\Users\diana\OneDrive\proyectos.xlsx"
ruta_excel_radicados = r"C:\Users\diana\OneDrive\radicados.xlsx"
ultima_ejecucion = 0
delay_ejecucion = 2

class ExcelEventHandler(FileSystemEventHandler):
    def on_modified(self, event):
        global ultima_ejecucion
        if event.src_path in [ruta_excel_proyecto, ruta_excel_radicados]:
            tiempo_actual = time.time()
            if tiempo_actual - ultima_ejecucion > delay_ejecucion:
                ultima_ejecucion = tiempo_actual
                print(f"🔄 Se detectó un cambio en {event.src_path}. Generando HTML...")
                threading.Thread(target=ejecutar_script).start()

def ejecutar_script():
    try:
        subprocess.run(["python", "generar_html.py"], check=True)
        print("✅ Archivos HTML actualizados con éxito.")
    except Exception as e:
        print(f"❌ Error al generar HTML: {e}")

# Iniciar el monitoreo de los archivos Excel
event_handler = ExcelEventHandler()
observer = Observer()
observer.schedule(event_handler, path=os.path.dirname(ruta_excel_proyecto), recursive=False)
observer.schedule(event_handler, path=os.path.dirname(ruta_excel_radicados), recursive=False)
observer.start()

@app.route('/')
def home():
    return "🚀 Servidor Flask en ejecución."

@app.route('/ejecutar')
def ejecutar():
    try:
        ejecutar_script()
        return "✅ Archivos HTML actualizados con éxito."
    except Exception as e:
        return f"❌ Error al generar HTML: {e}"

@app.route('/inicializar')
def inicializar():
    try:
        # Ejecutar el script con el parámetro para respetar días existentes
        subprocess.run(["python", "inicializar_proyecto.py"], check=True)
        return "✅ Proyecto inicializado correctamente respetando los días existentes."
    except Exception as e:
        return f"❌ Error al inicializar el proyecto: {e}"

if __name__ == '__main__':
    try:
        print("🚀 Servidor corriendo en http://127.0.0.1:5000")
        app.run(debug=True, use_reloader=False)
    except KeyboardInterrupt:
        observer.stop()
        observer.join()
