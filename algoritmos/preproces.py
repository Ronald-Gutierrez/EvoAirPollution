import pandas as pd

# Cargar el archivo CSV
file_path = 'Kmeans/Data_Changping/encoded_contaminants.csv'  # Asegúrate de que la ruta al archivo sea correcta

# Leer el archivo CSV en un DataFrame
data = pd.read_csv(file_path)

# Eliminar la última fila
# data = data[:-1]

# Agrupar cada 24 filas y calcular el promedio
data_resampled = data.groupby(data.index // 24).mean()

# Guardar el nuevo archivo CSV con los resultados
output_file = 'salida.csv'  # Nombre del archivo de salida
data_resampled.to_csv(output_file, index=False)

print(f'Archivo guardado como: {output_file}')
