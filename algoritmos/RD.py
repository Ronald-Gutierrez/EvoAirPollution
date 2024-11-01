import pandas as pd
import matplotlib.pyplot as plt
from umap import UMAP
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import pairwise_distances
import numpy as np

# Cargar los datos desde el archivo CSV
data = pd.read_csv('data/Data_Aotizhongxin.csv')

# Seleccionar solo las columnas de interés
columns_of_interest = ['PM2_5', 'PM10', 'SO2', 'NO2', 'CO', 'O3', 'TEMP', 'PRES', 'DEWP', 'RAIN']
data_selected = data[columns_of_interest]

# Rellenar NaN con la media de cada columna
data_selected = data_selected.fillna(data_selected.mean())

# Preprocesamiento: Escalar los datos
scaler = StandardScaler()
data_scaled = scaler.fit_transform(data_selected)

# Calcular la varianza original
original_variance = np.var(data_scaled, axis=0).sum()

# Reducción de dimensionalidad con UMAP
umap = UMAP(n_components=2, random_state=42)
data_2d = umap.fit_transform(data_scaled)

# Calcular la varianza de las componentes reducidas
reduced_variance = np.var(data_2d, axis=0).sum()

# Calcular la pérdida de varianza
variance_loss = 1 - (reduced_variance / original_variance)

# Crear un DataFrame con las componentes reducidas
data_2d_df = pd.DataFrame(data_2d, columns=['Componente 1', 'Componente 2'])

# Guardar el DataFrame en un nuevo archivo CSV
data_2d_df.to_csv('data/Data_Aotizhongxin_2D.csv', index=False)

# Visualización del resultado
plt.figure(figsize=(10, 7))
plt.scatter(data_2d[:, 0], data_2d[:, 1], c='blue', alpha=0.5)
plt.title("Reducción de Dimensionalidad con UMAP a 2D")
plt.xlabel("Componente 1")
plt.ylabel("Componente 2")
plt.show()

# Mostrar la pérdida de varianza
print(f'Pérdida de varianza: {variance_loss:.4f}')
from sklearn.decomposition import PCA

# Aplicar PCA
pca = PCA(n_components=2, random_state=42)
data_pca = pca.fit_transform(data_scaled)

# Calcular la varianza de las componentes reducidas por PCA
reduced_variance_pca = np.var(data_pca, axis=0).sum()

# Calcular la pérdida de varianza para PCA
variance_loss_pca = 1 - (reduced_variance_pca / original_variance)

# Mostrar la pérdida de varianza para PCA
print(f'Pérdida de varianza con PCA: {variance_loss_pca:.4f}')
from sklearn.decomposition import PCA

# Aplicar PCA
pca = PCA(n_components=2, random_state=42)
data_pca = pca.fit_transform(data_scaled)

# Calcular la varianza de las componentes reducidas por PCA
reduced_variance_pca = np.var(data_pca, axis=0).sum()

# Calcular la pérdida de varianza para PCA
variance_loss_pca = 1 - (reduced_variance_pca / original_variance)

# Mostrar la pérdida de varianza para PCA
print(f'Pérdida de varianza con PCA: {variance_loss_pca:.4f}')
