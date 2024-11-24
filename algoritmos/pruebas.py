import pandas as pd
import matplotlib.pyplot as plt
from sklearn.preprocessing import MinMaxScaler

# Cargar los datos desde el archivo CSV
data_path = "data/Data_Aotizhongxin.csv"
df = pd.read_csv(data_path)

# Convertir las columnas de fecha (year, month, day, hour) en un solo índice de fecha
df['datetime'] = pd.to_datetime(df[['year', 'month', 'day', 'hour']])
df.set_index('datetime', inplace=True)

# Seleccionar los contaminantes a normalizar y graficar
contaminants = ['PM2_5', 'PM10', 'SO2', 'NO2', 'CO', 'O3']

# Inicializar el scaler (normalización min-max)
scaler = MinMaxScaler()

# Normalizar los datos de los contaminantes seleccionados
df_normalized = df[contaminants].copy()
df_normalized[contaminants] = scaler.fit_transform(df_normalized[contaminants])

# Crear el gráfico de la serie temporal normalizada
plt.figure(figsize=(10, 6))

for contaminant in contaminants:
    plt.plot(df_normalized.index, df_normalized[contaminant], label=contaminant)

# Añadir etiquetas y título
plt.title('Series Temporales de Contaminantes Normalizados')
plt.xlabel('Fecha')
plt.ylabel('Concentración Normalizada (0-1)')
plt.legend()

# Mejorar la visualización de las fechas
plt.xticks(rotation=45)
plt.tight_layout()

# Mostrar el gráfico
plt.show()
