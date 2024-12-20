import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.decomposition import PCA
from sklearn.manifold import TSNE
import umap
from sklearn.manifold import trustworthiness
from sklearn.metrics import pairwise_distances

# Crear la carpeta de salida
output_path = 'algoritmos'
if not os.path.exists(output_path):
    os.makedirs(output_path)

# Cargar datos
input_path = 'algoritmos/encoded_features.csv'
data = np.loadtxt(input_path, delimiter=',', skiprows=1)

# Reducción de dimensionalidad
# PCA
pca = PCA(n_components=2)
pca_result = pca.fit_transform(data)

# t-SNE
tsne = TSNE(n_components=2, random_state=42)
tsne_result = tsne.fit_transform(data)

# UMAP
umap_reducer = umap.UMAP(n_components=2, random_state=42)
umap_result = umap_reducer.fit_transform(data)

# Evaluación de métricas
original_distances = pairwise_distances(data)

trust_pca = trustworthiness(data, pca_result, n_neighbors=5)
trust_tsne = trustworthiness(data, tsne_result, n_neighbors=5)
trust_umap = trustworthiness(data, umap_result, n_neighbors=5)

continuity_pca = np.corrcoef(original_distances.ravel(), pairwise_distances(pca_result).ravel())[0, 1]
continuity_tsne = np.corrcoef(original_distances.ravel(), pairwise_distances(tsne_result).ravel())[0, 1]
continuity_umap = np.corrcoef(original_distances.ravel(), pairwise_distances(umap_result).ravel())[0, 1]

# Guardar métricas en un archivo CSV
metrics = pd.DataFrame({
    'Method': ['PCA', 't-SNE', 'UMAP'],
    'Trustworthiness': [trust_pca, trust_tsne, trust_umap],
    'Continuity': [continuity_pca, continuity_tsne, continuity_umap]
})
metrics.to_csv(os.path.join(output_path, 'tabla_metrica.csv'), index=False)

# Guardar resultados de las reducciones en CSV
np.savetxt(os.path.join(output_path, 'pca_result.csv'), pca_result, delimiter=',', header="PCA1,PCA2", comments='')
np.savetxt(os.path.join(output_path, 'tsne_result.csv'), tsne_result, delimiter=',', header="tSNE1,tSNE2", comments='')
np.savetxt(os.path.join(output_path, 'umap_result.csv'), umap_result, delimiter=',', header="UMAP1,UMAP2", comments='')

# Visualización y guardado de imágenes
plt.figure(figsize=(6, 6))
plt.scatter(pca_result[:, 0], pca_result[:, 1], c='purple', label='PCA')
plt.title('PCA Result')
plt.legend()
plt.savefig(os.path.join(output_path, 'pca_plot.png'))
plt.show()

plt.figure(figsize=(6, 6))
plt.scatter(tsne_result[:, 0], tsne_result[:, 1], c='green', label='t-SNE')
plt.title('t-SNE Result')
plt.legend()
plt.savefig(os.path.join(output_path, 'tsne_plot.png'))
plt.show()

plt.figure(figsize=(6, 6))
plt.scatter(umap_result[:, 0], umap_result[:, 1], c='grey', label='UMAP')
plt.title('UMAP Result')
plt.legend()
plt.savefig(os.path.join(output_path, 'umap_plot.png'))
plt.show()
