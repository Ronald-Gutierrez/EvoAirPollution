import pandas as pd

# Cargar los datos de ambos archivos CSV
data_to_replace = pd.read_csv('Red_Dim_Cont/Data_Wanshouxigong.csv')
main_data = pd.read_csv('UMAP_CONT/Data_Wanshouxigong.csv')

# Verificar si ambos archivos tienen el mismo número de filas (para garantizar que los reemplazos se correspondan)
if len(data_to_replace) == len(main_data):
    # Reemplazar las columnas UMAP1 y UMAP2 en el archivo principal
    main_data['UMAP1'] = data_to_replace['UMAP1']
    main_data['UMAP2'] = data_to_replace['UMAP2']
    
    # Guardar el archivo actualizado
    main_data.to_csv('UMAP_CONT_UNION/Data_Wanshouxigong.csv', index=False)
    print("El archivo de UMAP_CONT_UNION se ha actualizado correctamente.")
else:
    print("El número de filas en los archivos de UMAP_CONT no coincide. Verifica los datos.")

# Ahora para el segundo archivo
data_to_replace_met = pd.read_csv('Red_Dim_Met/Data_Wanshouxigong.csv')
main_data_met = pd.read_csv('UMAP_MET/Data_Wanshouxigong.csv')

# Verificar si ambos archivos tienen el mismo número de filas (para garantizar que los reemplazos se correspondan)
if len(data_to_replace_met) == len(main_data_met):
    # Reemplazar las columnas UMAP1 y UMAP2 en el archivo principal
    main_data_met['UMAP1'] = data_to_replace_met['UMAP1']
    main_data_met['UMAP2'] = data_to_replace_met['UMAP2']
    
    # Guardar el archivo actualizado
    main_data_met.to_csv('UMAP_MET_UNION/Data_Wanshouxigong.csv', index=False)
    print("El archivo de UMAP_MET_UNION se ha actualizado correctamente.")
else:
    print("El número de filas en los archivos de UMAP_MET no coincide. Verifica los datos.")
