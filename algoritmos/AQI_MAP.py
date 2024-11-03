import pandas as pd

# Diccionario con las latitudes, longitudes y notas de las estaciones
station_info = {
    'aotizhongxin': (39.9829, 116.3974, 'Urban'),
    'changping': (40.21965, 116.2255, 'Urban'),
    'dingling': (40.2925, 116.2204, 'Cross Reference'),
    'dongsi': (39.9296, 116.4170, 'Urban'),
    'guanyuan': (39.9293, 116.3399, 'Urban'),
    'gucheng': (39.9144, 116.1841, 'Urban'),
    'huairou': (40.3288, 116.6280, 'Rural'),
    'nongzhanguan': (39.8040, 116.4612, 'Urban'),
    'shunyi': (40.1270, 116.6552, 'Rural'),
    'tiantan': (39.8865, 116.4074, 'Urban'),
    'wanliu': (39.9875, 116.2873, 'Urban'),
    'wanshouxigong': (39.8785, 116.3526, 'Urban')
}

# Función para calcular el IAQI de un contaminante
def calculate_individual_aqi(pollutant, concentration):
    if concentration is None:  # Verificar si la concentración es None
        return None

    pollutant_limits = {
        'PM2.5': [(0, 35), (35, 75), (75, 115), (115, 150), (150, 250), (250, 350), (350, 500)],
        'PM10': [(0, 50), (50, 150), (150, 250), (250, 350), (350, 420), (420, 500), (500, 600)],
        'SO2': [(0, 50), (50, 150), (150, 475), (475, 800), (800, 1600), (1600, 2100), (2100, 2620)],
        'NO2': [(0, 40), (40, 80), (80, 180), (180, 280), (280, 565), (565, 750), (750, 940)],
        'CO': [(0, 2), (2, 4), (4, 14), (14, 24), (24, 36), (36, 48), (48, 60)],
        'O3': [(0, 160), (160, 200), (200, 300), (300, 400), (400, 800), (800, 1000), (1000, 1200)]
    }
    aqi_ranges = [(0, 50), (50, 100), (100, 150), (150, 200), (200, 300), (300, 400), (400, 500)]

    if pollutant not in pollutant_limits:
        return None

    for i, (bl, bh) in enumerate(pollutant_limits[pollutant]):
        if bl <= concentration <= bh:
            il, ih = aqi_ranges[i]
            iaqi = ((ih - il) / (bh - bl)) * (concentration - bl) + il
            return round(iaqi, 2)
    return None

# Diccionario para convertir direcciones del viento a grados
wd_to_degrees = {
    'N': 0,
    'NNE': 22.5,
    'NE': 45,
    'ENE': 67.5,
    'E': 90,
    'ESE': 112.5,
    'SE': 135,
    'SSE': 157.5,
    'S': 180,
    'SSW': 202.5,
    'SW': 225,
    'WSW': 247.5,
    'W': 270,
    'WNW': 292.5,
    'NW': 315,
    'NNW': 337.5
}

# Lista explícita de archivos CSV en la carpeta `data/`
files = [
    'data/Data_Aotizhongxin.csv',
    'data/Data_Changping.csv',
    'data/Data_Dingling.csv',
    'data/Data_Dongsi.csv',
    'data/Data_Guanyuan.csv',
    'data/Data_Gucheng.csv',
    'data/Data_Huairou.csv',
    'data/Data_Nongzhanguan.csv',
    'data/Data_Shunyi.csv',
    'data/Data_Tiantan.csv',
    'data/Data_Wanliu.csv',
    'data/Data_Wanshouxigong.csv'
]

all_data = []

for file in files:
    df = pd.read_csv(file)
    print(f"Nombres de columnas en {file}: {df.columns.tolist()}")  # Imprime los nombres de las columnas
    station_name = df['station'].iloc[0].lower()
    latitude, longitude, notes = station_info.get(station_name, (None, None, None))

    # Calcular el promedio diario de las columnas numéricas únicamente
    daily_avg = df.groupby(['year', 'month', 'day']).mean(numeric_only=True).reset_index()

    for _, row in daily_avg.iterrows():
        aqi_values = [
            calculate_individual_aqi('PM2.5', row.get('PM2_5', None)),
            calculate_individual_aqi('PM10', row.get('PM10', None)),
            calculate_individual_aqi('SO2', row.get('SO2', None)),
            calculate_individual_aqi('NO2', row.get('NO2', None)),
            calculate_individual_aqi('CO', row.get('CO', None)),
            calculate_individual_aqi('O3', row.get('O3', None))
        ]
        max_aqi = max(filter(None, aqi_values), default=None)

        # Categorizar AQI del 1 al 6
        if max_aqi is not None:
            if max_aqi <= 50:
                aqi_category = 1
            elif max_aqi <= 100:
                aqi_category = 2
            elif max_aqi <= 150:
                aqi_category = 3
            elif max_aqi <= 200:
                aqi_category = 4
            elif max_aqi <= 300:
                aqi_category = 5
            else:
                aqi_category = 6
        else:
            aqi_category = None

        # Calcular el promedio de las direcciones del viento en grados
        wd_degrees = df[(df['year'] == row['year']) & (df['month'] == row['month']) & (df['day'] == row['day'])]['wd'].map(wd_to_degrees)
        average_wd = wd_degrees.mean() if not wd_degrees.empty else None

        # Formatear wd y WSPM a 2 decimales
        average_wd = round(average_wd, 2) if average_wd is not None else None
        wspm_value = round(row['WSPM'], 2) if 'WSPM' in row else None

        all_data.append({
            'station': station_name,
            'latitude': latitude,
            'longitude': longitude,
            'year': int(row['year']),
            'month': int(row['month']),
            'day': int(row['day']),
            'wd': average_wd,  # Promedio de dirección del viento en grados con 2 decimales
            'WSPM': wspm_value,  # Valor de WSPM con 2 decimales
            'AQI': aqi_category,  # Categoría AQI del 1 al 6
            'Notes': notes
        })

# Crear un DataFrame y exportar a CSV
output_df = pd.DataFrame(all_data)
output_df.to_csv('output_combined_aqi.csv', index=False)
print("Archivo CSV creado con éxito: output_combined_aqi.csv")
