# Instalar la librería UMAP (si no la tienes instalada)
# Ejecuta esta línea solo una vez para instalar el paquete
# !pip install umap-learn

import pandas as pd
import umap
import numpy as np

# Cargar los archivos CSV
df_contaminants = pd.read_csv('Kmeans/Data_Wanshouxigong/encoded_contaminants.csv')
df_meteorology = pd.read_csv('Kmeans/Data_Wanshouxigong/encoded_meteorology.csv')

# Función para aplicar UMAP, reducir dimensionalidad y promediar cada 24 filas
def reduce_dimensionality_and_resample(df, output_path):
    umap_model = umap.UMAP(n_components=2)
    umap_result = umap_model.fit_transform(df)
    
    # Crear DataFrame con UMAP1 y UMAP2
    umap_df = pd.DataFrame(umap_result, columns=['UMAP1', 'UMAP2'])
    
    # Promediar cada 24 filas
    umap_df_resampled = umap_df.groupby(np.arange(len(umap_df)) // 24).mean()
    
    # Guardar el resultado
    umap_df_resampled.to_csv(output_path, index=False)

# Aplicar reducción de dimensionalidad y promediado para ambos archivos
reduce_dimensionality_and_resample(df_contaminants, 'Red_Dim_Cont/Data_Wanshouxigong.csv')
reduce_dimensionality_and_resample(df_meteorology, 'Red_Dim_Met/Data_Wanshouxigong.csv')

print("El proceso de reducción de dimensionalidad y promediado por 24 filas ha sido completado para ambos archivos.")
