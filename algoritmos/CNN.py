import pandas as pd
import numpy as np
import tensorflow as tf
from tensorflow.keras import layers, models
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

# Cargar los datos
data_path = 'data/Data_Aotizhongxin.csv'
data = pd.read_csv(data_path)

# Verificar tipos de datos
print(data.dtypes)

# Convertir características a numéricas, reemplazando errores por NaN
features = ['PM2_5', 'PM10', 'SO2', 'NO2', 'CO', 'O3', 'TEMP', 'PRES', 'DEWP', 'RAIN']
data[features] = data[features].apply(pd.to_numeric, errors='coerce')

# Verificar valores nulos y infinitos
print(data.isnull().sum())
print(np.isinf(data[features]).sum())

# Eliminar filas con NaN o inf
data.dropna(subset=features, inplace=True)
data = data[~np.isinf(data[features]).any(axis=1)]

# Preprocesar los datos
X = data[features].values
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# Dividir los datos en conjuntos de entrenamiento y prueba
X_train, X_test = train_test_split(X_scaled, test_size=0.2, random_state=42)

# Definición de la unidad residual
def residual_unit(x, filters):
    shortcut = x
    x = layers.Conv2D(filters, (3, 3), padding='same')(x)
    x = layers.BatchNormalization()(x)
    x = layers.ReLU()(x)
    x = layers.Conv2D(filters, (3, 3), padding='same')(x)
    x = layers.BatchNormalization()(x)
    x = layers.add([x, shortcut])  # Conexión de atajo
    x = layers.ReLU()(x)
    return x

# Definición del modelo AirRes
def air_res_model(input_shape):
    inputs = layers.Input(shape=input_shape)

    # Capa de convolución inicial
    x = layers.Conv2D(64, (7, 7), padding='same', strides=(2, 2))(inputs)
    x = layers.BatchNormalization()(x)
    x = layers.ReLU()(x)
    x = layers.MaxPooling2D((3, 3), strides=(2, 2), padding='same')(x)

    # Bloques residuales
    for _ in range(3):  # Ajustar el número de bloques según sea necesario
        x = residual_unit(x, 64)

    # Capas finales
    x = layers.GlobalAveragePooling2D()(x)
    outputs = layers.Dense(1)(x)  # Cambiado a 1 para regresión

    model = models.Model(inputs=inputs, outputs=outputs)
    return model

# Definir la forma de entrada
input_shape = (1, 10, 1)  # 10 características

# Crear el modelo
model = air_res_model(input_shape)
model.compile(optimizer=tf.keras.optimizers.Adam(learning_rate=0.0001), loss='mean_squared_error', metrics=['mae'])

# Redimensionar los datos para el modelo
X_train_reshaped = X_train.reshape(-1, 1, 10, 1)
X_test_reshaped = X_test.reshape(-1, 1, 10, 1)

# Usar PM2.5 como objetivo (etiquetas)
y_train = X_train[:, 0]  # Por ejemplo, PM2.5
y_test = X_test[:, 0]

# Entrenar el modelo
model.fit(X_train_reshaped, y_train, epochs=50, batch_size=32)

# Crear un modelo para extraer el vector de características
feature_extractor = models.Model(inputs=model.input, outputs=model.layers[-2].output)

# Extraer el vector de características
feature_vectors = feature_extractor.predict(X_test_reshaped)

# Mostrar el vector de características
print("Feature Vectors:")
print(feature_vectors)

# Guardar los vectores de características en un archivo CSV si lo deseas
feature_df = pd.DataFrame(feature_vectors)
feature_df.to_csv('feature_vectors.csv', index=False)
