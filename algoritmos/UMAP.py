import pandas as pd

# Rutas de los archivos
ruta_origen_1 = "data/Data_Wanshouxigong.csv"
ruta_origen_2 = "Red_Dim/Data_Wanshouxigong.csv"
ruta_destino = "UMAP/Data_Wanshouxigong.csv"

# Leer los archivos
datos_contaminantes = pd.read_csv(ruta_origen_1)
datos_umap = pd.read_csv(ruta_origen_2)

# Combinar los archivos (asume que están alineados por índice)
datos_combinados = pd.concat([datos_contaminantes[['year', 'month', 'day', 'hour']], datos_umap], axis=1)

# Asegurarse de que las columnas 'year', 'month', 'day', 'hour' sean enteros
datos_combinados[['year', 'month', 'day', 'hour']] = datos_combinados[['year', 'month', 'day', 'hour']].astype(int)

# Guardar el archivo combinado
datos_combinados.to_csv(ruta_destino, index=False)

print(f"Archivo combinado guardado en: {ruta_destino}")
