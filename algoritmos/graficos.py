import os
import pandas as pd
import matplotlib.pyplot as plt
import numpy as np

# Ruta de la carpeta donde están los archivos CSV
carpeta = 'Graficas/'

# Verificar si la carpeta existe
if not os.path.exists(carpeta):
    print(f"La carpeta '{carpeta}' no existe.")
else:
    archivos_csv = [f for f in os.listdir(carpeta) if f.endswith('.csv')]

    if not archivos_csv:
        print(f"No se encontraron archivos CSV en la carpeta '{carpeta}'.")
    else:
        plt.figure(figsize=(10, 6))

        # Generar una lista de colores para cada archivo CSV
        colores = plt.cm.get_cmap('tab10', len(archivos_csv))

        # Definir el tamaño de la ventana para el suavizado
        ventana = 5  # Puedes ajustar este valor para más o menos suavizado

        # Leer y graficar cada archivo CSV
        for idx, archivo in enumerate(archivos_csv):
            ruta_completa = os.path.join(carpeta, archivo)
            
            # Leer el archivo CSV
            data = pd.read_csv(ruta_completa)
            
            # Aplicar suavizado (media móvil) a las columnas de Perdida_Entrenamiento y Perdida_Validacion
            data['Perdida_Entrenamiento_suavizada'] = data['Perdida_Entrenamiento'].rolling(window=ventana, min_periods=1).mean()
            data['Perdida_Validacion_suavizada'] = data['Perdida_Validacion'].rolling(window=ventana, min_periods=1).mean()

            # Quitar 'Data_' y '.csv' del nombre del archivo
            nombre_archivo = archivo.replace('Data_', '').rstrip('.csv')
            
            # Asignar un color específico
            color = colores(idx)
            
            # Graficar Perdida_Entrenamiento y Perdida_Validacion suavizadas con el mismo color
            plt.plot(data['Epoca'], data['Perdida_Entrenamiento_suavizada'], label=nombre_archivo, color=color)
            plt.plot(data['Epoca'], data['Perdida_Validacion_suavizada'], linestyle='--', color=color)

        # Configurar la gráfica
        # plt.title('Pérdida de Entrenamiento y Validación Suavizadas por Época')
        plt.xlabel('Época')
        plt.ylabel('Pérdida')
        
        # Mover la leyenda al lado derecho
        plt.legend(title="Distritos", loc='upper left', bbox_to_anchor=(1, 1))
        
        # Añadir una línea explicativa para Entrenamiento y Validación
        plt.figtext(0.5, 0.01, 'Training Loss: Línea continua | Validation Loss: Línea punteada', ha='center', va='center', fontsize=10)

        plt.grid(True)

        # Mostrar la gráfica
        plt.tight_layout()
        plt.show()
