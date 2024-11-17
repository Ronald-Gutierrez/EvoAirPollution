import pandas as pd
import matplotlib.pyplot as plt

# Cargar los datos desde el archivo CSV
file_path = 'UMAP_AQI/Data_Wanshouxigong.csv'
data = pd.read_csv(file_path)

# Verificar que los datos se han cargado correctamente
print(data.head())  # Imprimir las primeras filas del archivo para verificar

# Convertir las columnas 'year', 'month' y 'day' a enteros
data['year'] = data['year'].astype(int)
data['month'] = data['month'].astype(int)
data['day'] = data['day'].astype(int)

# Crear una figura y un eje
fig, ax = plt.subplots(figsize=(8, 6))

# Graficar UMAP1 vs UMAP2 y hacer los puntos seleccionables
scatter = ax.scatter(data['UMAP1'], data['UMAP2'], c=data['AQI'], cmap='viridis', s=10, picker=True)

# Añadir la barra de colores
plt.colorbar(scatter, label='AQI')

# Títulos y etiquetas
ax.set_title('UMAP1 vs UMAP2')
ax.set_xlabel('UMAP1')
ax.set_ylabel('UMAP2')
ax.grid(True)

# Función para manejar el evento de 'hover'
def on_hover(event):
    # Verificar si el mouse está sobre un punto
    if event.inaxes == ax:
        # Obtener los índices de los puntos seleccionados
        contains, index = scatter.contains(event)
        if contains:
            # Obtener la fecha correspondiente al punto
            idx = index['ind'][0]  # Usar el primer índice
            # Convertir año, mes y día a enteros y luego construir la fecha
            year = int(data.iloc[idx]['year'])
            month = int(data.iloc[idx]['month'])
            day = int(data.iloc[idx]['day'])
            date = f"{year}-{month:02d}-{day:02d}"
            # Mostrar la fecha en la consola o como un popup
            print(f"Fecha del punto seleccionado: {date}")
            
# Conectar el evento de hover con la función 'on_hover'
fig.canvas.mpl_connect('motion_notify_event', on_hover)

# Mostrar el gráfico
plt.show()
