import pandas as pd

# Cargar los archivos CSV
umap_df = pd.read_csv('UMAP/Data_Wanshouxigong.csv')
aqi_df = pd.read_csv('AQI/Data_Wanshouxigong.csv')

# Convertir las columnas 'year', 'month' y 'day' a un formato de fecha para facilitar la fusión
umap_df['date'] = pd.to_datetime(umap_df[['year', 'month', 'day']])
aqi_df['date'] = pd.to_datetime(aqi_df[['year', 'month', 'day']])

# Agrupar los datos por fecha y calcular el promedio de 'UMAP1' y 'UMAP2'
umap_grouped = umap_df.groupby('date')[['UMAP1', 'UMAP2']].mean().reset_index()

# Fusionar los datos de UMAP con los datos de AQI en la columna 'date'
merged_df = pd.merge(umap_grouped, aqi_df[['date', 'AQI']], on='date', how='inner')

# Extraer las columnas 'year', 'month', 'day' de la columna 'date'
merged_df['year'] = merged_df['date'].dt.year
merged_df['month'] = merged_df['date'].dt.month
merged_df['day'] = merged_df['date'].dt.day

# Reorganizar las columnas en el formato deseado
final_df = merged_df[['year', 'month', 'day', 'UMAP1', 'UMAP2', 'AQI']]

# Guardar el resultado en un nuevo archivo CSV
final_df.to_csv('UMAP_AQI/Data_Wanshouxigong.csv', index=False)
