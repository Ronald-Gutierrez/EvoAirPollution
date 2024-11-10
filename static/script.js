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
        'Spring': '#2ca25f',  // Verde fuerte
        'Summer': '#d95f0e',  // Naranja intenso
        'Autumn': '#7570b3',  // Púrpura
        'Winter': '#1f78b4',  // Azul
        'YearRound': '#6a3d9a' // Violeta oscuro
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

        svg.append('path').datum(data)
           .attr('fill', 'none')
           .attr('stroke', d3.schemeCategory10[index % 10])
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

    const years = Array.from(new Set(data.map(d => d.year)));
    years.forEach((year, i) => {
        const angle = angleScale((data.length / years.length) * i);
        const x = Math.sin(angle) * radius;
        const y = -Math.cos(angle) * radius;
        svg.append('text')
           .attr('x', x)
           .attr('y', y)
           .attr('dy', '0.35em')
           .attr('text-anchor', 'middle')
           .attr('font-size', '12px')
           .text(year);
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

    // Iterar sobre cada par de atributos seleccionados
    for (let i = 0; i < selectedAttributes.length; i++) {
        const row = [];
        for (let j = 0; j < selectedAttributes.length; j++) {
            if (i === j) {
                row.push(1); // Correlación perfecta de un atributo consigo mismo
            } else {
                row.push(calculateCorrelation(data, selectedAttributes[i], selectedAttributes[j]));
            }
        }
        matrix.push(row);
    }

    return matrix;
}

// Función para calcular la correlación entre dos atributos
function calculateCorrelation(data, attr1, attr2) {
    const n = data.length;
    const mean1 = d3.mean(data, d => +d[attr1]);
    const mean2 = d3.mean(data, d => +d[attr2]);
    let numerator = 0;
    let denominator1 = 0;
    let denominator2 = 0;

    data.forEach(d => {
        const x = +d[attr1] - mean1;
        const y = +d[attr2] - mean2;
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

    const width = 400;
    const height = 400;
    const clusterRadius = 140;

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

function updateTimeSeriesChart(selectedCity, contaminant, startDate, endDate) {
    currentContaminant = contaminant; // Asignar el contaminante actual

    const container = d3.select('#serie-temporal');

    const margin = { top: 20, right: 30, bottom: 60, left: 60 };
    const width = 1050 - margin.left - margin.right;
    const height = 380 - margin.top - margin.bottom;

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

    // Crear el tooltip (información que aparecerá al pasar el mouse sobre un punto)
    const tooltip = container.append('div')
        .attr('class', 'tooltip')
        .style('position', 'absolute')
        .style('background-color', '#fff')
        .style('border', '1px solid #ccc')
        .style('padding', '8px')
        .style('border-radius', '4px')
        .style('opacity', 0); // Empezamos con la opacidad a 0 (invisible)

    d3.csv(`data/${selectedCity}`).then(data => {
        const filteredData = data
        .filter(d => {
            const date = new Date(`${d.year}-${d.month}-${d.day}`);
            const adjustedStartDate = new Date(startDate);
            adjustedStartDate.setDate(adjustedStartDate.getDate() + 1); // Sumamos un día a la fecha de inicio
    
            return date >= adjustedStartDate && date <= new Date(endDate);
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
                const color = category ? aqiColors[category - 1] : meteorologicalColor; // Azul para meteorológicos
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
           .text(`Nivel diario de ${contaminant}`);

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
                // Obtener las coordenadas del punto donde se activa el tooltip
                const [mouseX, mouseY] = d3.pointer(event, svg.node());
                const selectedCity = document.querySelector('#city-checkboxes input[type="radio"]:checked').value;
                
                // Seleccionar el punto que fue hoverado
                const point = d3.select(this);
                
                // Cambiar el tamaño y borde del punto cuando el mouse está encima
                point.transition()
                     .duration(200)
                     .attr('r', 10)  // Hacerlo más grande
                     .style('stroke', 'cyan')  // Bordearlo con color celeste fluorescente
                     .style('stroke-width', 3);  // Grosor del borde
            
                // Calcular las dimensiones del tooltip
                const tooltipWidth = tooltip.node().offsetWidth;
                const tooltipHeight = tooltip.node().offsetHeight;
            
                // Limitar la posición del tooltip dentro de los límites de la gráfica
                const maxX = width + margin.left - tooltipWidth; // Limitar el tooltip hacia la derecha
                const maxY = height + margin.top - tooltipHeight; // Limitar el tooltip hacia abajo
            
                // Asegurarse de que el tooltip no se desborde fuera de la gráfica
                const limitedX = Math.min(mouseX + margin.left, maxX);
                const limitedY = Math.max(mouseY + margin.top - tooltipHeight - 10, margin.top);
            
                // Hacer visible el tooltip con los valores
                tooltip.transition()
                       .duration(200)
                       .style('opacity', 1);
            
                tooltip.html(`<strong>Ciudad:</strong> ${selectedCity}<br>
                              <strong>Contaminante:</strong> ${currentContaminant}<br>
                              <strong>Fecha:</strong> ${d3.timeFormat("%Y-%m-%d")(d.date)}<br>
                              <strong>Concentración:</strong> ${d.value}<br>
                              <strong>AQI:</strong> ${d.aqi}`)
                       .style('left', `${limitedX}px`)  // Centrado en la posición ajustada del mouse
                       .style('top', `${limitedY}px`)  // Encima del punto, ajustado con límites
                       .style('color', 'black'); // Color de texto en negro
            })
            .on('mouseout', function() {
                // Seleccionar el punto
                const point = d3.select(this);
            
                // Regresar al tamaño y estilo original
                point.transition()
                     .duration(200)
                     .attr('r', 5)  // Regresar al tamaño original
                     .style('stroke', 'none')  // Eliminar el borde
                     .style('stroke-width', 0); // Eliminar el grosor del borde
            
                // Hacer invisible el tooltip
                tooltip.transition()
                       .duration(200)
                       .style('opacity', 0);
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
                const windowHeight = 220;
            
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
                const selectedDate = d3.timeFormat("%Y-%m-%d")(d.date);  // Formatear la fecha
            
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
                        .style('color', attributeColors[contaminant]) // Establecer el color del texto
                        .text(contaminant)
                        .append('input')
                        .attr('type', 'checkbox')
                        .attr('value', contaminant)
                        .property('checked', isChecked)  // Preseleccionar el contaminante actual
                        .on('change', updateChart);
                });
            
                // Agregar los checks para los factores meteorológicos
                const meteorologicalChecks = checkboxContainer.append('div')
                    .style('display', 'flex')
                    .style('font-size', '12px');
            
                meteorologicalFactors.forEach(factor => {
                    meteorologicalChecks.append('label')
                        .style('margin-right', '10px')
                        .style('color', attributeColors[factor]) // Establecer el color del texto
                        .text(factor)
                        .append('input')
                        .attr('type', 'checkbox')
                        .attr('value', factor)
                        .property('checked', false)  // Puedes preseleccionar según sea necesario
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
                            })
                            .filter(row => Object.values(row).some(val => !isNaN(val)));  // Filtrar datos válidos
            
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
            
                        // Escalas y ejes con soporte para valores negativos
                        const yMax = d3.max(selectedDayData, d => Math.max(...Object.values(d).filter(val => !isNaN(val))));
                        const yMin = d3.min(selectedDayData, d => Math.min(...Object.values(d).filter(val => !isNaN(val))));
                        const yMiniScale = d3.scaleLinear()
                            .domain([yMin, yMax])  // Escala dinámica para incluir valores negativos
                            .range([miniHeight, 0]);
            
                        const xMiniScale = d3.scaleLinear()
                            .domain([0, 23])  // Rango de horas en el día
                            .range([0, miniWidth]);
            
                        const xMiniAxis = d3.axisBottom(xMiniScale).ticks(8).tickValues(d3.range(0, 24, 3)).tickFormat(d => `${d}:00`);
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
            
                        // Dibuja guías para todas las horas
                        for (let hour = 0; hour < 24; hour++) {
                            miniSvg.append('line')
                                .attr('x1', xMiniScale(hour))
                                .attr('x2', xMiniScale(hour))
                                .attr('y1', 0)
                                .attr('y2', miniHeight)
                                .style('stroke', '#ccc')
                                .style('stroke-dasharray', '2,2');
                        }
            
                        // Línea de la serie temporal para cada contaminante seleccionado
                        selectedContaminants.forEach(contaminant => {
                            const line = d3.line()
                                .x(d => xMiniScale(d.hour))
                                .y(d => yMiniScale(d[contaminant]));
            
                            miniSvg.append('path')
                                .datum(selectedDayData)
                                .attr('fill', 'none')
                                .attr('stroke', attributeColors[contaminant])  // Usar el color del contaminante
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
    });
}


// Variable global para almacenar el contaminante seleccionado actualmente
let currentContaminant = null;

// Escuchar cambios en los checkboxes de ciudad para la gráfica radial
document.querySelectorAll('#city-checkboxes input[type="radio"]').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
        updateChart();
        // Si ya hay un contaminante seleccionado, actualizamos la serie temporal
        if (currentContaminant) {
            const selectedCity = document.querySelector('#city-checkboxes input[type="radio"]:checked').value;
            const startDate = document.getElementById('fecha-inicio').value;
            const endDate = document.getElementById('fecha-fin').value;
            updateTimeSeriesChart(selectedCity, currentContaminant, startDate, endDate);
        }
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