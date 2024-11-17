import os
import pandas as pd

# Define los límites de contaminantes y rangos de AQI
pollutant_limits = {
    'PM2.5': [(0, 35), (35, 75), (75, 115), (115, 150), (150, 250), (250, 350), (350, 500)],
    'PM10': [(0, 50), (50, 150), (150, 250), (250, 350), (350, 420), (420, 500), (500, 600)],
    'SO2': [(0, 50), (50, 150), (150, 475), (475, 800), (800, 1600), (1600, 2100), (2100, 2620)],
    'NO2': [(0, 40), (40, 80), (80, 180), (180, 280), (280, 565), (565, 750), (750, 940)],
    'CO': [(0, 2), (2, 4), (4, 14), (14, 24), (24, 36), (36, 48), (48, 60)],
    'O3': [(0, 160), (160, 200), (200, 300), (300, 400), (400, 800), (800, 1000), (1000, 1200)]
}
aqi_ranges = [(0, 50), (50, 100), (100, 150), (150, 200), (200, 300), (300, 400), (400, 500)]

def calculate_individual_aqi(pollutant, concentration):
    """Calcula el IAQI individual de un contaminante dado."""
    if pollutant not in pollutant_limits or concentration is None:
        return None
    
    for i, (bl, bh) in enumerate(pollutant_limits[pollutant]):
        if bl <= concentration <= bh:
            il, ih = aqi_ranges[i]
            iaqi = ((ih - il) / (bh - bl)) * (concentration - bl) + il
            return int(iaqi)  # Asegura que sea un entero sin decimales
    return None

def process_file(file_path, output_folder):
    """Procesa un archivo CSV para calcular el AQI diario."""
    # Leer datos
    df = pd.read_csv(file_path)
    
    # Seleccionar solo columnas relevantes para cálculos numéricos
    numeric_columns = ['PM2_5', 'PM10', 'SO2', 'NO2', 'CO', 'O3', 'TEMP', 'PRES', 'DEWP', 'RAIN', 'WSPM']
    columns_to_group = ['year', 'month', 'day']
    numeric_df = df[columns_to_group + numeric_columns]
    
    # Convertir a promedio diario
    daily_avg = numeric_df.groupby(columns_to_group).mean().reset_index()
    
    # Calcular AQI diario
    aqi_results = []
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
        
        aqi_results.append({
            'year': row['year'],
            'month': row['month'],
            'day': row['day'],
            'AQI': aqi_category  # Solo AQI como entero
        })
    
    # Crear un DataFrame con resultados y guardarlo
    output_df = pd.DataFrame(aqi_results)
    output_filename = os.path.join(output_folder, os.path.basename(file_path))
    output_df.to_csv(output_filename, index=False, float_format='%d')  # Usa '%d' para asegurar que el valor se guarde como entero

def main():
    input_folder = 'data/'
    output_folder = 'AQI/'
    
    # Crear carpeta de salida si no existe
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)
    
    # Procesar cada archivo en la carpeta
    for filename in os.listdir(input_folder):
        if filename.endswith('.csv'):
            file_path = os.path.join(input_folder, filename)
            process_file(file_path, output_folder)
            print(f"Procesado: {filename}")

if __name__ == '__main__':
    main()
