// Variable para almacenar la última InfoWindow abierta
let lastInfoWindow = null;

// Función para inicializar el mapa de Beijing con Google Maps
function initMap() {
    const beijing = { lat: 40.3, lng: 116.5074 }; // Coordenadas de Beijing
    
    // Definir estilos personalizados para ocultar carreteras y otros elementos
    const mapStyles = [
        { featureType: "road", elementType: "geometry", stylers: [{ visibility: "on" }] }, // Muestra la geometría de las carreteras (trazado de las mismas)
        { featureType: "road", elementType: "labels", stylers: [{ visibility: "off" }] }, // Oculta las etiquetas (nombres) de las carreteras
        { featureType: "transit", elementType: "geometry", stylers: [{ visibility: "on" }] }, // Muestra la geometría del transporte público (e.g., líneas de metro o tren)
        { featureType: "poi", elementType: "all", stylers: [{ visibility: "on" }] }, // Muestra los puntos de interés (POI), como parques, museos, tiendas
        { featureType: "landscape", elementType: "labels", stylers: [{ visibility: "on" }] }, // Muestra las etiquetas del paisaje, que incluyen nombres de parques, áreas naturales
        { featureType: "administrative", elementType: "labels", stylers: [{ visibility: "on" }] }, // Muestra las etiquetas administrativas (nombres de ciudades, distritos, regiones)
        { featureType: "water", elementType: "labels", stylers: [{ visibility: "on" }] } // Muestra las etiquetas de cuerpos de agua, como ríos, lagos, mares
    ];
    

    const map = new google.maps.Map(document.getElementById("map"), {
        zoom: 8,
        center: beijing,
        styles: mapStyles,
        disableDefaultUI: false,
        zoomControl: false, // Desactiva el control de zoom (+ y -)
        mapTypeControl: true, // Desactiva el control para cambiar a vista de satélite
        streetViewControl: true // Desactiva el muñequito de Street View
    });

    const stationsByCity = {};

    // Cargar y procesar el GeoJSON para los distritos
    fetch('map/beijing.json')
        .then(response => response.json())
        .then(data => {
            data.features.forEach(feature => {
                const district = new google.maps.Polygon({
                    paths: feature.geometry.coordinates[0].map(coord => ({ lat: coord[1], lng: coord[0] })),
                    strokeColor: "#000000",
                    strokeOpacity: 0.5,
                    strokeWeight: 1.5,
                    fillColor: "#000000",
                    fillOpacity: 0.05,
                });
                district.setMap(map);
            });
        })
        .catch(error => {
            console.error("Error al cargar el GeoJSON:", error);
        });

    // Cargar el archivo CSV y agregar marcadores
    fetch('data/Data_Map_AQI_Day.csv')
        .then(response => response.text())
        .then(csvData => {
            const stations = parseCSV(csvData);
            stations.forEach(station => {
                const position = { lat: parseFloat(station.latitude), lng: parseFloat(station.longitude) };
                const marker = new google.maps.Marker({
                    position: position,
                    map: map,
                    title: station.stationId,
                    icon: {
                        url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
                        scaledSize: new google.maps.Size(20, 20)
                    }
                });

                // Crear un InfoWindow para mostrar información
                const infoWindow = new google.maps.InfoWindow();

                // Agregar un evento de clic al marcador
                marker.addListener("click", () => {
                    updateInfoWindowContent(infoWindow, station, map, marker);
                    // selectCityCheckbox(station.stationId);

                });

                // Asignar la estación al objeto de estaciones por ciudad
                if (!stationsByCity[station.city]) {
                    stationsByCity[station.city] = [];
                }
                stationsByCity[station.city].push({ marker, infoWindow });
            });

            map.stationsByCity = stationsByCity;
        })
        .catch(error => {
            console.error("Error al cargar el archivo CSV:", error);
        });

    // Agregar evento de cambio para los radio buttons de selección de ciudad
    const cityCheckboxes = document.querySelectorAll('input[name="city"]');
    cityCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            if (lastInfoWindow) {
                lastInfoWindow.close();
            }

            const selectedCity = checkbox.value;
            const stations = map.stationsByCity[selectedCity];

            if (stations) {
                const { marker, infoWindow } = stations[0];
                updateInfoWindowContent(infoWindow, stations[0], map, marker);
            }

            const lat = parseFloat(checkbox.getAttribute('data-lat'));
            const lng = parseFloat(checkbox.getAttribute('data-lng'));
            map.setCenter({ lat, lng });
            map.setZoom(12);
        });
    });
}

// Función para actualizar el contenido del InfoWindow
function updateInfoWindowContent(infoWindow, station, map, marker) {
    const fechaInicio = new Date(document.getElementById('fecha-inicio').value);
    fechaInicio.setDate(fechaInicio.getDate() +1);
    const fechaFin = new Date(document.getElementById('fecha-fin').value);
    fechaFin.setDate(fechaFin.getDate() );
    const { averageAQI, averageWSPM, averageWD } = calculateAverages(station, fechaInicio.toISOString().split('T')[0], fechaFin.toISOString().split('T')[0]);

    const content = `
    <div style="font-family: Arial, sans-serif; font-size: 12px; color: #333; padding: 8px 10px; max-width:180px; margin-top:-10px; max-height: 180px; line-height: 1.4; border-radius: 5px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);">
        <strong style="font-size: 14px; color: #1a73e8; display: block; margin-bottom: 5px;">${station.stationId.charAt(0).toUpperCase() + station.stationId.slice(1)}</strong>
        <p style="margin: 3px 0;"><strong>AQI:</strong> ${Math.round(averageAQI)}</p>
        <p style="margin: 3px 0;"><strong>Velocidad del viento:</strong> ${averageWSPM.toFixed(2)} m/s</p>
        <p style="margin: 3px 0;"><strong>Dirección del viento:</strong> ${averageWD}</p>
        <p style="margin: 3px 0;"><strong>Zona:</strong> ${station.Notes}</p>
        <p style="margin: 3px 0;"><strong>Fecha Inicio:</strong> ${new Date(fechaInicio).getDate()+1} de ${new Date(fechaInicio).getMonth() + 1 === 1 ? 'Enero' : new Date(fechaInicio).getMonth() + 1 === 2 ? 'Febrero' : new Date(fechaInicio).getMonth() + 1 === 3 ? 'Marzo' : new Date(fechaInicio).getMonth() + 1 === 4 ? 'Abril' : new Date(fechaInicio).getMonth() + 1 === 5 ? 'Mayo' : new Date(fechaInicio).getMonth() + 1 === 6 ? 'Junio' : new Date(fechaInicio).getMonth() + 1 === 7 ? 'Julio' : new Date(fechaInicio).getMonth() + 1 === 8 ? 'Agosto' : new Date(fechaInicio).getMonth() + 1 === 9 ? 'Septiembre' : new Date(fechaInicio).getMonth() + 1 === 10 ? 'Octubre' : new Date(fechaInicio).getMonth() + 1 === 11 ? 'Noviembre' : 'Diciembre'} de ${new Date(fechaInicio).getFullYear()}</p>
        <p style="margin: 3px 0;"><strong>Fecha Fin:</strong> ${new Date(fechaFin).getDate()} de ${new Date(fechaFin).getMonth() + 1 === 1 ? 'Enero' : new Date(fechaFin).getMonth() + 1 === 2 ? 'Febrero' : new Date(fechaFin).getMonth() + 1 === 3 ? 'Marzo' : new Date(fechaFin).getMonth() + 1 === 4 ? 'Abril' : new Date(fechaFin).getMonth() + 1 === 5 ? 'Mayo' : new Date(fechaFin).getMonth() + 1 === 6 ? 'Junio' : new Date(fechaFin).getMonth() + 1 === 7 ? 'Julio' : new Date(fechaFin).getMonth() + 1 === 8 ? 'Agosto' : new Date(fechaFin).getMonth() + 1 === 9 ? 'Septiembre' : new Date(fechaFin).getMonth() + 1 === 10 ? 'Octubre' : new Date(fechaFin).getMonth() + 1 === 11 ? 'Noviembre' : 'Diciembre'} de ${new Date(fechaFin).getFullYear()}</p>
    </div>`;


    infoWindow.setContent(content);
    openInfoWindow(map, marker, infoWindow);
}

// Función para calcular los promedios de AQI, WSPM y WD en un rango de fechas
function calculateAverages(station, fechaInicio, fechaFin) {
    if (!station.data) return { averageAQI: 0, averageWSPM: 0, averageWD: 0 };

    const startDate = new Date(fechaInicio);
    const endDate = new Date(fechaFin);
    let totalAQI = 0;
    let totalWSPM = 0;
    let totalWD = 0;
    let count = 0;

    station.data.forEach(entry => {
        const entryDate = new Date(entry.year, entry.month - 1, entry.day);
        if (entryDate >= startDate && entryDate <= endDate) {
            const aqi = parseFloat(entry.AQI);
            const wspm = parseFloat(entry.WSPM);
            const wd = entry.wd;

            if (!isNaN(aqi)) totalAQI += aqi;
            if (!isNaN(wspm)) totalWSPM += wspm;
            if (wd) totalWD = wd; // Assuming `wd` is categorical

            count++;
        }
    });

    return {
        averageAQI: count ? totalAQI / count : 0,
        averageWSPM: count ? totalWSPM / count : 0,
        averageWD: totalWD || "N/A"
    };
}

// Escuchar cambios en el rango de fechas
document.getElementById('fecha-inicio').addEventListener('change', updateStationInfoWindows);
document.getElementById('fecha-fin').addEventListener('change', updateStationInfoWindows);

function updateStationInfoWindows() {
    if (lastInfoWindow && lastInfoWindow.marker) {
        const marker = lastInfoWindow.marker;
        const station = marker.stationData;
        updateInfoWindowContent(lastInfoWindow, station, marker.map, marker);
    }
}

// Función para abrir InfoWindow y manejar el cierre de la anterior
function openInfoWindow(map, marker, infoWindow) {
    if (lastInfoWindow) {
        lastInfoWindow.close();
    }

    infoWindow.open(map, marker);
    lastInfoWindow = infoWindow;
    lastInfoWindow.marker = marker;
    map.setZoom(12);
    map.setCenter(marker.getPosition());
}
// Función para seleccionar el checkbox de la ciudad correspondiente
function selectCityCheckbox(city) {
    const newCity = `Data_${city.charAt(0).toUpperCase() + city.slice(1)}.csv`;
    console.log(newCity);
    const checkbox = document.querySelector(`input[name="city"][value="${newCity}"]`);
    if (checkbox) {
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event('change'));

    }
}
// Función para parsear CSV a objetos organizados por estación
function parseCSV(data) {
    const lines = data.split('\n');
    const headers = lines[0].split(',');
    const stations = {};

    for (let i = 1; i < lines.length; i++) {
        const currentline = lines[i].split(',');
        if (currentline.length === headers.length) {
            const entry = {};
            headers.forEach((header, index) => {
                entry[header.trim()] = currentline[index].trim();
            });

            const stationId = entry.stationId;
            if (!stations[stationId]) {
                stations[stationId] = {
                    stationId: stationId,
                    latitude: parseFloat(entry.latitude),
                    longitude: parseFloat(entry.longitude),
                    Notes: entry.Notes,
                    data: []
                };
            }
            stations[stationId].data.push(entry);
        }
    }

    return Object.values(stations);
}



// Escuchar cambios en los checkboxes de ciudad para la gráfica radial
document.querySelectorAll('#city-checkboxes input[type="radio"]').forEach(checkbox => {
    checkbox.addEventListener('change', updateChart);
});

// Escuchar cambios en los checkboxes de atributos para la gráfica radial
document.querySelectorAll('.options-chek input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', updateChart);
});

// Escuchar cambios en el rango de fechas para la gráfica radial
document.getElementById('fecha-inicio').addEventListener('change', updateChart);
document.getElementById('fecha-fin').addEventListener('change', updateChart);

document.getElementById('visualizar-todo').addEventListener('change', function () {
    const isChecked = this.checked;
    document.getElementById('fecha-inicio').disabled = isChecked;
    document.getElementById('fecha-fin').disabled = isChecked;
    updateChart();
    document.getElementById('fecha-rango').innerText = isChecked ? "Visualizando todos los datos." : "";
});

// Modificar la función updateChart para la gráfica radial
function updateChart() {
    const selectedCities = Array.from(document.querySelectorAll('#city-checkboxes input[type="radio"]:checked'))
                                .map(cb => cb.value);
    const selectedAttributes = Array.from(document.querySelectorAll('.options-chek input[type="checkbox"]:checked'))
                                   .map(cb => cb.value);

    const startDate = document.getElementById('fecha-inicio').value;
    const endDate = document.getElementById('fecha-fin').value;

    if (selectedCities.length === 0 || selectedAttributes.length === 0) return;

    selectedCities.forEach(selectedCity => {
        d3.csv(`data/${selectedCity}`).then(data => {
            const visualizarTodo = document.getElementById('visualizar-todo').checked;
            if (!visualizarTodo && startDate && endDate) {
                data = data.filter(d => {
                    const date = new Date(`${d.year}-${d.month}-${d.day}`);
                    return date >= new Date(startDate) && date <= new Date(endDate);
                });
            }

            const parsedData = d3.groups(data, d => `${d.year}-${d.month}-${d.day}`).map(([date, entries]) => {
                const avg = {};
                selectedAttributes.forEach(attr => {
                    const values = entries.map(d => +d[attr.replace('.', '_')]).filter(v => !isNaN(v));
                    avg[attr] = values.length > 0 ? d3.mean(values) : 0;
                });
                avg.date = date;
                avg.year = entries[0].year;
                avg.month = entries[0].month;
                avg.day = entries[0].day;
                return avg;
            });

            drawRadialChart(parsedData, selectedAttributes);
        });
    });
}
// Colores definidos para cada atributo
const attributeColors = {
    'PM2_5': '#FF5733',
    'PM10': '#FF8D1A',
    'SO2': '#C70039',
    'NO2': '#900C3F',
    'CO': '#581845',
    'O3': '#1D84B5',
    'TEMP': '#76D7C4',
    'PRES': '#F39C12',
    'DEWP': '#8E44AD',
    'RAIN': '#3498DB'
};

// Función para generar la gráfica radial
function drawRadialChart(data, attributes) {
    d3.select('#chart-view-radial').html("");
    const width = 450;
    const height = 450;
    const radius = Math.min(width, height) / 2 - 40;
    const svg = d3.select('#chart-view-radial')
                  .append('svg')
                  .attr('width', width)
                  .attr('height', height)
                  .append('g')
                  .attr('transform', `translate(${width / 2}, ${height / 2})`);

    const angleScale = d3.scaleLinear().domain([0, data.length]).range([0, 2 * Math.PI]);
    const maxValues = attributes.map(attr => d3.max(data, d => d[attr]));
    const centralHoleRadius = 30;
    const ringWidth = (radius - centralHoleRadius) / attributes.length;

    // Define colors for each season
    const seasonColors = {
        'Spring': '#2ca25f',
        'Summer': '#d95f0e',
        'Autumn': '#7570b3',
        'Winter': '#1f78b4',
        'YearRound': '#6a3d9a'
    };

    // Function to get season based on date
    function getSeason(month, day) {
        if ((month === 3 && day >= 20) || (month > 3 && month < 6) || (month === 6 && day <= 21)) {
            return 'Spring';
        } else if ((month === 6 && day >= 21) || (month > 6 && month < 9) || (month === 9 && day <= 22)) {
            return 'Summer';
        } else if ((month === 9 && day >= 22) || (month > 9 && month < 12) || (month === 12 && day <= 21)) {
            return 'Autumn';
        } else {
            return 'Winter';
        }
    }

    attributes.forEach((attr, index) => {
        const radialScale = d3.scaleLinear().domain([0, maxValues[index]]).range([centralHoleRadius + index * ringWidth, centralHoleRadius + (index + 1) * ringWidth]);

        svg.append("circle").attr("cx", 0).attr("cy", 0)
           .attr("r", radialScale(maxValues[index])).attr("fill", "none")
           .attr("stroke", "#000").attr("stroke-width", 1)
           .attr("stroke-dasharray", "3,3");

        const line = d3.lineRadial()
                      .angle((d, j) => angleScale(j))
                      .radius(d => radialScale(d[attr]) || 0);

        // Utiliza el color definido en `attributeColors` para cada serie
        const lineColor = attributeColors[attr] || '#000';  // Por si no está definido, asigna un color por defecto

        svg.append('path').datum(data)
           .attr('fill', 'none')
           .attr('stroke', lineColor)
           .attr('stroke-width', 1.5)
           .attr('d', line);

        svg.append('text')
           .attr('x', 0)
           .attr('y', -radialScale(maxValues[index]) - 10)
           .attr('dy', '-0.5em')
           .attr('text-anchor', 'middle')
           .attr('font-size', '14px')
           .attr('font-weight', 'bold')
           .text(attr);

        data.forEach((d, i) => {
            const season = getSeason(+d.month, +d.day);
            const seasonColor = seasonColors[season];
            const startAngle = angleScale(i);
            const endAngle = angleScale(i + 1);
            const pathArc = d3.arc()
                              .innerRadius(centralHoleRadius + index * ringWidth)
                              .outerRadius(radialScale(maxValues[index]))
                              .startAngle(startAngle)
                              .endAngle(endAngle);

            svg.append('path')
               .attr('d', pathArc)
               .attr('fill', seasonColor)
               .attr('opacity', 0.2);
        });
    });

    // Agregar etiquetas dinámicas de tiempo (meses o días)
    const timeSpan = (new Date(data[data.length - 1].date) - new Date(data[0].date)) / (1000 * 60 * 60 * 24);
    const isMonthly = timeSpan > 30;
    const isYearly = timeSpan > 365;

    const displayedLabels = new Set();  // Para evitar etiquetas repetidas

    data.forEach((d, i) => {
        const angle = angleScale(i);
        const x = Math.sin(angle) * (radius + 10);
        const y = -Math.cos(angle) * (radius + 10);

        let label;
        let labelKey;
        if (isYearly) {
            label = d3.timeFormat('%Y')(new Date(d.date));
            labelKey = `year-${label}`;
        } else if (isMonthly) {
            label = d3.timeFormat('%b')(new Date(d.date)); // Mes
            labelKey = `month-${label}`;
        } else {
            label = d3.timeFormat('%d %b')(new Date(d.date)); // Día y Mes
            labelKey = `day-${label}`;
        }

        // Mostrar solo si la etiqueta aún no se ha agregado
        if (!displayedLabels.has(labelKey)) {
            svg.append('text')
               .attr('x', x)
               .attr('y', y)
               .attr('dy', '0.35em')
               .attr('text-anchor', 'middle')
               .attr('font-size', '10px')
               .text(label);
            displayedLabels.add(labelKey);  // Marca la etiqueta como mostrada
        }
    });
}


///////////////////////////////////////////////
// Funciones para la matriz de correlación

// Escuchar cambios en los radio buttons de ciudades
document.querySelectorAll('#city-checkboxes input[type="radio"]').forEach(radio => {
    radio.addEventListener('change', updateCorrelationMatrix);
});

// Escuchar cambios en los checkboxes de atributos dentro de .options-chek-correlation
document.querySelectorAll('.options-chek-correlation input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', updateCorrelationMatrix);
});

// Escuchar cambios en el rango de fechas
document.getElementById('fecha-inicio').addEventListener('change', updateCorrelationMatrix);
document.getElementById('fecha-fin').addEventListener('change', updateCorrelationMatrix);

// Función para calcular la matriz de correlación
function calculateCorrelationMatrix(data, selectedAttributes) {
    const matrix = [];

    // Normalizar datos
    const normalizedData = normalizeData(data, selectedAttributes);

    // Iterar sobre cada par de atributos seleccionados
    for (let i = 0; i < selectedAttributes.length; i++) {
        const row = [];
        for (let j = 0; j < selectedAttributes.length; j++) {
            if (i === j) {
                row.push(1); // Correlación perfecta de un atributo consigo mismo
            } else {
                row.push(calculateCorrelation(normalizedData, selectedAttributes[i], selectedAttributes[j]));
            }
        }
        matrix.push(row);
    }

    return matrix;
}

// Función para normalizar los datos (z-score)
function normalizeData(data, selectedAttributes) {
    return data.map(d => {
        const normalizedEntry = {};
        selectedAttributes.forEach(attr => {
            const mean = d3.mean(data, d => +d[attr]);
            const stdDev = Math.sqrt(d3.mean(data, d => Math.pow(+d[attr] - mean, 2))); // desviación estándar
            normalizedEntry[attr] = (+d[attr] - mean) / stdDev;
        });
        return normalizedEntry;
    });
}

// Función para calcular la correlación entre dos atributos en los datos normalizados
function calculateCorrelation(data, attr1, attr2) {
    const n = data.length;
    const mean1 = d3.mean(data, d => d[attr1]);
    const mean2 = d3.mean(data, d => d[attr2]);
    let numerator = 0;
    let denominator1 = 0;
    let denominator2 = 0;

    data.forEach(d => {
        const x = d[attr1] - mean1;
        const y = d[attr2] - mean2;
        numerator += x * y;
        denominator1 += x * x;
        denominator2 += y * y;
    });

    return numerator / Math.sqrt(denominator1 * denominator2);
}


function calculateDistanceMatrix(correlationMatrix) {
    const numAttributes = correlationMatrix.length;
    const distanceMatrix = Array.from({ length: numAttributes }, () => Array(numAttributes).fill(0));

    for (let i = 0; i < numAttributes; i++) {
        for (let j = 0; j < numAttributes; j++) {
            distanceMatrix[i][j] = Math.sqrt(2 * (1 - correlationMatrix[i][j]));
        }
    }

    return distanceMatrix;
}

// Función que se ejecuta al cambiar los checkboxes de correlación
function updateCorrelationMatrix() {
    const selectedAttributes = Array.from(document.querySelectorAll('.options-chek-correlation input[type="checkbox"]:checked'))
                                   .map(cb => cb.value);

    if (selectedAttributes.length === 0) return;

    // Obtener las ciudades seleccionadas
    const selectedCities = Array.from(document.querySelectorAll('#city-checkboxes input[type="radio"]:checked'))
                                .map(cb => cb.value);

    // Obtener el rango de fechas si no es "visualizar todo"
    const startDate = document.getElementById('fecha-inicio').value;
    const endDate = document.getElementById('fecha-fin').value;
    const visualizarTodo = document.getElementById('visualizar-todo').checked;

    selectedCities.forEach(selectedCity => {
        // console.log(`Generando la matriz de correlación para la ciudad: ${selectedCity}`);
        // console.log(`Rango de fechas: ${visualizarTodo ? 'Todos los datos' : `${startDate} a ${endDate}`}`);

        d3.csv(`data/${selectedCity}`).then(data => {
            // Filtrar los datos por fechas estrictamente dentro del rango
            if (!visualizarTodo && startDate && endDate) {
                data = data.filter(d => {
                    const date = new Date(`${d.year}-${d.month}-${d.day}`);
                    return date > new Date(startDate) && date < new Date(endDate); // Filtrar fechas dentro del rango
                });
            }

            const parsedData = d3.groups(data, d => `${d.year}-${d.month}-${d.day}`).map(([date, entries]) => {
                const avg = {};
                selectedAttributes.forEach(attr => {
                    const values = entries.map(d => +d[attr.replace('.', '_')]).filter(v => !isNaN(v));
                    avg[attr] = values.length > 0 ? d3.mean(values) : 0;
                });
                return avg;
            });

            const correlationMatrix = calculateCorrelationMatrix(parsedData, selectedAttributes);
            const matrizdistancia = calculateDistanceMatrix(correlationMatrix);
            const hierarchyData = buildHierarchy(selectedAttributes, matrizdistancia);

            // Crear o actualizar el dendrograma radial con los rangos de fecha y la ciudad
            createRadialDendrogram(hierarchyData, selectedAttributes, matrizdistancia, selectedCity, visualizarTodo ? 'Todos los datos' : `${startDate} a ${endDate}`);
        });
    });
}

// Función para construir la jerarquía (usando la matriz de distancia)
function buildHierarchy(attributes, distanceMatrix) {
    let clusters = attributes.map((attr, i) => ({
        name: attr,
        index: i,
        points: [i],  // Cada clúster empieza con un solo punto
        children: []
    }));

    let n = clusters.length;

    while (n > 1) {
        let minAverageDistance = Infinity;
        let a, b;

        // Encontrar el par de clústeres con la menor distancia promedio
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                let sumDistance = 0;
                let count = 0;

                // Calcular la distancia promedio entre todos los pares de puntos en los clústeres i y j
                for (let pointI of clusters[i].points) {
                    for (let pointJ of clusters[j].points) {
                        sumDistance += distanceMatrix[pointI][pointJ];
                        count++;
                    }
                }

                const averageDistance = sumDistance / count;

                if (averageDistance < minAverageDistance) {
                    minAverageDistance = averageDistance;
                    a = i;
                    b = j;
                }
            }
        }

        // Crear un nuevo clúster combinando los clústeres a y b
        const newCluster = {
            name: clusters[a].name + '-' + clusters[b].name,
            distance: minAverageDistance,
            points: clusters[a].points.concat(clusters[b].points), // Unir puntos
            children: [clusters[a], clusters[b]]
        };

        // Actualizar la lista de clústeres
        clusters = clusters.filter((_, i) => i !== a && i !== b);
        clusters.push(newCluster);
        n--;
    }

    return clusters[0];  // Devolver la jerarquía final
}

function createRadialDendrogram(hierarchyData, selectedAttributes, distanceMatrix, selectedCity, dateRange) {
    // Verificar que los datos de entrada no sean undefined
    if (!hierarchyData || !selectedAttributes || !distanceMatrix || !selectedCity || !dateRange) {
        console.error("Datos de entrada inválidos:", { hierarchyData, selectedAttributes, distanceMatrix, selectedCity, dateRange });
        return; // Salir de la función si los datos son inválidos
    }

    const width = 300;
    const height = 310;
    const clusterRadius = 90;

    const clusterLayout = d3.cluster().size([2 * Math.PI, clusterRadius]);

    const root = d3.hierarchy(hierarchyData);
    clusterLayout(root);

    // Configurar el gráfico
    const svg = d3.select('#chart-view-dendrogram')
                  .html('')  // Limpiar el contenedor antes de redibujar
                  .append('svg')
                  .attr('width', width)
                  .attr('height', height)
                  .append('g')
                  .attr('transform', `translate(${width / 2}, ${height / 2})`);

    // Crear el tooltip
    const tooltip = d3.select('body').append('div')
                      .attr('class', 'tooltip')
                      .style('position', 'absolute')
                      .style('visibility', 'hidden')
                      .style('background', 'rgba(0, 0, 0, 0.7)')
                      .style('color', 'white')
                      .style('padding', '5px')
                      .style('border-radius', '5px');

    // Definir la escala de color
    const colorScale = d3.scaleLinear()
                         .domain([0, d3.max(distanceMatrix.flat())]) // Rango de 0 a la distancia máxima
                         .range(['red', 'blue']); // De rojo a azul

    // Dibujar los enlaces como líneas, sin áreas
    svg.selectAll('.link')
        .data(root.links())
        .enter().append('path')
        .attr('class', 'link')
        .attr('d', d3.linkRadial()
            .angle(d => d.x)
            .radius(d => d.y))
        .style('fill', 'none') // Eliminar área
        .style('stroke', d => {
            const attribute = d.target.data.name;
            return attribute && isMeteorologicalAttribute(attribute) ? 'blue' : '#ccc'; // Color azul para meteorología
        })
        .style('stroke-width', d => {
            const attribute = d.target.data.name;
            return attribute && isMeteorologicalAttribute(attribute) ? 2 : 1; // Grosor de línea
        })
        .style('stroke-dasharray', d => {
            const attribute = d.target.data.name;
            return attribute && isMeteorologicalAttribute(attribute) ? '5,5' : '0'; // Líneas discontinuas para meteorología
        });

    // Dibujar los nodos
    const node = svg.selectAll('.node')
                    .data(root.descendants())
                    .enter().append('g')
                    .attr('class', 'node')
                    .attr('transform', d => `rotate(${(d.x * 180 / Math.PI - 90)}) translate(${d.y}, 0)`);

    // Agregar círculo para los nodos
    node.append('circle')
        .attr('r', 5)
        .style('fill', d => {
            const distance = d.data.distance || 0;
            return colorScale(distance); // Aplicar el color basado en la distancia
        })
        .on('mouseover', (event, d) => {
            d3.select(event.currentTarget) // Seleccionar el círculo actual
                .transition() // Agregar una transición
                .duration(200) // Duración de la transición
                .attr('r', 8) // Aumentar el radio
                .style('stroke', 'yellow') // Cambiar el borde a amarillo
                .style('stroke-width', 2); // Grosor del borde
        
            // Mostrar el tooltip con la distancia del nodo, redondeada a dos decimales
            tooltip.html(`Distancia: ${(d.data.distance || 0).toFixed(2)}`)
                   .style('visibility', 'visible')
                   .style('left', `${event.pageX + 10}px`)
                   .style('top', `${event.pageY - 20}px`);
        })
        
        .on('mouseout', (event) => {
            d3.select(event.currentTarget) // Seleccionar el círculo actual
                .transition() // Agregar una transición
                .duration(200) // Duración de la transición
                .attr('r', 5) // Volver al radio original
                .style('stroke', 'none'); // Quitar el borde

            // Ocultar el tooltip
            tooltip.style('visibility', 'hidden');
        })
        .on('click', (event, d) => {
            // Obtén la ciudad y el contaminante de los datos
            const contaminant = d.data.name;
            const startDate = dateRange.split(' a ')[0];
            const endDate = dateRange.split(' a ')[1];

            // Mostrar los datos en consola
            console.log(`Ciudad: ${selectedCity}`);
            console.log(`Contaminante: ${contaminant}`);
            console.log(`Rango de fechas: ${startDate} a ${endDate}`);
            updateTimeSeriesChart(selectedCity, contaminant, startDate, endDate);
            
        });

        // Añadir los textos dinámicos según los atributos seleccionados
        node.append('text')
            .style('font-size', '14px')
            .style('font-weight', 'bold')
            .attr('dy', '.60em')
            .attr('text-anchor', d => d.x < Math.PI === !d.children ? 'start' : 'end')
            .attr('dx', d => d.x < Math.PI ? '10' : '-10')
            .attr('transform', d => d.x >= Math.PI ? 'rotate(180)' : null)
            .text(d => {
                const attributeIndex = d.data.index;
                return selectedAttributes.length > 0 ? selectedAttributes[attributeIndex] : d.data.name;
            });

        // Dibujar el triángulo rojo en el nodo raíz
        svg.append('polygon')
            .attr('points', `${-5},${-15} ${5},${-15} ${0},${-25}`)
            .attr('transform', `translate(0, -33) rotate(180)`)
            .style('fill', 'blue')
            .style('visibility', root.children ? 'visible' : 'hidden');
}


// Función para determinar si un atributo es meteorológico
function isMeteorologicalAttribute(attribute) {
    const meteorologicalAttributes = ['TEMP', 'PRES', 'DEWP', 'RAIN']; // Asegúrate de que estos sean los atributos correctos
    return meteorologicalAttributes.includes(attribute);
}



// GRAFICP ÁRA MI SERIE S TEMPORALES 
function updateTimeSeriesChart(selectedCity, contaminant, startDate, endDate) {
    currentContaminant = contaminant; // Asignar el contaminante actual

    const container = d3.select('#serie-temporal');

    const margin = { top: 20, right: 30, bottom: 60, left: 60 };
    const width = 820 - margin.left - margin.right;
    const height = 360 - margin.top - margin.bottom;

    let svg = container.select("svg g");
    if (svg.empty()) {
        // Crear el SVG solo si aún no existe
        svg = container.append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left}, ${margin.top})`);
            

        // Añadir etiquetas para los ejes solo una vez
        svg.append('text')
            .attr('class', 'y-label')
            .attr('x', -height / 2)
            .attr('y', -margin.left + 10)
            .attr('transform', 'rotate(-90)')
            .attr('text-anchor', 'middle')
            .attr('font-size', '12px');
    }

    // Límites diarios para cada contaminante
    const dailyLimits = {
        'PM2_5': 75,
        'PM10': 150,
        'CO': 4,
        'SO2': 150,
        'NO2': 80,
        'O3': 200
    };
     // Agregar la leyenda solo si no existe ya
     const legendData = [
        { color: '#00E400', label: 'Bueno' },
        { color: '#FFFF00', label: 'Moderado' },
        { color: '#FF7E00', label: 'Insalubre' },
        { color: '#FF0000', label: 'Muy Insalubre' },
        { color: '#99004c', label: 'Malo' },
        { color: '#800000', label: 'Severo' }
    ];

    // Verificar si la leyenda ya existe para evitar duplicados
    if (container.select('.legend-pca').empty()) {
        // Crear la leyenda solo si no existe
        const legend = container.insert('div', ':first-child')  // Insertar antes del primer hijo
            .attr('class', 'legend-pca')
            .style('display', 'flex')
            .style('justify-content', 'center')
            .style('margin-bottom', '10px')  // Aumentar el margen para dar más espacio
            .style('margin-left', '240px')  // Aumentar el margen para dar más espacio

            .style('font-family', 'Arial, sans-serif')  // Establecer una fuente limpia
            .style('font-weight', 'bold');  // Hacer el texto en negrita

        legendData.forEach(item => {
            legend.append('div')
                .attr('class', 'legend-item-pca')
                .style('background-color', item.color)
                .style('padding', '6px 12px')  // Reducir el padding para hacer los items más compactos
                .style('margin', '0 2px')  // Aumentar el margen entre los elementos
                .style('border-radius', '10px')  // Bordes redondeados para un diseño más suave
                .style('color', 'black')  // Asegurar que el texto sea blanco para que resalte sobre el color de fondo
                .style('text-align', 'center')  // Centrar el texto
                .text(item.label);
        });
    }

    // Definir los límites y colores del AQI
    const pollutantLimits = {
        'PM2_5': [[0, 35], [35, 75], [75, 115], [115, 150], [150, 250], [250, 350], [350, 500]],
        'PM10': [[0, 50], [50, 150], [150, 250], [250, 350], [350, 420], [420, 500], [500, 600]],
        'SO2': [[0, 50], [50, 150], [150, 475], [475, 800], [800, 1600], [1600, 2100], [2100, 2620]],
        'NO2': [[0, 40], [40, 80], [80, 180], [180, 280], [280, 565], [565, 750], [750, 940]],
        'CO': [[0, 2], [2, 4], [4, 14], [14, 24], [24, 36], [36, 48], [48, 60]],  // Rango en mg/m³ para CO
        'O3': [[0, 160], [160, 200], [200, 300], [300, 400], [400, 800], [800, 1000], [1000, 1200]]
    };
    const aqiRanges = [[0, 50], [50, 100], [100, 150], [150, 200], [200, 300], [300, 400], [400, 500]];
    const aqiColors = ['#00e400', '#ff0', '#ff7e00', '#f00', '#99004c', '#7e0023'];
    const meteorologicalColor = 'blue';

    function calculateIndividualAQI(pollutant, concentration) {
        if (concentration == null || !(pollutant in pollutantLimits)) return null;

        const limits = pollutantLimits[pollutant];
        for (let i = 0; i < limits.length; i++) {
            const [bl, bh] = limits[i];
            if (concentration >= bl && concentration <= bh) {
                const [il, ih] = aqiRanges[i];
                return ((ih - il) / (bh - bl)) * (concentration - bl) + il;
            }
        }
        return null;
    }

    function getAQICategory(aqi) {
        if (aqi <= 50) return 1;
        if (aqi <= 100) return 2;
        if (aqi <= 150) return 3;
        if (aqi <= 200) return 4;
        if (aqi <= 300) return 5;
        return 6;
    }

    // Crear el tooltip
    const tooltip = container.append('div')
        .attr('class', 'tooltip')
        .style('position', 'absolute')
        .style('background-color', '#fff')
        .style('border', '1px solid #ccc')
        .style('padding', '8px')
        .style('border-radius', '4px')
        .style('opacity', 0);

    d3.csv(`data/${selectedCity}`).then(data => {
        let internalStartDate = startDate;
        let internalEndDate = endDate;
        
        if (!internalStartDate || !internalEndDate) {
            const dates = data.map(d => new Date(`${d.year}-${d.month}-${d.day}`));
            const minDate = d3.min(dates);
            const maxDate = d3.max(dates);
            
            // Formatear las fechas al formato YYYY-MM-DD solo para uso interno
            internalStartDate = minDate.toISOString().split('T')[0];
            internalEndDate = maxDate.toISOString().split('T')[0];
        }

        // Usar las fechas internas para el filtrado
        const filteredData = data.filter(d => {
            const date = new Date(`${d.year}-${d.month}-${d.day}`);
            return date >= new Date(internalStartDate) && date <= new Date(internalEndDate);
        })
        
        .map(d => ({
            date: new Date(`${d.year}-${d.month}-${d.day}`),
            value: +d[contaminant.replace('.', '_')]  // Reemplazamos el punto por guion bajo para acceder a las propiedades
        }))
        .filter(d => !isNaN(d.value));
    

        // Convertir los valores de CO a mg/m³ si están en µg/m³
        const convertedData = filteredData.map(d => ({
            ...d,
            value: contaminant === 'CO' ? d.value / 1000 : d.value  // Convertir de µg/m³ a mg/m³ (si es CO)
        }));

        const averagedData = d3.groups(convertedData, d => d.date)
            .map(([date, values]) => ({
                date: date,
                value: d3.mean(values, d => d.value)
            }))
            .map(d => {
                const aqi = calculateIndividualAQI(contaminant, d.value);
                const category = aqi !== null ? getAQICategory(aqi) : null;
                const color = category ? aqiColors[category - 1] : meteorologicalColor;
                return { ...d, aqi, category, color };
            });

        const xScale = d3.scaleTime()
                         .domain(d3.extent(averagedData, d => d.date))
                         .range([0, width]);

        const yExtent = d3.extent(averagedData, d => d.value);
        const yScale = d3.scaleLinear()
                         .domain([Math.min(0, yExtent[0]), yExtent[1]])
                         .range([height, 0]);

        const xAxis = d3.axisBottom(xScale).tickFormat(d3.timeFormat("%Y-%m-%d"));
        const yAxis = d3.axisLeft(yScale);

        svg.selectAll('.x-axis')
           .data([null])
           .join(
               enter => enter.append('g').attr('class', 'x-axis')
                              .attr('transform', `translate(0, ${height})`)
                              .call(xAxis)
                              .selectAll("text")
                              .style("text-anchor", "end")
                              .attr("dx", "-0.8em")
                              .attr("dy", "-0.2em")
                              .attr("transform", "rotate(-45)"),
               update => update.transition().duration(750).call(xAxis)
           );

        svg.selectAll('.y-axis')
           .data([null])
           .join(
               enter => enter.append('g').attr('class', 'y-axis').call(yAxis),
               update => update.transition().duration(750).call(yAxis)
           );


        svg.select('.y-label')
        .text(`Nivel diario de ${contaminant}`)
        .style('font-size', '20px')
        .style('font-weight', 'bold')
        .attr('y', -margin.left + 20); // Ajusta el valor aquí para mover la etiqueta más abajo


        const points = svg.selectAll('.point')
                          .data(averagedData, d => d.date);

        points.enter()
              .append('circle')
              .attr('class', 'point')
              .attr('cx', d => xScale(d.date))
              .attr('cy', yScale(0))
              .attr('r', 4)
              .attr('fill', d => d.color)
              .on('mouseover', function(event, d) {
                const [mouseX, mouseY] = d3.pointer(event, svg.node());
                const selectedCity = document.querySelector('#city-checkboxes input[type="radio"]:checked').value;
                const point = d3.select(this);
                point.transition().duration(200).attr('r', 10).style('stroke', 'cyan').style('stroke-width', 3);
            
                const tooltipWidth = tooltip.node().offsetWidth;
                const tooltipHeight = tooltip.node().offsetHeight;
                const maxX = width + margin.left - tooltipWidth;
                const maxY = height + margin.top - tooltipHeight;
                const limitedX = Math.min(mouseX + margin.left, maxX);
                const limitedY = Math.max(mouseY + margin.top - tooltipHeight - 10, margin.top);

                tooltip.transition().duration(200).style('opacity', 1);
                tooltip.html(`<strong>Ciudad:</strong> ${selectedCity}<br>
                              <strong>Contaminante:</strong> ${currentContaminant}<br>
                              <strong>Fecha:</strong> ${d3.timeFormat("%Y-%m-%d")(d.date)}<br>
                              <strong>Concentración:</strong> ${d.value}<br>
                              <strong>AQI:</strong> ${d.aqi}`)
                       .style('left', `${limitedX}px`)
                       .style('top', `${limitedY}px`)
                       .style('color', 'black');
            })
            .on('mouseout', function() {
                const point = d3.select(this);
                point.transition().duration(200).attr('r', 5).style('stroke', 'none').style('stroke-width', 0);
                tooltip.transition().duration(200).style('opacity', 0);
            }) 
            .on('click', function(event, d) {
                // Eliminar la ventana flotante previa, si existe
                let floatingWindow = d3.select('#floating-window');
                if (!floatingWindow.empty()) {
                    floatingWindow.remove();
                }
            
                // Obtener las coordenadas del mouse
                const [mouseX, mouseY] = d3.pointer(event, svg.node());
            
                // Limitar la posición de la ventana emergente dentro de los límites de la gráfica
                const windowWidth = 400;
                const windowHeight = 240;
            
                const maxX = width + margin.left - windowWidth;
                const maxY = height + margin.top - windowHeight;
            
                const padding = 10;
                const limitedX = Math.min(mouseX + margin.left + padding, maxX);
                const limitedY = Math.min(mouseY + margin.top + padding, maxY);
            
                // Crear nueva ventana flotante
                floatingWindow = container.append('div')
                    .attr('id', 'floating-window')
                    .style('position', 'absolute')
                    .style('left', `${limitedX}px`)
                    .style('top', `${limitedY}px`)
                    .style('background-color', '#fff')
                    .style('border', '1px solid #ccc')
                    .style('padding', '10px')
                    .style('border-radius', '4px')
                    .style('box-shadow', '0px 4px 8px rgba(0, 0, 0, 0.1)')
                    .style('z-index', 1000);
            
                // Botón para cerrar la ventana
                floatingWindow.append('button')
                    .text('X')
                    .attr('class', 'close-button')
                    .style('position', 'absolute')
                    .style('top', '5px')
                    .style('right', '5px')
                    .style('border', 'none')
                    .style('background', 'transparent')
                    .style('font-size', '14px')
                    .style('cursor', 'pointer')
                    .on('click', () => floatingWindow.remove());
            
                const selectedCity = document.querySelector('#city-checkboxes input[type="radio"]:checked').value;
                const selectedDate = d3.timeFormat("%Y-%m-%d")(d.date);
            
                // Título de la ventana emergente
                floatingWindow.append('div')
                    .style('text-align', 'center')
                    .style('font-size', '14px')
                    .style('font-weight', 'bold')
                    .style('margin-bottom', '10px')
                    .text(`Serie temporal por hora de ${currentContaminant}`);
            
                // Colores asignados a cada contaminante y factor meteorológico
                const attributeColors = {
                    'PM2_5': '#FF5733',
                    'PM10': '#FF8D1A',
                    'SO2': '#C70039',
                    'NO2': '#900C3F',
                    'CO': '#581845',
                    'O3': '#1D84B5',
                    'TEMP': '#76D7C4',
                    'PRES': '#F39C12',
                    'DEWP': '#8E44AD',
                    'RAIN': '#3498DB'
                };
            
                // Agregar los checkboxes para los contaminantes y meteorológicos
                const checkboxContainer = floatingWindow.append('div')
                    .style('display', 'flex')
                    .style('flex-direction', 'column');
            
                const contaminants = ['PM2_5', 'PM10', 'SO2', 'NO2', 'CO', 'O3'];
                const meteorologicalFactors = ['TEMP', 'PRES', 'DEWP', 'RAIN'];
            
                // Agregar los checks para los contaminantes
                const contaminantChecks = checkboxContainer.append('div')
                    .style('display', 'flex')
                    .style('font-size', '12px');
            
                contaminants.forEach(contaminant => {
                    const isChecked = contaminant === currentContaminant;
                    contaminantChecks.append('label')
                        .style('margin-right', '10px')
                        .style('color', attributeColors[contaminant])
                        .text(contaminant)
                        .append('input')
                        .attr('type', 'checkbox')
                        .attr('value', contaminant)
                        .property('checked', isChecked)
                        .on('change', updateChart);
                });
            
                // Agregar los checks para los factores meteorológicos
                const meteorologicalChecks = checkboxContainer.append('div')
                    .style('display', 'flex')
                    .style('font-size', '12px');
            
                meteorologicalFactors.forEach(factor => {
                    const isCheckedmet = factor === currentContaminant;
            
                    meteorologicalChecks.append('label')
                        .style('margin-right', '10px')
                        .style('color', attributeColors[factor])
                        .text(factor)
                        .append('input')
                        .attr('type', 'checkbox')
                        .attr('value', factor)
                        .property('checked', isCheckedmet)
                        .on('change', updateChart);
                });
            
                function updateChart() {
                    // Obtener los contaminantes y factores seleccionados
                    const selectedContaminants = Array.from(floatingWindow.selectAll('input[type="checkbox"]:checked'))
                        .map(input => input.value);
            
                    // Cargar los datos horarios del día y contaminante seleccionado
                    d3.csv(`data/${selectedCity}`).then(hourlyData => {
                        const selectedDayData = hourlyData
                            .filter(row => {
                                const rowDate = new Date(`${row.year}-${row.month}-${row.day}`);
                                return rowDate.getTime() === d.date.getTime();
                            })
                            .map(row => {
                                const data = {};
                                selectedContaminants.forEach(contaminant => {
                                    data[contaminant] = +row[contaminant.replace('.', '_')] || NaN;
                                });
                                data.hour = +row.hour;
                                return data;
                            });
            
                        // Normalización de datos para los contaminantes seleccionados
                        selectedContaminants.forEach(contaminant => {
                            const values = selectedDayData.map(d => d[contaminant]).filter(v => !isNaN(v));
                            const minValue = d3.min(values);
                            const maxValue = d3.max(values);
            
                            selectedDayData.forEach(d => {
                                if (!isNaN(d[contaminant])) {
                                    d[contaminant] = (d[contaminant] - minValue) / (maxValue - minValue);
                                }
                            });
                        });
            
                        // Elimina el SVG anterior, si existe, para actualizar con nuevos datos
                        floatingWindow.select('svg').remove();
            
                        // Crear o actualizar el SVG para la serie temporal horaria
                        const miniMargin = { top: 20, right: 20, bottom: 40, left: 50 };
                        const miniWidth = 400 - miniMargin.left - miniMargin.right;
                        const miniHeight = 200 - miniMargin.top - miniMargin.bottom;
            
                        const miniSvg = floatingWindow.append('svg')
                            .attr('width', miniWidth + miniMargin.left + miniMargin.right)
                            .attr('height', miniHeight + miniMargin.top + miniMargin.bottom)
                            .append('g')
                            .attr('transform', `translate(${miniMargin.left}, ${miniMargin.top})`);
            
                        // Escalas y ejes
                        const xMiniScale = d3.scaleLinear()
                            .domain([0, 23])
                            .range([0, miniWidth]);
            
                        const xMiniAxis = d3.axisBottom(xMiniScale).ticks(8).tickValues(d3.range(0, 24, 3)).tickFormat(d => `${d}:00`);
                        const yMiniScale = d3.scaleLinear()
                            .domain([0, 1])  // Rango normalizado entre 0 y 1
                            .range([miniHeight, 0]);
            
                        const yMiniAxis = d3.axisLeft(yMiniScale);
            
                        miniSvg.append('g')
                            .attr('transform', `translate(0, ${miniHeight})`)
                            .call(xMiniAxis)
                            .selectAll('text')
                            .style('text-anchor', 'end')
                            .attr('dx', '-0.5em')
                            .attr('dy', '-0.2em')
                            .attr('transform', 'rotate(-45)');
            
                        miniSvg.append('g').call(yMiniAxis);
            
                        // Línea de la serie temporal para cada contaminante seleccionado
                        selectedContaminants.forEach(contaminant => {
                            const line = d3.line()
                                .defined(d => !isNaN(d[contaminant]))
                                .x(d => xMiniScale(d.hour))
                                .y(d => yMiniScale(d[contaminant]));
            
                            miniSvg.append('path')
                                .datum(selectedDayData)
                                .attr('fill', 'none')
                                .attr('stroke', attributeColors[contaminant])
                                .attr('stroke-width', 1.5)
                                .attr('d', line);
                        });
                    });
                }
            
                // Llamar a la función inicial para cargar la serie temporal por defecto
                updateChart();
            })
            
            .transition()
            .duration(750)
            .attr('cy', d => yScale(d.value));

        points.transition()
            .duration(750)
            .attr('cx', d => xScale(d.date))
            .attr('cy', d => yScale(d.value))
            .attr('fill', d => d.color);

        points.exit()
            .transition()
            .duration(750)
            .attr('cy', yScale(0))
            .remove();

        // Agregar línea límite diaria
        const limitValue = dailyLimits[contaminant];
        if (limitValue !== undefined) {
            svg.selectAll(".limit-line").remove(); // Eliminar cualquier línea límite existente
            
            svg.append("line")
               .attr("class", "limit-line")
               .attr("x1", 0)
               .attr("x2", width)
               .attr("y1", yScale(limitValue))
               .attr("y2", yScale(limitValue))
               .attr("stroke", "red")
               .attr("stroke-width", 1.5)
               .attr("stroke-dasharray", "5,5"); // Línea discontinua
        }
    });
}


// Variable global para almacenar el contaminante seleccionado actualmente
let currentContaminant = null;

// Escuchar cambios en los checkboxes de ciudad para la gráfica radial
// Escuchar cambios en los radio buttons de ciudad
document.querySelectorAll('#city-checkboxes input[type="radio"]').forEach(radio => {
    radio.addEventListener('change', () => {
        const selectedCity = radio.value;
        const startDate = document.getElementById('fecha-inicio').value;
        const endDate = document.getElementById('fecha-fin').value;
        
        // Establecer un contaminante por defecto (por ejemplo, PM2.5)
        currentContaminant = currentContaminant || 'PM2_5';
        
        // Actualizar las gráficas
        updateChart();
        updateCorrelationMatrix();
        // updateUMAP();
        updateTimeSeriesChart(selectedCity, currentContaminant, startDate, endDate);
    });
});

// Escuchar cambios en el rango de fechas para la gráfica radial
document.getElementById('fecha-inicio').addEventListener('change', () => {
    updateChart();
    if (currentContaminant) {
        const selectedCity = document.querySelector('#city-checkboxes input[type="radio"]:checked').value;
        const startDate = document.getElementById('fecha-inicio').value;
        const endDate = document.getElementById('fecha-fin').value;
        updateTimeSeriesChart(selectedCity, currentContaminant, startDate, endDate);
    }
});

document.getElementById('fecha-fin').addEventListener('change', () => {
    updateChart();
    if (currentContaminant) {
        const selectedCity = document.querySelector('#city-checkboxes input[type="radio"]:checked').value;
        const startDate = document.getElementById('fecha-inicio').value;
        const endDate = document.getElementById('fecha-fin').value;
        updateTimeSeriesChart(selectedCity, currentContaminant, startDate, endDate);
    }
});

document.getElementById('visualizar-todo').addEventListener('change', function () {
    const isChecked = this.checked;
    document.getElementById('fecha-inicio').disabled = isChecked;
    document.getElementById('fecha-fin').disabled = isChecked;
    
    // Actualizar todas las gráficas
    updateChart();
    updateCorrelationMatrix();
    
    // Actualizar la serie temporal si hay un contaminante seleccionado
    if (currentContaminant) {
        const selectedCity = document.querySelector('#city-checkboxes input[type="radio"]:checked').value;
        const startDate = isChecked ? null : document.getElementById('fecha-inicio').value;
        const endDate = isChecked ? null : document.getElementById('fecha-fin').value;
        updateTimeSeriesChart(selectedCity, currentContaminant, startDate, endDate);
    }
    
    document.getElementById('fecha-rango').innerText = isChecked ? "Visualizando todos los datos." : "";
});


//////////// GRAFICA DE REDUCCION DE DIMENSIONALIDADES ////////////

// Escuchar cambios en los radio buttons de ciudades
document.querySelectorAll('#city-checkboxes input[type="radio"]').forEach(radio => {
    radio.addEventListener('change', updateUMAP);
});

// Escuchar cambios en el rango de fechas
document.getElementById('fecha-inicio').addEventListener('change', updateUMAP);
document.getElementById('fecha-fin').addEventListener('change', updateUMAP);

// Manejar el checkbox de "Visualizar todo"
document.getElementById('visualizar-todo').addEventListener('change', function () {
    const isChecked = this.checked;
    document.getElementById('fecha-inicio').disabled = isChecked;
    document.getElementById('fecha-fin').disabled = isChecked;
    updateUMAP();
    document.getElementById('fecha-rango').innerText = isChecked ? "Visualizando todos los datos." : "";
});

async function fetchData(selectedCity) {
    const response = await fetch(`UMAP_AQI/${selectedCity}`);
    const data = await response.text();
    return d3.csvParse(data, d => ({
        year: +d.year,
        month: +d.month,
        day: +d.day,
        UMAP1: +d.UMAP1,
        UMAP2: +d.UMAP2,
        AQI: +d.AQI,
        city: selectedCity
    }));
}

function filterData(data, startDate, endDate) {
    if (!startDate || !endDate) return data;
    const start = new Date(startDate);
    const end = new Date(endDate);
    return data.filter(d => {
        const date = new Date(d.year, d.month - 1, d.day);
        return date >= start && date <= end;
    });
}

async function updateUMAP() {
    // Obtener la ciudad seleccionada
    const selectedCity = document.querySelector('#city-checkboxes input[type="radio"]:checked')?.value;
    if (!selectedCity) {
        alert("Por favor, selecciona una ciudad.");
        return;
    }

    // Obtener las fechas seleccionadas
    const visualizarTodo = document.getElementById('visualizar-todo').checked;
    const fechaInicio = !visualizarTodo ? document.getElementById('fecha-inicio').value : null;
    const fechaFin = !visualizarTodo ? document.getElementById('fecha-fin').value : null;

    // Obtener y filtrar los datos
    const data = await fetchData(selectedCity);
    const filteredData = filterData(data, fechaInicio, fechaFin);

    // Crear el gráfico
    plotUMAP(filteredData);
}


function plotUMAP(data) {
    // Limpiar el gráfico anterior
    d3.select("#umap-plot").selectAll("*").remove();

    // Dimensiones del contenedor
    const container = d3.select("#umap-plot");
    const width = container.node().clientWidth || 800; // Default width
    const height = container.node().clientHeight || 440; // Default height
    
// Crear SVG con fondo transparente
const svg = container.append("svg")
    .attr("transform", "translate(0, 0)")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .style("background", "none") // Fondo transparente
    .on("contextmenu", (event) => event.preventDefault()); // Desactivar menú contextual del navegador

    // Grupo para aplicar zoom
    const g = svg.append("g");

    // Escalas
    const xScale = d3.scaleLinear()
        .domain(d3.extent(data, d => d.UMAP1))
        .range([0, width]);

    const yScale = d3.scaleLinear()
        .domain(d3.extent(data, d => d.UMAP2))
        .range([height, 0]);

    // Colores según el nivel de AQI
    const colorScale = d3.scaleOrdinal()
        .domain([1, 2, 3, 4, 5, 6])
        .range(['#00E400', '#FFFF00', '#FF7E00', '#FF0000', '#99004c', '#800000']);

    // Tooltip
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("visibility", "hidden")
        .style("background", "rgba(0, 0, 0, 0.7)")
        .style("color", "#fff")
        .style("padding", "5px 10px")
        .style("border-radius", "5px")
        .style("font-size", "12px");

    // Dibujar puntos
        g.selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", d => xScale(d.UMAP1))
        .attr("cy", d => yScale(d.UMAP2))
        .attr("r", 6)
        .attr("fill", d => colorScale(d.AQI))
        .attr("opacity", 1)
        .attr("stroke", "none")  // Sin borde inicialmente
        .on("mouseover", (event, d) => {
            tooltip.style("visibility", "visible")
                .html(`
                    <strong>Ciudad:</strong> ${d.city}<br>
                    <strong>Fecha:</strong> ${d.day}/${d.month}/${d.year}<br>
                    <strong>AQI:</strong> ${d.AQI}
                `);
            
            // Cambiar el tamaño y agregar borde azul cuando el mouse esté sobre el punto
            d3.select(event.target)
                .transition()  // Usamos una transición para un efecto suave
                .duration(200)  // Duración de la animación
                .attr("r", 10)  // Aumentar el radio del círculo
                .attr("stroke", "blue")  // Establecer borde azul
                .attr("stroke-width", 3);  // Definir el grosor del borde
        })
        .on("mousemove", (event) => {
            tooltip.style("top", (event.pageY - 10) + "px")
                .style("left", (event.pageX + 10) + "px");
        })
        .on("mouseout", (event) => {
            tooltip.style("visibility", "hidden");
            
            // Restaurar el tamaño original y quitar el borde azul
            d3.select(event.target)
                .transition()  // Transición para suavizar el regreso
                .duration(200)  // Duración de la animación
                .attr("r", 5)  // Restaurar el radio original
                .attr("stroke", "none")  // Quitar el borde
                .attr("stroke-width", 0);  // Restablecer el grosor del borde
        });

    // Zoom
    const zoom = d3.zoom()
        .scaleExtent([0.5, 10])
        .on("zoom", (event) => {
            g.attr("transform", event.transform);
        });

    const initialTransform = d3.zoomIdentity.translate(width / 9.5, height / 9.5).scale(0.8);
    svg.call(zoom).call(zoom.transform, initialTransform);

    // Selección circular
    let selectionCircle;
    let selectionData = [];

    svg.on("mousedown", (event) => {
        if (event.button !== 2) return; // Solo activar con anticlick (botón derecho del mouse)

        const [startX, startY] = d3.pointer(event, g.node()); // Obtener posición relativa al grupo `g`

        if (selectionCircle) {
            selectionCircle.remove();
        }

        selectionCircle = g.append("circle")
            .attr("cx", startX)
            .attr("cy", startY)
            .attr("r", 0)
            .attr("fill", "rgba(100, 100, 255, 0.3)")
            .attr("stroke", "blue")
            .attr("stroke-width", 2);

        svg.on("mousemove", (event) => {
            const [currentX, currentY] = d3.pointer(event, g.node()); // Coordenadas actualizadas según el grupo `g`
            const radius = Math.sqrt(
                Math.pow(currentX - startX, 2) + Math.pow(currentY - startY, 2)
            );

            selectionCircle.attr("r", radius);
        });

        svg.on("mouseup", () => {
            svg.on("mousemove", null);
            svg.on("mouseup", null);
        
            const circleX = parseFloat(selectionCircle.attr("cx"));
            const circleY = parseFloat(selectionCircle.attr("cy"));
            const radius = parseFloat(selectionCircle.attr("r"));
        
            selectionData = data.filter(d => {
                const x = xScale(d.UMAP1);
                const y = yScale(d.UMAP2);
                return Math.sqrt(Math.pow(x - circleX, 2) + Math.pow(y - circleY, 2)) <= radius;
            });
        
            console.clear();
            console.log("Puntos seleccionados:");
            console.log(`Ciudad: ${selectionData[0].city}`);
            selectionData.forEach(d => {
                console.log(`Fecha: ${d.day}/${d.month}/${d.year}`);
            });
        
            const cityFile = selectionData[0].city; // Archivo de la ciudad seleccionada
            const dates = selectionData.map(d => `${d.year}-${d.month}-${d.day}`);
            
            drawThemeRiver(cityFile, dates);
        });
    });
}
async function drawThemeRiver(cityFile, dates) {
    const lastDate = new Date(dates[dates.length - 1]);
    const nextDate = new Date(lastDate);
    nextDate.setDate(lastDate.getDate() + 1);
    dates.push(nextDate.toISOString());

    const response = await fetch(`data/${cityFile}`);
    const csvData = await response.text();
    const data = d3.csvParse(csvData, d => ({
        date: new Date(+d.year, +d.month - 1, +d.day, +d.hour || 0),
        PM2_5: +d.PM2_5,
        PM10: +d.PM10,
        SO2: +d.SO2,
        NO2: +d.NO2,
        CO: +d.CO,
        O3: +d.O3,
        TEMP: +d.TEMP,
        PRES: +d.PRES,
        DEWP: +d.DEWP,
        RAIN: +d.RAIN,
    }));

    const selectedDatesSet = new Map(dates.map(date => [new Date(date).getTime(), true]));
    const filteredData = data.filter(d => selectedDatesSet.has(d.date.setMinutes(0, 0, 0)));

    if (filteredData.length === 0) {
        alert("No se encontraron datos para las fechas seleccionadas.");
        return;
    }

    const attributes = ["PM2_5", "PM10", "SO2", "NO2", "CO", "O3", "TEMP", "PRES", "DEWP", "RAIN"];
    const attributeStats = attributes.reduce((stats, attr) => {
        const values = filteredData.map(d => d[attr]);
        stats[attr] = { min: Math.min(...values), max: Math.max(...values) };
        return stats;
    }, {});

    const normalizedData = filteredData.map(d => {
        const normalized = { date: d.date };
        attributes.forEach(attr => {
            const { min, max } = attributeStats[attr];
            normalized[attr] = max > min ? (d[attr] - min) / (max - min) : 0.5;
        });
        return normalized;
    });

    const margin = { top: 50, right: 20, bottom: 30, left: 40 };
    const width = 600 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const container = d3.select("#evolution-plot");
    container.selectAll("*").remove();

    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const stack = d3.stack()
        .keys(attributes)
        .value((d, key) => d[key] || 0)
        .order(d3.stackOrderNone)
        .offset(d3.stackOffsetWiggle);

    const series = stack(normalizedData);

    const x = d3.scaleTime()
        .domain(d3.extent(normalizedData, d => d.date))
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([d3.min(series, s => d3.min(s, d => d[0])), d3.max(series, s => d3.max(s, d => d[1]))])
        .range([height, 0]);

    // Colores específicos para cada atributo
    const attributeColors = {
        'PM2_5': '#FF5733',
        'PM10': '#FF8D1A',
        'SO2': '#C70039',
        'NO2': '#900C3F',
        'CO': '#581845',
        'O3': '#1D84B5',
        'TEMP': '#76D7C4',
        'PRES': '#F39C12',
        'DEWP': '#8E44AD',
        'RAIN': '#3498DB'
    };

    svg.append("g")
        .selectAll("path")
        .data(series)
        .join("path")
        .attr("fill", (d) => attributeColors[d.key]) // Asignamos el color de cada flujo
        .attr("d", d3.area()
            .x(d => x(d.data.date))
            .y0(d => y(d[0]))
            .y1(d => y(d[1])));

    const minHeightThreshold = 5; // Límite en píxeles para mostrar etiquetas

    series.forEach(layer => {
        const layerData = layer;
        const totalLength = layerData.length;

        const positions = [
            { index: 0, anchor: "start" }, // Inicio
            { index: totalLength - 1, anchor: "end" } // Final
        ];

        positions.forEach(({ index, anchor }) => {
            const point = layerData[index];
            const height = y(point[0]) - y(point[1]);
            if (Math.abs(height) > minHeightThreshold) {
                svg.append("text")
                    .attr("x", x(point.data.date))
                    .attr("y", y((point[0] + point[1]) / 2))
                    .text(layer.key)
                    .attr("fill", "black") // Color de la etiqueta negro
                    .attr("font-size", "12px")
                    .attr("font-weight", "bold")
                    .attr("text-anchor", anchor)
                    .attr("alignment-baseline", "middle");
            }
        });
    });

    // Detectar fechas no consecutivas y agregar líneas entre ellas
    for (let i = 1; i < normalizedData.length; i++) {
        const prevDate = normalizedData[i - 1].date;
        const currentDate = normalizedData[i].date;

        // Verificar si las fechas no son consecutivas (diferencia mayor a 1 día)
        if ((currentDate - prevDate) > 24 * 60 * 60 * 1000) {
            svg.append("line")
                .attr("x1", x(currentDate))
                .attr("x2", x(currentDate))
                .attr("y1", 0)
                .attr("y2", height)
                .attr("stroke", "black")
                .attr("stroke-dasharray", "4,4") // Línea entrecortada
                .attr("stroke-width", 1);
        }
    }

    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x));

    svg.append("g")
        .call(d3.axisLeft(y));
}
