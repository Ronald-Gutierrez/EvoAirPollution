import pandas as pd
from sklearn.preprocessing import MinMaxScaler
import os

# Cargar el archivo CSV
file_path = 'data/Data_Aotizhongxin.csv'  # Cambia el path si es necesario
df = pd.read_csv(file_path)

# Campos a normalizar
fields_to_normalize = ['PM2_5', 'PM10', 'SO2', 'NO2', 'CO', 'O3', 'TEMP', 'PRES', 'DEWP', 'RAIN']

# Inicializar el scaler de Min-Max
scaler = MinMaxScaler()

# Normalizar los campos seleccionados
df[fields_to_normalize] = scaler.fit_transform(df[fields_to_normalize])

# Crear carpeta de salida si no existe
output_folder = 'data_normalizada'
if not os.path.exists(output_folder):
    os.makedirs(output_folder)

# Guardar el archivo normalizado en la carpeta de salida
output_file = os.path.join(output_folder, 'Data_Aotizhongxin.csv')
df.to_csv(output_file, index=False)

print(f"Archivo normalizado guardado en: {output_file}")
