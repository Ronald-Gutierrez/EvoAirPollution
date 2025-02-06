import pandas as pd

# Cargar los archivos de datos
data_file = 'data/Data_Wanshouxigong.csv'
umap_file = 'UMAP_MET_UNION/Data_Wanshouxigong.csv'

# Leer los archivos CSV
data_df = pd.read_csv(data_file)
umap_df = pd.read_csv(umap_file)

# Filtrar las columnas relevantes del archivo data
data_columns = ['PM2_5', 'PM10', 'SO2', 'NO2', 'CO', 'O3', 'TEMP', 'PRES', 'DEWP', 'RAIN']

# Agrupar por fecha (año, mes, día) y contar los NA en las columnas relevantes por día
data_df['date'] = pd.to_datetime(data_df[['year', 'month', 'day']])
data_df_filtered = data_df.groupby('date')[data_columns].apply(lambda x: x.isna().sum().sum()).reset_index()
data_df_filtered.columns = ['date', 'NA_count']

# Filtrar solo las fechas donde el conteo de NA es 10 o menos
valid_dates = data_df_filtered[data_df_filtered['NA_count'] <= 10]['date'].dt.strftime('%Y-%m-%d').tolist()

# Filtrar el archivo UMAP según las fechas válidas
umap_df['date'] = pd.to_datetime(umap_df[['year', 'month', 'day']])
umap_df_filtered = umap_df[umap_df['date'].dt.strftime('%Y-%m-%d').isin(valid_dates)]

# Seleccionar las columnas relevantes para la salida
umap_df_filtered = umap_df_filtered[['year', 'month', 'day', 'UMAP1', 'UMAP2', 'AQI', 'Kmeans_4', 'Kmeans_6', 'PM2_5', 'PM10', 'SO2', 'NO2', 'CO', 'O3', 'TEMP', 'PRES', 'DEWP', 'RAIN', 'WSPM', 'station']]


# Guardar el resultado en un nuevo archivo CSV
output_file = 'UMAP_MET_NEW/Data_Wanshouxigong.csv'
umap_df_filtered.to_csv(output_file, index=False)

print(f"Archivo filtrado guardado como {output_file}")
