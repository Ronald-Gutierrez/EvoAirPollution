import pandas as pd
from sklearn.cluster import KMeans

# Cargar los datos
encoded_contaminants = pd.read_csv('Kmeans/Data_Wanshouxigong/encoded_fusion.csv')
Data_Wanshouxigong = pd.read_csv('UMAP_AQI/Data_Wanshouxigong.csv')

# Eliminar la última fila de encoded_contaminants
# encoded_contaminants = encoded_contaminants[:-1]

# Agrupar cada 24 filas de encoded_contaminants y calcular el promedio
encoded_contaminants_resampled = encoded_contaminants.groupby(encoded_contaminants.index // 24).mean()

# Asegúrate de que ambos archivos tengan la misma cantidad de filas después del re-muestreo
assert len(encoded_contaminants_resampled) == len(Data_Wanshouxigong), "Los archivos no tienen el mismo número de filas después del re-muestreo"

# Aplicar KMeans con 4 clusters
kmeans_4 = KMeans(n_clusters=4, random_state=42)
encoded_contaminants_4 = kmeans_4.fit_predict(encoded_contaminants_resampled)

# Aplicar KMeans con 5 clusters
kmeans_5 = KMeans(n_clusters=5, random_state=42)
encoded_contaminants_5 = kmeans_5.fit_predict(encoded_contaminants_resampled)

# Aplicar KMeans con 6 clusters
kmeans_6 = KMeans(n_clusters=6, random_state=42)
encoded_contaminants_6 = kmeans_6.fit_predict(encoded_contaminants_resampled)

# Agregar los resultados de KMeans a los datos de fechas
Data_Wanshouxigong['Kmeans_4'] = encoded_contaminants_4
# Data_Wanshouxigong['Kmeans_5'] = encoded_contaminants_5
Data_Wanshouxigong['Kmeans_6'] = encoded_contaminants_6

# Guardar el archivo de salida
output_file = 'UMAP_FUSION/Data_Wanshouxigong.csv'
Data_Wanshouxigong.to_csv(output_file, index=False)

print(f"Archivo {output_file} creado exitosamente.")
