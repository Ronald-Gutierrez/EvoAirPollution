import pandas as pd
from sklearn.cluster import KMeans

# Cargar el archivo CSV
df = pd.read_csv('UMAP_FUSION_NEW/Data_Wanshouxigong.csv')

# Seleccionar las columnas UMAP1 y UMAP2
umap_data = df[['UMAP1', 'UMAP2']]

# Realizar K-means con k=4
kmeans_4 = KMeans(n_clusters=4, random_state=42)
df['Kmeans_4'] = kmeans_4.fit_predict(umap_data)

# Realizar K-means con k=6
kmeans_6 = KMeans(n_clusters=6, random_state=42)
df['Kmeans_6'] = kmeans_6.fit_predict(umap_data)

# Guardar el DataFrame actualizado en un nuevo archivo CSV
df.to_csv('UMAP_FUSION_NEW/Data_Wanshouxigong.csv', index=False)

