# Rangos de concentración para cada contaminante
pollutant_limits = {
    'PM2.5': [(0, 35), (35, 75), (75, 115), (115, 150), (150, 250), (250, 350), (350, 500)],
    'PM10': [(0, 50), (50, 150), (150, 250), (250, 350), (350, 420), (420, 500), (500, 600)],
    'SO2': [(0, 50), (50, 150), (150, 475), (475, 800), (800, 1600), (1600, 2100), (2100, 2620)],
    'NO2': [(0, 40), (40, 80), (80, 180), (180, 280), (280, 565), (565, 750), (750, 940)],
    'CO': [(0, 2), (2, 4), (4, 14), (14, 24), (24, 36), (36, 48), (48, 60)],
    'O3': [(0, 160), (160, 200), (200, 300), (300, 400), (400, 800), (800, 1000), (1000, 1200)]
}

# Rango de AQI correspondiente a cada nivel
aqi_ranges = [(0, 50), (50, 100), (100, 150), (150, 200), (200, 300), (300, 400), (400, 500)]
aqi_categories = [
    (1, "I", "Excellent", "No health implications"),
    (2, "II", "Good", "Some pollutants may slightly affect very few hypersensitive individuals."),
    (3, "III", "Lightly Polluted", "Part of healthy people may experience slight irritations and sensitive individuals will be slightly affected to a larger extent."),
    (4, "IV", "Moderately Polluted", "Healthy people may manifest symptoms."),
    (5, "V", "Heavily Polluted", "Healthy people will be noticeably affected. People with breathing or heart problems will experience reduced endurance in activities."),
    (6, "VI", "Severely Polluted", "Healthy people will experience reduced endurance in activities. There may be strong irritations and symptoms and may trigger other illnesses.")
]

def calculate_individual_aqi(pollutant, concentration):
    if pollutant not in pollutant_limits:
        return "Contaminante no válido", None
    
    for i, (bl, bh) in enumerate(pollutant_limits[pollutant]):
        if bl <= concentration <= bh:
            il, ih = aqi_ranges[i]
            iaqi = ((ih - il) / (bh - bl)) * (concentration - bl) + il
            return round(iaqi, 2), i + 1  # Retorna el valor de AQI y el índice de la categoría
    return "Concentración fuera de rango", None

def get_aqi_category(level):
    for category in aqi_categories:
        if category[0] == level:
            return category
    return None

# Solicitar entrada del usuario
pollutant = input("Ingresa el tipo de contaminante (PM2.5, PM10, SO2, NO2, CO, O3): ").strip()
concentration = float(input("Ingresa la concentración del contaminante: "))

# Calcular el IAQI
aqi_value, category_level = calculate_individual_aqi(pollutant, concentration)

if category_level:
    category_info = get_aqi_category(category_level)
    print(f"El AQI para {pollutant} con una concentración de {concentration} es: {aqi_value}")
    print(f"Categoría: {category_info[1]} - {category_info[2]}")
    print(f"Implicaciones para la salud: {category_info[3]}")
else:
    print(aqi_value)
