import pandas as pd
import time
import os
import re

# Rutas
ruta_excel_proyecto = r"C:\Users\diana\OneDrive\proyectos.xlsx"
ruta_excel_procesos = r"C:\Users\diana\OneDrive\procesos.xlsx"
ruta_html_principal = "formulacion.html"
ruta_diagnosticos = "diagnosticos"

def generar_html_principal():
    if not os.path.exists(ruta_excel_proyecto):
        print("❌ ERROR: El archivo de proyectos no existe o no está accesible.")
        return

    intentos = 5
    while intentos > 0:
        try:
            time.sleep(1)
            df_proyectos = pd.read_excel(ruta_excel_proyecto, engine="openpyxl")
            break  
        except PermissionError:
            print(f"⚠️ Archivo en uso, esperando {intentos} segundos para intentar de nuevo...")
            time.sleep(1)
            intentos -= 1
        except Exception as e:
            print(f"❌ ERROR al leer el archivo Excel de proyectos: {e}")
            return

    if "#CI" not in df_proyectos.columns:
        print("❌ ERROR: La columna '#CI' no existe en el archivo Excel de proyectos.")
        return

    for index, row in df_proyectos.iterrows():
        ci_numero = row["#CI"]
        archivo_diagnostico = f"{ruta_diagnosticos}/{ci_numero}.html"
        df_proyectos.at[index, "#CI"] = f'<a href="{archivo_diagnostico}" target="_blank">{ci_numero}</a>'

    tabla_html = df_proyectos.to_html(index=False, escape=False, classes="table table-bordered table-striped")

    if os.path.exists(ruta_html_principal):
        with open(ruta_html_principal, "r", encoding="utf-8") as file:
            contenido_html = file.read()
        nuevo_html = re.sub(r"(<table.*?>).*?(</table>)", f"\\1{tabla_html}\\2", contenido_html, flags=re.DOTALL)
    else:
        nuevo_html = f"""
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>DAP</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
        </head>
        <body>
            <div id="header"></div>
            <div class="container mt-4">
                <h2 class="text-center">Proyectos en Formulación</h2>
                {tabla_html}
            </div>
            <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
            <script>
                document.addEventListener("DOMContentLoaded", function () {{
                    let headerPath = "https://camilomadrigal12.github.io/TimeLineProyectos/header.html";
                    fetch(headerPath)
                        .then(response => response.text())
                        .then(data => {{
                            document.getElementById("header").innerHTML = data;
                        }})
                        .catch(error => console.error("Error cargando el header:", error));
                }});
            </script>
        </body>
        </html>
        """

    with open(ruta_html_principal, "w", encoding="utf-8") as file:
        file.write(nuevo_html)

    print("✅ Archivo HTML principal actualizado con éxito.")

def generar_html_diagnosticos():
    if not os.path.exists(ruta_excel_proyecto) or not os.path.exists(ruta_excel_procesos):
        print("❌ ERROR: Uno o ambos archivos Excel no existen o no están accesibles.")
        return

    try:
        df_proyectos = pd.read_excel(ruta_excel_proyecto, engine="openpyxl")
        df_procesos = pd.read_excel(ruta_excel_procesos, engine="openpyxl")
    except Exception as e:
        print(f"❌ ERROR al leer los archivos Excel: {e}")
        return

    if "#CI" not in df_proyectos.columns or "#CI" not in df_procesos.columns:
        print("❌ ERROR: La columna '#CI' no existe en uno o ambos archivos Excel.")
        return

    if not os.path.exists(ruta_diagnosticos):
        os.makedirs(ruta_diagnosticos)

    for _, proyecto in df_proyectos.iterrows():
        ci = proyecto["#CI"]
        proceso = df_procesos[df_procesos["#CI"] == ci].iloc[0] if not df_procesos[df_procesos["#CI"] == ci].empty else None

        timeline_html = generar_timeline_html(proceso) if proceso is not None else ""

        # Solución para el problema de rutas relativas en subcarpetas
        html_content = f"""
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Diagnóstico Proyecto #{ci}</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
            <!-- Agregar base href para corregir rutas relativas -->
            <base href="../">
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    background-color: #f4f4f9;
                    margin: 0;
                    padding: 0;
                }}
                .content {{
                    padding: 80px 20px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: calc(100vh - 80px);
                    text-align: center;
                }}
                .title {{
                    font-size: 24px;
                    font-weight: bold;
                    color: #333;
                    margin-bottom: 20px;
                }}
                .timeline {{
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 90%;
                    max-width: 1000px;
                    position: relative;
                    margin-top: 40px;
                }}
                .timeline::before {{
                    content: '';
                    position: absolute;
                    top: 31%;
                    left: 0;
                    right: 0;
                    height: 4px;
                    background: #0078d4;
                    transform: translateY(-50%);
                    z-index: 1;
                }}
                .timeline-step {{
                    position: relative;
                    flex: 1;
                    text-align: center;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding: 0 10px;
                }}
                .timeline-step .dot {{
                    width: 15px;
                    height: 15px;
                    background: #0078d4;
                    border: 3px solid #fff;
                    border-radius: 50%;
                    z-index: 2;
                }}
                .timeline-step.completed .dot {{
                    background: #0078d4;
                }}
                .timeline-step.checked .dot {{
                    background: #28a745;
                }}
                .checkmark {{
                    display: inline-block;
                    margin-top: 10px;
                    color: #28a745;
                    font-size: 18px;
                }}
                .timeline-step h3 {{
                    font-size: 16px;
                    margin-top: 15px;
                }}
                @media (max-width: 768px) {{
                    .timeline {{
                        flex-direction: column;
                        align-items: center;
                    }}
                    .timeline::before {{
                        width: 4px;
                        height: 100%;
                        left: 50%;
                        transform: translateX(-50%);
                    }}
                    .timeline-step {{
                        flex-direction: row;
                        text-align: left;
                        justify-content: start;
                        width: 100%;
                        padding: 10px 0;
                    }}
                    .timeline-step .dot {{
                        width: 12px;
                        height: 12px;
                        margin-bottom: 0;
                        margin-right: 10px;
                    }}
                    .timeline-step h3 {{
                        font-size: 14px;
                    }}
                }}
            </style>
        </head>
        <body>
            <div id="header"></div>
            <div class="content">
                <div class="title">Diagrama de Procesos - Proyecto #{ci}</div>
                <div class="card mb-4">
                    <div class="card-body">
                        <h5 class="card-title">{proyecto['NOMBRE DEL PROYECTO']}</h5>
                        <p class="card-text"><strong>Dependencia Responsable:</strong> {proyecto['DEPENDENCIA RESPONSABLE']}</p>
                        <p class="card-text"><strong>Fase del Proyecto:</strong> {proyecto['FASE DEL PROYECTO']}</p>
                        <p class="card-text"><strong>Entidad Destino:</strong> {proyecto['ENTIDAD DESTINO PARA PRESENTACION']}</p>
                    </div>
                </div>
                <div class="timeline">
                    {timeline_html}
                </div>
            </div>
            <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
            <script>
                document.addEventListener("DOMContentLoaded", function () {{
                    let headerPath = "https://camilomadrigal12.github.io/TimeLineProyectos/header.html";
                    fetch(headerPath)
                        .then(response => {{
                            if (!response.ok) {{
                                throw new Error("No se pudo cargar el header.");
                            }}
                            return response.text();
                        }})
                        .then(data => {{
                            document.getElementById("header").innerHTML = data;

                            setTimeout(() => {{
                                let logo = document.querySelector("#header #logo");
                                if (logo) {{
                                    logo.src = logo.getAttribute("data-src");
                                }}

                                let links = document.querySelectorAll("#header a[data-href]");
                                links.forEach(link => {{
                                    link.setAttribute("href", link.getAttribute("data-href"));
                                }});
                            }}, 500);
                        }})
                        .catch(error => console.error("Error cargando el header:", error));
                }});
            </script>
        </body>
        </html>
        """

        with open(f"{ruta_diagnosticos}/{ci}.html", "w", encoding="utf-8") as file:
            file.write(html_content)

    print("✅ Archivos HTML de diagnóstico actualizados con éxito.")

def generar_timeline_html(proceso):
    fases = [
        'En Diagnóstico', 'Planteamiento Problema', 'Alternativas Solución', 
        'Listado de Requisitos', 'Estudio y Documentación', 'Proceso en Costos', 
        'Certificados y Firmas', 'Proceso en Radicación'
    ]
    
    fase_actual = proceso.get('Proceso Actual', '')
    estado_actual = proceso.get('Estado', '')
    fase_numero = int(proceso.get('FASE DEL PROCESO', 0))
    
    timeline_html = ""
    for i, fase in enumerate(fases, start=1):
        completed = ""
        checked = ""
        checkmark = ""
        
        if i < fase_numero:
            completed = "completed"
            checked = "checked"
            checkmark = '<span class="checkmark">✔</span>'
        elif i == fase_numero:
            if estado_actual == "Completado":
                completed = "completed"
                checked = "checked"
                checkmark = '<span class="checkmark">✔</span>'
            elif estado_actual == "En Proceso":
                completed = "completed"
        
        timeline_html += f"""
        <div class="timeline-step {completed} {checked}">
            <div class="dot"></div>
            <h3>{fase} {checkmark}</h3>
        </div>
        """
    
    return timeline_html

def generar_html():
    generar_html_principal()
    generar_html_diagnosticos()

if __name__ == "__main__":
    try:
        generar_html()
    except Exception as e:
        import traceback
        print(f"❌ ERROR GENERAL: {e}")
        print(traceback.format_exc())
