import pandas as pd

# Leer el primer archivo (Data_Wanshouxigong.csv)
df1 = pd.read_csv('data/Data_Wanshouxigong.csv')

# Leer el segundo archivo (UMAP_CONT/Data_Wanshouxigong.csv)
df2 = pd.read_csv('UMAP_FUSION/Data_Wanshouxigong.csv')

# Asegurarse de que las columnas 'year', 'month', 'day' estén en el formato correcto
df1['year'] = df1['year'].astype(int)
df1['month'] = df1['month'].astype(int)
df1['day'] = df1['day'].astype(int)

df2['year'] = df2['year'].astype(int)
df2['month'] = df2['month'].astype(int)
df2['day'] = df2['day'].astype(int)

# Realizar el merge de ambos dataframes según 'year', 'month', y 'day'
df_merged = pd.merge(df1, df2, on=['year', 'month', 'day'], how='inner')

# Agrupar por año, mes y día, y calcular la media para las columnas correspondientes
df_grouped = df_merged.groupby(['year', 'month', 'day']).agg({
    'UMAP1': 'mean',
    'UMAP2': 'mean',
    'AQI': 'mean',
    'Kmeans_4': 'mean',
    'Kmeans_6': 'mean',
    'PM2_5': 'mean',
    'PM10': 'mean',
    'SO2': 'mean',
    'NO2': 'mean',
    'CO': 'mean',
    'O3': 'mean',
    'TEMP': 'mean',
    'PRES': 'mean',
    'DEWP': 'mean',
    'RAIN': 'mean',
    'WSPM': 'mean',
    'station': 'first'
    }).reset_index()

# Redondear los resultados a 2 decimales
df_grouped = df_grouped.round(2)

# Guardar el nuevo archivo CSV con los datos combinados y agrupados por día
df_grouped.to_csv('UMAP_FUSION_NEW/Data_Wanshouxigong.csv', index=False)
