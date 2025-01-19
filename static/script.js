// Variable para almacenar la última InfoWindow abierta
let lastInfoWindow = null;

// Función para inicializar el mapa de Beijing con Google Maps
function initMap() {
    // Establecer fechas aleatorias por defecto
    const randomDate = new Date(2013, 0, 1);  // Fecha inicial
    const endDate = new Date(2016, 2, 31);   // Fecha final
    const timeRange = endDate.getTime() - randomDate.getTime();
    const randomTime = Math.random() * timeRange;
    const selectedDate = new Date(randomDate.getTime() + randomTime);
    
    // Formatear las fechas para los inputs
    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Establecer fechas por defecto en los inputs
    document.getElementById('fecha-inicio').value = formatDate(selectedDate);
    document.getElementById('fecha-fin').value = formatDate(new Date(selectedDate.getTime() + (300 * 24 * 60 * 60 * 1000))); // 7 días después

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
        mapTypeControl: false, // Desactiva el control para cambiar a vista de satélite
        streetViewControl: false // Desactiva el muñequito de Street View
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
                const iconUrl = createCustomIcon(station.Notes);

                const marker = new google.maps.Marker({
                    position: position,
                    map: map,
                    // title: station.stationId,
                    icon: {
                        url: iconUrl,
                        scaledSize: new google.maps.Size(25, 25)
                    }
                });
                // Crear un InfoWindow para mostrar información
                const infoWindow = new google.maps.InfoWindow();

                // Agregar un evento de clic al marcador
                marker.addListener("click", () => {
                    updateInfoWindowContent(infoWindow, station, map, marker);
                    // selectCityCheckbox(station.stationId);

                });
                // Crear un elemento div para el tooltip
                const tooltipDiv = document.createElement('div');
                tooltipDiv.style.position = 'absolute';
                tooltipDiv.style.background = '#ffffff';
                tooltipDiv.style.color = '#333';
                tooltipDiv.style.border = '1px solid #ccc';
                tooltipDiv.style.borderRadius = '5px';
                tooltipDiv.style.padding = '5px 10px';
                tooltipDiv.style.fontSize = '12px';
                tooltipDiv.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
                tooltipDiv.style.display = 'none'; // Inicialmente oculto
                document.body.appendChild(tooltipDiv);

                // Evento de mouseover para mostrar el tooltip
                marker.addListener("mouseover", (e) => {
                    tooltipDiv.style.display = 'block';
                    tooltipDiv.innerHTML = `<strong>${station.stationId.charAt(0).toUpperCase() + station.stationId.slice(1)}</strong>`;
                    tooltipDiv.style.left = `${e.domEvent.pageX + 10}px`; // Posicionar cerca del mouse
                    tooltipDiv.style.top = `${e.domEvent.pageY + 10}px`;
                });

                // Evento de mousemove para actualizar la posición del tooltip
                marker.addListener("mousemove", (e) => {
                    tooltipDiv.style.left = `${e.domEvent.pageX + 10}px`;
                    tooltipDiv.style.top = `${e.domEvent.pageY + 10}px`;
                });

                // Evento de mouseout para ocultar el tooltip
                marker.addListener("mouseout", () => {
                    tooltipDiv.style.display = 'none';
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


let  ColorAqiglobal = null;
function updateInfoWindowContent(infoWindow, station, map, marker) {
    const fechaInicio = new Date(document.getElementById('fecha-inicio').value);
    fechaInicio.setDate(fechaInicio.getDate() + 1);
    const fechaFin = new Date(document.getElementById('fecha-fin').value);
    fechaFin.setDate(fechaFin.getDate());
    const { averageAQI, averageWSPM, averageWD } = calculateAverages(station, fechaInicio.toISOString().split('T')[0], fechaFin.toISOString().split('T')[0]);


    // Convertir la dirección del viento en grados a formato de texto
    const windDirection = averageWD; // Se asume que averageWD es la dirección en grados (0-360)
    
    // Crear la flecha rotada con un div
    const windArrow = `
    <div style="position: relative; display: inline-block; width: 0; height: 0; transform: rotate(${windDirection}deg); margin: auto;">
        <div style="position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 2px; height: 30px; background-color: #FF5733;"></div>
        <div style="position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-bottom: 10px solid #FF5733;"></div>
    </div>`;

    // Formatear las fechas
    const formatDate = (date) => {
        const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        return `${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`;
    };

    const content = `
    <div style="font-family: Arial, sans-serif; font-size: 12px; color: #333; padding: 8px 10px; max-width:180px; margin-top:-10px; max-height: 200px; line-height: 1.4; border-radius: 5px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);">
        <strong style="font-size: 14px; color: #1a73e8; display: block; margin-bottom: 5px;">${station.stationId.charAt(0).toUpperCase() + station.stationId.slice(1)}</strong>
        <p style="margin: 3px 0;">
            <strong>AQI:</strong> 
            <span style="background-color: ${averageAQI >= 0 && averageAQI <= 1.5 ? '#00e400' : averageAQI > 1.5 && averageAQI <= 2.5 ? '#ff0' : averageAQI > 2.5 && averageAQI <= 3.5 ? '#ff7e00' : averageAQI > 3.5 && averageAQI <= 4.5 ? '#f00' : averageAQI > 4.5 && averageAQI <= 5 ? '#99004c' : '#7e0023'}; color: #000; padding: 2px 5px; border-radius: 5px;">
                ${Math.round(averageAQI)}
            </span>
        </p>
        <p style="margin: 3px 0;"><strong>Velocidad del viento:</strong> ${averageWSPM.toFixed(2)} m/s</p>
        <p style="margin: 3px 0;">
            <strong>Dirección del viento:</strong> ${averageWD}° 
            <div style="display: flex; justify-content: center; align-items: center; margin-top: 25px;">
                ${windArrow}
            </div>
        </p>
        <p style="margin: 3px 0;"><strong>Zona:</strong> ${station.Notes}</p>
        <p style="margin: 3px 0;"><strong>Fecha Inicio:</strong> ${formatDate(fechaInicio)}</p>
        <p style="margin: 3px 0;"><strong>Fecha Fin:</strong> ${formatDate(fechaFin)}</p>
    </div>`;

    // console.log(averageAQI)
    ColorAqiglobal = averageAQI
    // console.log(ColorAqiglobal)
    // console.log(station.stationId)
    selectCityCheckbox(station.stationId)
    infoWindow.setContent(content);
    openInfoWindow(map, marker, infoWindow);
}
function selectCityCheckbox(city) {
    const newCity = `Data_${city.charAt(0).toUpperCase() + city.slice(1)}.csv`;
    // console.log(newCity);
    const checkbox = document.querySelector(`input[name="city"][value="${newCity}"]`);
    if (checkbox) {
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event('change'));
    }
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
function createCustomIcon(category) {
    const svg = d3.create("svg")
        .attr("xmlns", "http://www.w3.org/2000/svg")
        .attr("viewBox", "0 0 100 100")
        .attr("width", "100")
        .attr("height", "100");

    if (category === "Urban") {
        // Triángulo más pequeño
        svg.append("polygon")
            .attr("points", "50,20 75,80 25,80") // Coordenadas ajustadas para reducir el tamaño
            .attr("fill", "black");
        
    } else if (category === "Rural") {
        // Cuadrado
        svg.append("rect")
            .attr("x", "20")
            .attr("y", "20")
            .attr("width", "40")
            .attr("height", "40")
            .attr("fill", "black");
    } else if (category === "Cross Reference") {
        // Estrella
        svg.append("polygon")
            .attr("points", "50,15 61,40 87,40 67,60 74,85 50,70 26,85 33,60 13,40 39,40")
            .attr("fill", "black");
    }

    // Convertir SVG a data URL
    return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg.node().outerHTML);
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
    // console.log(newCity);
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


///////////////GRAFICA  RADIAL DE SERIE TEMPORAL.


// Escuchar cambios en los checkboxes de ciudad para la gráfica radial
document.querySelectorAll('#city-checkboxes input[type="radio"]').forEach(checkbox => {
    checkbox.addEventListener('change', updateChart);
});

// Escuchar cambios en los checkboxes 
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

// Asegúrate de que el estado del checkbox se refleje correctamente al cargar la página
document.getElementById('visualizar-todo').checked = true; // Marca el checkbox
document.getElementById('visualizar-todo').dispatchEvent(new Event('change')); // Llama al evento para aplicar los cambios


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
    'PM2_5': '#FF0000', // Rojo fuerte para reflejar peligro
    'PM10': '#FF9900', // Naranja brillante para particulado
    'SO2': '#FFD700', // Amarillo intenso para gases tóxicos
    'NO2': '#d500f1', // Verde neón para contaminación visible
    'CO': '#00CED1', // Turquesa vibrante para gas incoloro
    'O3': '#0000FF', // Azul intenso para ozono
    'TEMP': '#008000', // Rosa fuerte para variación térmica
    'PRES': '#8B0000', // Rojo oscuro para presión atmosférica
    'DEWP': '#4B0082', // Indigo para representar humedad
    'RAIN': '#1E90FF'  // Azul cielo para lluvia
};

function drawRadialChart(data, attributes) {
    d3.select('#chart-view-radial').html("");
    const width = 500;
    const height = 490;
    const radius = Math.min(width, height) / 2 - 40;

    // Crear el SVG y el grupo principal
    const svg = d3.select('#chart-view-radial')
                  .append('svg')
                  .attr('width', width)
                  .attr('height', height);

    const chartGroup = svg.append('g')
                          .attr('transform', `translate(${width / 2}, ${height / 2})`);

    // Escala para los ángulos
    const angleScale = d3.scaleLinear().domain([0, data.length]).range([0, -2 * Math.PI]);

    // Obtener los valores máximos de cada atributo
    const maxValues = attributes.map(attr => d3.max(data, d => d[attr]));
    const centralHoleRadius = 30;
    const ringWidth = (radius - centralHoleRadius) / attributes.length;

    // Definir los colores para las estaciones
    const seasonColors = {
        'Spring': '#2ca25f',
        'Summer': '#d95f0e',
        'Autumn': '#7570b3',
        'Winter': '#1f78b4',
        'YearRound': '#6a3d9a'
    };

    // Función para obtener la estación en base a la fecha
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

        chartGroup.append("circle").attr("cx", 0).attr("cy", 0)
                  .attr("r", radialScale(maxValues[index])).attr("fill", "none")
                  .attr("stroke", "#000").attr("stroke-width", 1)
                  .attr("stroke-dasharray", "3,3");

        const line = d3.lineRadial()
                      .angle((d, j) => angleScale(j))
                      .radius(d => radialScale(d[attr]) || 0);

        // Color para la línea
        const lineColor = attributeColors[attr] || '#000';  // Si no está definido, asigna un color por defecto

        chartGroup.append('path').datum(data)
                  .attr('fill', 'none')
                  .attr('stroke', lineColor)
                  .attr('stroke-width', 1.5)
                  .attr('d', line);

        chartGroup.append('text')
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

            chartGroup.append('path')
                      .attr('d', pathArc)
                      .attr('fill', seasonColor)
                      .attr('opacity', 0.3);
        });
    });

    // // Funcionalidad de zoom
    // const zoom = d3.zoom()
    //               .scaleExtent([0.5, 5])  // Rango de escala permitido
    //               .on('zoom', (event) => {
    //                   chartGroup.attr('transform', event.transform);
    //               });

    // svg.call(zoom);  // Aplica el zoom al SVG

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
            chartGroup.append('text')
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


// GRAFICAS PAR RADIAL PERO QUE SEA POR LA SELECCION DEL UMAPO

function updateRadialChartWithSelection(selectionData, fechaInicio, fechaFin) {
    if (selectionData.length === 0) return;

    const selectedCity = selectionData[0].city; // Nombre de la ciudad seleccionada
    const selectedDates = selectionData.map(d => `${d.year}-${d.month}-${d.day}`); // Fechas seleccionadas

    d3.csv(`data/${selectedCity}`).then(data => {
        // Filtrar los datos por las fechas seleccionadas
        const filteredData = data.filter(d => {
            const dateStr = `${d.year}-${d.month}-${d.day}`;
            return selectedDates.includes(dateStr);
        });

        // Agrupar y calcular promedio por atributo
        const attributes = Array.from(document.querySelectorAll('.options-chek input[type="checkbox"]:checked'))
                                .map(cb => cb.value);

        const aggregatedData = d3.groups(filteredData, d => `${d.year}-${d.month}-${d.day}`).map(([date, entries]) => {
            const avg = {};
            attributes.forEach(attr => {
                const values = entries.map(d => +d[attr.replace('.', '_')]).filter(v => !isNaN(v));
                avg[attr] = values.length > 0 ? d3.mean(values) : 0;
            });
            avg.date = date;
            return avg;
        });

        // Llamar a la nueva función para dibujar la gráfica radial
        drawRadialChart2(aggregatedData, attributes, fechaInicio, fechaFin);
    });
}


function drawRadialChart2(data, attributes, fechaInicio, fechaFin) {
    d3.select('#chart-view-radial').html("");
    const width = 500;
    const height = 490;
    const radius = Math.min(width, height) / 2 - 40;
    const svg = d3.select('#chart-view-radial')
                  .append('svg')
                  .attr('width', width)
                  .attr('height', height)
                  .append('g')
                  .attr('transform', `translate(${width / 2}, ${height / 2})`);

    const centralHoleRadius = 30;
    const ringWidth = (radius - centralHoleRadius) / attributes.length;

    // Tooltip para mostrar información
    const tooltip = d3.select("body").append("div")
                      .style("position", "absolute")
                      .style("background", "#f9f9f9")
                      .style("padding", "10px")
                      .style("border", "1px solid #ccc")
                      .style("border-radius", "5px")
                      .style("box-shadow", "0px 0px 10px rgba(0, 0, 0, 0.1)")
                      .style("display", "none")
                      .style("pointer-events", "none")
                      .style("font-size", "12px");

    const seasonColors = {
        'Spring': '#2ca25f',
        'Summer': '#d95f0e',
        'Autumn': '#7570b3',
        'Winter': '#1f78b4',
        'YearRound': '#6a3d9a'
    };

    const attributeColors = {
        'PM2_5': '#FF0000', // Rojo fuerte para reflejar peligro
        'PM10': '#FF9900', // Naranja brillante para particulado
        'SO2': '#FFD700', // Amarillo intenso para gases tóxicos
        'NO2': '#d500f1', // Verde neón para contaminación visible
        'CO': '#00CED1', // Turquesa vibrante para gas incoloro
        'O3': '#0000FF', // Azul intenso para ozono
        'TEMP': '#008000', // Verde para variación térmica
        'PRES': '#8B0000', // Rojo oscuro para presión atmosférica
        'DEWP': '#4B0082', // Indigo para representar humedad
        'RAIN': '#1E90FF'  // Azul cielo para lluvia
    };

    // Obtener rango completo de fechas
    const dateExtent = d3.extent(data, d => new Date(d.date));
    const fullDateRange = d3.timeDay.range(dateExtent[0], d3.timeDay.offset(dateExtent[1], 1));

    // Escala angular para cubrir todas las fechas
    const angleScale = d3.scaleTime().domain(dateExtent).range([0, -2 * Math.PI]);

    // Dibujar fondo por estaciones
    const generateSeasonRanges = (year) => [
        { season: 'Spring', start: new Date(year, 2, 20), end: new Date(year, 5, 21) },
        { season: 'Summer', start: new Date(year, 5, 21), end: new Date(year, 8, 22) },
        { season: 'Autumn', start: new Date(year, 8, 23), end: new Date(year, 11, 21) },
        { season: 'Winter', start: new Date(year, 11, 21), end: new Date(year + 1, 2, 20) }
    ];

    const allSeasonRanges = [];
    for (let year = dateExtent[0].getFullYear() - 1; year <= dateExtent[1].getFullYear() + 1; year++) {
        allSeasonRanges.push(...generateSeasonRanges(year));
    }

    allSeasonRanges.forEach(({ season, start, end }) => {
        if (start < dateExtent[0]) start = dateExtent[0];
        if (end > dateExtent[1]) end = dateExtent[1];
        if (start >= end) return;

        const startAngle = angleScale(start);
        const endAngle = angleScale(end);

        svg.append('path')
           .attr('d', d3.arc()
               .innerRadius(centralHoleRadius)
               .outerRadius(radius)
               .startAngle(startAngle)
               .endAngle(endAngle))
           .attr('fill', seasonColors[season])
           .attr('opacity', 0.3)
           .attr('class', `season-${season.replace(/\s+/g, '-')}`) // Clase específica para la estación
           .on("click", function(event) {
                const clickedSeason = season;
                const selectedDates = data.filter(d => getSeason(new Date(d.date)) === clickedSeason)
                    .map(d => d.date);
                
                // Verificar si hay fechas seleccionadas
                if (selectedDates.length === 0) {
                    // console.log(`No hay datos para la estación ${clickedSeason}.`);
                    return; // No hacer nada si no hay datos
                }

                // console.log(`Fechas en la estación ${clickedSeason}:`, selectedDates);

                // Limpiar selecciones previas
                svg.selectAll('path').classed('selected', false);

                // Resaltar la selección
                svg.selectAll(`.season-${clickedSeason.replace(/\s+/g, '-')}`).classed('selected', true);

                // Obtener la ciudad seleccionada
                const selectedCity = document.querySelector('#city-checkboxes input[type="radio"]:checked').value;

                // Actualizar la gráfica de series temporales con las fechas seleccionadas
                updateTimeSeriesChart(selectedCity, fechaInicio , fechaFin, selectedDates);
                // console.log(selectedDates)
                updateCorrelationMatrixnew(selectedDates);
                drawThemeRiver(selectedCity, selectedDates); // Riverplot basado en fechas
                // plotUMAP(filteredData, fechaInicio, fechaFin); // UMAP con datos filtrados

                
           });
    });

    // Agregar líneas de corte en el 31 de diciembre de cada año
    const years = d3.timeYear.range(dateExtent[0], d3.timeYear.offset(dateExtent[1], 1));
    years.forEach(year => {
        const dec31 = new Date(year, 11, 31);
        const dec31Angle = angleScale(dec31);

        svg.append('line')
           .attr('x1', Math.sin(dec31Angle) * centralHoleRadius)
           .attr('y1', -Math.cos(dec31Angle) * centralHoleRadius)
           .attr('x2', Math.sin(dec31Angle) * radius)
           .attr('y2', -Math.cos(dec31Angle) * radius)
           .attr('stroke', '#000')
           .attr('stroke-width', 2)
           .attr('stroke-dasharray', '4,4');
    });

    // Obtener valores máximos por atributo
    const maxValues = attributes.map(attr => d3.max(data, d => d[attr]));

    attributes.forEach((attr, index) => {
        const radialScale = d3.scaleLinear().domain([0, maxValues[index]]).range([centralHoleRadius + index * ringWidth, centralHoleRadius + (index + 1) * ringWidth]);

        // Círculos de referencia
        svg.append("circle")
           .attr("cx", 0).attr("cy", 0)
           .attr("r", radialScale(maxValues[index]))
           .attr("fill", "none")
           .attr("stroke", "#000")
           .attr("stroke-width", 1)
           .attr("stroke-dasharray", "3,3");

        // Dibujar datos
        let previousDate = null;
        data.forEach((d, i) => {
            const date = new Date(d.date);
            const angle = angleScale(date);
            const value = d[attr] || 0;
            const radiusValue = radialScale(value);

            const x = Math.sin(angle) * radiusValue;
            const y = -Math.cos(angle) * radiusValue;

            svg.append('circle')
               .attr('cx', x)
               .attr('cy', y)
               .attr('r', 1.5) // Puntos más pequeños
               .attr('fill', attributeColors[attr])
               .on("mouseover", () => {
                   tooltip.style("display", "block")
                          .html(`<strong>Fecha:</strong> ${d3.timeFormat('%d/%m/%Y')(date)}<br><strong>${attr}:</strong> ${value.toFixed(2)}`);
               })
               .on("mousemove", (event) => {
                   tooltip.style("left", (event.pageX + 10) + "px")
                          .style("top", (event.pageY - 20) + "px");
               })
               .on("mouseout", () => {
                   tooltip.style("display", "none");
               });

            // Unir puntos si las fechas son consecutivas
            if (previousDate) {
                const diffDays = (date - previousDate) / (1000 * 60 * 60 * 24);
                if (diffDays === 1) {
                    const prevValue = data[i - 1][attr] || 0;
                    const prevRadius = radialScale(prevValue);
                    const prevAngle = angleScale(previousDate);
                    const prevX = Math.sin(prevAngle) * prevRadius;
                    const prevY = -Math.cos(prevAngle) * prevRadius;

                    svg.append('line')
                       .attr('x1', prevX)
                       .attr('y1', prevY)
                       .attr('x2', x)
                       .attr('y2', y)
                       .attr('stroke', attributeColors[attr])
                       .attr('stroke-width', 1);
                }
            }

            previousDate = date;
        });

        // Etiqueta del atributo
        svg.append('text')
           .attr('x', 0)
           .attr('y', -radialScale(maxValues[index]) - 10)
           .attr('dy', '-0.5em')
           .attr('text-anchor', 'middle')
           .attr('font-size', '14px')
           .attr('font-weight', 'bold')
           .text(attr);
    });

    // Etiquetas de fechas alrededor del gráfico
    fullDateRange.forEach((date, i) => {
        const angle = angleScale(date);
        const x = Math.sin(angle) * (radius + 10);
        const y = -Math.cos(angle) * (radius + 10);

        let label = '';
        if (i % Math.ceil(fullDateRange.length / 10) === 0) {
            label = d3.timeFormat('%b %Y')(date); // Mes y año
        }
        svg.append('text')
           .attr('x', x)
           .attr('y', y)
           .attr('dy', '0.35em')
           .attr('text-anchor', 'middle')
           .attr('font-size', '10px')
           .text(label);
    });

    // // Agregar la funcionalidad de zoom
    // const zoom = d3.zoom()
    //                .scaleExtent([0.5, 5])  // Definir el rango de zoom
    //                .on('zoom', function(event) {
    //                    svg.attr('transform', event.transform);  // Aplicar el zoom
    //                });

    // svg.call(zoom);  // Llamar a la función de zoom
}




function getSeason(date) {
    const month = date.getMonth(); // Get month (0-11)
    const day = date.getDate(); // Get day (1-31)
    
    if ((month === 2 && day >= 20) || (month > 2 && month < 5) || (month === 5 && day <= 21)) {
        return 'Spring';
    } else if ((month === 5 && day >= 21) || (month > 5 && month < 8) || (month === 8 && day <= 22)) {
        return 'Summer';
    } else if ((month === 8 && day >= 23) || (month > 8 && month < 11) || (month === 11 && day <= 21)) {
        return 'Autumn';
    } else {
        return 'Winter';
    }
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

    // Normalizar los datos
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
    const means = {};
    const stdDevs = {};

    // Calcular media y desviación estándar para cada atributo
    selectedAttributes.forEach(attr => {
        const values = data.map(d => +d[attr]); // Convertir a números
        const mean = d3.mean(values);
        const stdDev = Math.sqrt(d3.mean(values.map(v => Math.pow(v - mean, 2)))); // Desviación estándar
        means[attr] = mean;
        stdDevs[attr] = stdDev;
    });

    // Normalizar cada registro
    return data.map(d => {
        const normalizedEntry = {};
        selectedAttributes.forEach(attr => {
            const mean = means[attr];
            const stdDev = stdDevs[attr];
            // Evitar divisiones por cero si la desviación estándar es 0
            normalizedEntry[attr] = stdDev === 0 ? 0 : (+d[attr] - mean) / stdDev;
        });
        return normalizedEntry;
    });
}

// Función para calcular la correlación entre dos atributos en los datos normalizados
function calculateCorrelation(data, attr1, attr2) {
    const n = data.length;

    // Manejar casos con menos de 2 registros
    if (n < 2) return 0;

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

    // Evitar divisiones por cero si los denominadores son 0
    if (denominator1 === 0 || denominator2 === 0) return 0;

    return numerator / Math.sqrt(denominator1 * denominator2);
}

// Función para calcular la matriz de distancias (de acuerdo a la correlación)
function calculateDistanceMatrix(correlationMatrix) {
    const numAttributes = correlationMatrix.length;
    const distanceMatrix = Array.from({ length: numAttributes }, () => Array(numAttributes).fill(0));

    for (let i = 0; i < numAttributes; i++) {
        for (let j = 0; j < numAttributes; j++) {
            // Convertir correlación a distancia usando la fórmula (1 - correlación)
            distanceMatrix[i][j] = Math.sqrt(2 * (1 - correlationMatrix[i][j]));
        }
    }

    return distanceMatrix;
}
function updateCorrelationMatrix() {
    const selectedAttributes = Array.from(document.querySelectorAll('.options-chek-correlation input[type="checkbox"]:checked'))
                                   .map(cb => cb.value);

    if (selectedAttributes.length === 0) return;

    // Obtener las ciudades seleccionadas
    const selectedCities = Array.from(document.querySelectorAll('#city-checkboxes input[type="radio"]:checked'))
                                .map(cb => cb.value);

    // Verificar si "visualizar todo" está marcado
    const visualizarTodo = document.getElementById('visualizar-todo').checked;

    // Obtener el rango de fechas si "visualizar todo" no está seleccionado
    const startDate = document.getElementById('fecha-inicio').value;
    const endDate = document.getElementById('fecha-fin').value;

    selectedCities.forEach(selectedCity => {
        d3.csv(`data/${selectedCity}`).then(data => {
            // Filtrar los datos por fechas si "visualizar todo" no está seleccionado
            if (!visualizarTodo && startDate && endDate) {
                data = data.filter(d => {
                    const date = new Date(`${d.year}-${d.month}-${d.day}`);
                    return date >= new Date(startDate) && date <= new Date(endDate); // Incluir las fechas límite
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
            createRadialDendrogram(hierarchyData, selectedAttributes, matrizdistancia, selectedCity, 
                visualizarTodo ? 'Todos los datos' : `${startDate} a ${endDate}`);
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
        // console.error("Datos de entrada inválidos:", { hierarchyData, selectedAttributes, distanceMatrix, selectedCity, dateRange });
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
            // console.log(`Ciudad: ${selectedCity}`);
            // console.log(`Contaminante: ${contaminant}`);
            // console.log(`Rango de fechas: ${startDate} a ${endDate}`);
            // updateTimeSeriesChart(selectedCity, startDate, endDate);
            
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


function updateTimeSeriesChart(selectedCity, startDate, endDate, selectedDates = null) {
    const container = d3.select('#serie-temporal');
    const margin = { top: 20, right: 10, bottom: 60, left: 50 };
    const width = 830 - margin.left - margin.right;
    const height = 360 - margin.top - margin.bottom;
    // console.log(startDate, endDate,);
    // Añadir y configurar el checkbox AQI
    let aqiCheckboxContainer = container.select('#aqi-checkbox-container');
    if (aqiCheckboxContainer.empty()) {
        aqiCheckboxContainer = container.append('div')
            .attr('id', 'aqi-checkbox-container')
            .style('position', 'absolute')
            .style('right', '2%')
            .style('bottom', '87%')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('gap', '5px')
            .style('background-color', 'rgba(255, 255, 255, 0.8)')
            .style('padding', '5px')
            .style('border-radius', '4px');
        
        aqiCheckboxContainer.append('input')
            .attr('type', 'checkbox')
            .attr('id', 'aqi-size-toggle')
            .style('cursor', 'pointer');
        
        aqiCheckboxContainer.append('label')
            .attr('for', 'aqi-size-toggle')
            .text('AQI')
            .style('font-weight', 'bold')
            .style('cursor', 'pointer')
            .style('user-select', 'none');
    }

    const aqiCheckbox = document.querySelector('#aqi-size-toggle');
    const savedAqiState = localStorage.getItem('aqiCheckboxState');
    aqiCheckbox.checked = savedAqiState === 'true'; // Restaurar el estado

    aqiCheckbox.addEventListener('change', function () {
        localStorage.setItem('aqiCheckboxState', aqiCheckbox.checked); // Guardar el estado
        d3.select('#serie-temporal')
            .selectAll('circle')
            .transition()
            .duration(200)
            .attr('r', aqiCheckbox.checked ? 4 : 0);
    });

    // Añadir y configurar el checkbox Line
    let lineCheckboxContainer = container.select('#line-checkbox-container');
    if (lineCheckboxContainer.empty()) {
        lineCheckboxContainer = container.append('div')
            .attr('id', 'line-checkbox-container')
            .style('position', 'absolute')
            .style('right', '1.35%')
            .style('bottom', '80%')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('gap', '5px')
            .style('background-color', 'rgba(255, 255, 255, 0.8)')
            .style('padding', '5px')
            .style('border-radius', '4px');
        
        lineCheckboxContainer.append('input')
            .attr('type', 'checkbox')
            .attr('id', 'line-size-toggle')
            .style('cursor', 'pointer');
        
        lineCheckboxContainer.append('label')
            .attr('for', 'line-size-toggle')
            .text('Line')
            .style('font-weight', 'bold')
            .style('cursor', 'pointer')
            .style('user-select', 'none');
    }

    const lineCheckbox = document.querySelector('#line-size-toggle');
    const savedLineState = localStorage.getItem('lineCheckboxState');
    lineCheckbox.checked = savedLineState === 'true'; // Restaurar el estado

    lineCheckbox.addEventListener('change', function () {
        localStorage.setItem('lineCheckboxState', lineCheckbox.checked); // Guardar el estado
    
        // Actualizar opacidades de las líneas según el estado del checkbox
        d3.select('#serie-temporal')
            .selectAll('path.line')
            .transition()
            .duration(200)
            .style('opacity', function () {
                const pathElement = d3.select(this);
                const isSelected = pathElement.classed('selected');
                return lineCheckbox.checked ? (isSelected ? 1 : 0.1) : 0;
            });
    });
    
    

    const contaminantAttributes = ['PM2_5', 'PM10', 'SO2', 'NO2', 'CO', 'O3'];
    const meteorologicalAttributes = ['TEMP', 'PRES', 'DEWP', 'RAIN'];
    const dailyLimits = {
        'PM2_5': 150,
        'PM10': 150,
        'CO': 4, // Convertido a µg/m³ (4 mg/m³ * 1000)
        'SO2': 150,
        'NO2': 80,
        'O3': 200
    };

    const aqiRanges = [[0, 50], [50, 100], [100, 150], [150, 200], [200, 300], [300, 400], [400, 500]];
    const aqiColors = ['#00e400', '#ff0', '#ff7e00', '#f00', '#99004c', '#7e0023'];
    const meteorologicalColor = 'blue';

    // Define los colores de las estaciones
    const seasonColors = {
        'Spring': '#2ecc71',
        'Summer': '#e67e22',
        'Autumn': '#9b59b6',
        'Winter': '#3498db'
    };

    // Función para determinar la estación
    function getSeason(month, day) {
        if ((month === 3 && day >= 20) || month === 4 || month === 5 || (month === 6 && day <= 20)) {
            return 'Spring';
        } else if ((month === 6 && day >= 21) || month === 7 || month === 8 || (month === 9 && day <= 22)) {
            return 'Summer';
        } else if ((month === 9 && day >= 23) || month === 10 || month === 11 || (month === 12 && day <= 20)) {
            return 'Autumn';
        } else {
            return 'Winter';
        }
    }

    
    function normalizeValue(value, min, max) {
        if (min === max) return 0.5; // Evitar divisiones por cero
        return (value - min) / (max - min);
    }

    function getAQIColor(value, attribute) {
        if (attribute === 'CO') {
            // Convertir CO de mg/m³ a µg/m³ antes de calcular el AQI
            value /= 1000; // Conversión de mg/m³ a µg/m³
        }
        if (dailyLimits[attribute] && !isNaN(value)) {
            const limit = dailyLimits[attribute];
            const aqiIndex = aqiRanges.findIndex(range => value <= (limit * range[1]) / 100);
            return aqiIndex >= 0 ? aqiColors[aqiIndex] : '#7e0023'; // Negro si está fuera de rango
        }
        return meteorologicalColor; // Usar color azul para atributos meteorológicos
    }

    d3.csv(`data/${selectedCity}`).then(data => {
        const attributes = [...contaminantAttributes, ...meteorologicalAttributes];

        let selectedAttributes = JSON.parse(localStorage.getItem('selectedAttributes')) || ["PM2_5"];

        const attributeColors = {
            'PM2_5': '#FF0000', 
            'PM10': '#FF9900', 
            'SO2': '#FFD700', 
            'NO2': '#d500f1', 
            'CO': '#00CED1', 
            'O3': '#0000FF', 
            'TEMP': '#008000', 
            'PRES': '#8B0000', 
            'DEWP': '#4B0082', 
            'RAIN': '#1E90FF'  
        };
        // Paso 1: Procesar los datos y calcular promedio de WSPM por día
        const parsedData = d3.group(
            data,
            d => d3.timeFormat("%Y-%m-%d")(new Date(d.year, d.month - 1, d.day)) // Agrupar por día
        );

        const dailyData = Array.from(parsedData, ([date, values]) => {
            const WSPMValues = values.map(v => +v.WSPM).filter(v => !isNaN(v)); // Obtener valores numéricos de WSPM

            // Calcular el promedio de WSPM para el día
            const averageWSPM = WSPMValues.length > 0
                ? WSPMValues.reduce((acc, val) => acc + val, 0) / WSPMValues.length
                : null;

            return {
                date: new Date(date),
                WSPMValues, // Todos los valores de WSPM del día
                averageWSPM, // Promedio de WSPM del día
            };
        });

        // console.log("Datos de velocidad del viento por día con promedio:", dailyData);

        let checkboxContainer = container.select('#checkbox-container');
        if (checkboxContainer.empty()) {
            checkboxContainer = container.append('div')
                .attr('id', 'checkbox-container')
                .style('display', 'flex')
                .style('gap', '10px')
                .style('flex-wrap', 'wrap')
                .style('font-weight', 'bold') 
                .style('margin', '30px 0 10px 50px');
        } else {
            checkboxContainer.selectAll('*').remove();
        }
        
        checkboxContainer.selectAll('div')
            .data(attributes)
            .join('div')
            .style('display', 'flex')
            .style('align-items', 'center')  
            .style('gap', '5px') 
            .each(function (attribute) {
                const div = d3.select(this);
                div.append('input')
                    .attr('type', 'checkbox')
                    .attr('value', attribute)
                    .property('checked', selectedAttributes.includes(attribute))  
                    .on('change', function () {
                        selectedAttributes = d3.selectAll('#checkbox-container input:checked')
                            .nodes()
                            .map(node => node.value);
        
                        // Guarda el estado en el localStorage
                        localStorage.setItem('selectedAttributes', JSON.stringify(selectedAttributes));
        
                        // Llama a drawChart para actualizar el gráfico
                        drawChart(selectedAttributes, data, startDate, endDate, selectedDates, dailyData);
                    });
        
                div.append('label')
                    .text(attribute)
                    .style('cursor', 'pointer')
                    .style('color', attributeColors[attribute])  
                    .style('margin', '0')  
                    .style('vertical-align', 'middle'); 
            });
            drawChart(selectedAttributes, data, startDate, endDate, selectedDates, dailyData);
    });

    
    function drawChart(selectedAttributes, data, startDate, endDate, selectedDates,dailyData) {
        const containerId = 'chart-container';
        let chartContainer = container.select(`#${containerId}`);
        
        if (chartContainer.empty()) {
            chartContainer = container.append('div')
                .attr('id', containerId)
                .style('margin-bottom', '30px');
        }
        // Filtrar datos si startDate y endDate están definidos
        let filteredData = data.map(d => ({
            date: new Date(`${d.year}-${d.month}-${d.day}`),
            value: selectedAttributes.reduce((acc, attribute) => {
                acc[attribute] = +d[attribute.replace('.', '_')];
                return acc;
            }, {})
        }))
    
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            filteredData = filteredData.filter(d => d.date >= start && d.date <= end);
        }

        const selectedDateSet = selectedDates 
            ? new Set(selectedDates.map(d => new Date(d).toISOString().split('T')[0])) 
            : null;

        const averagedData = d3.groups(filteredData, d => d.date)
            .map(([date, values]) => ({
                date: date,
                value: selectedAttributes.reduce((acc, attribute) => {
                    acc[attribute] = d3.mean(values, v => v.value[attribute]);
                    return acc;
                }, {}),
                isSelected: selectedDateSet ? selectedDateSet.has(date.toISOString().split('T')[0]) : true
            }));
    
        const minValues = {};
        const maxValues = {};
        selectedAttributes.forEach(attribute => {
            const values = averagedData.map(d => d.value[attribute]).filter(v => !isNaN(v));
            minValues[attribute] = d3.min(values);
            maxValues[attribute] = d3.max(values);
        });
    
        const normalizedData = averagedData.map(d => {
            const normalizedValues = { ...d.value };
            selectedAttributes.forEach(attribute => {
                if (meteorologicalAttributes.includes(attribute) || contaminantAttributes.includes(attribute)) {
                    normalizedValues[attribute] = normalizeValue(
                        d.value[attribute],
                        minValues[attribute],
                        maxValues[attribute]
                    );
                }
            });
            return { ...d, normalizedValues };
        });
    
        const svg = chartContainer.select('svg');
        if (!svg.empty()) svg.remove();
    
        const chartSvg = chartContainer.append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left}, ${margin.top})`);
    
        const xScale = d3.scaleTime()
            .domain(d3.extent(normalizedData, d => d.date))
            .range([0, width]);
    
        const yExtent = d3.extent(
            normalizedData.flatMap(d => selectedAttributes.map(attr => d.normalizedValues[attr]))
        );
        const yScale = d3.scaleLinear()
            .domain([Math.min(0, yExtent[0]), Math.max(1, yExtent[1])])
            .range([height, 0]);
    
        const xAxis = d3.axisBottom(xScale).tickFormat(d3.timeFormat("%d-%m-%Y"));
        const yAxis = d3.axisLeft(yScale);
    
        chartSvg.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0, ${height})`)
            .call(xAxis)
            .selectAll("text")
            .style("text-anchor", "middle")
            .style('font-size', '10px')
            .attr("dx", "-34px")
            .attr("dy", "0px")
            .attr("transform", "rotate(-30)");
    
        chartSvg.append('g')
            .attr('class', 'y-axis')
            .call(yAxis)
            .style('font-size', '10px');
    
        // Agregar los rectángulos de fondo para las estaciones
        normalizedData.forEach(d => {
            const month = d.date.getMonth() + 1;
            const day = d.date.getDate();
            const season = getSeason(month, day);
    
            chartSvg.append('rect')
                .attr('x', xScale(d.date))
                .attr('y', 0)
                .attr('width', xScale(new Date(d.date.getTime() + 86400000)) - xScale(d.date))
                .attr('height', height)
                .attr('fill', seasonColors[season])
                .attr('opacity', 0.15);
        });
    
        const lineCheckbox = document.querySelector('#line-size-toggle');
    
        if (lineCheckbox && lineCheckbox.checked) {
            selectedAttributes.forEach(attribute => {
                const lineData = normalizedData.filter(d => !isNaN(d.normalizedValues[attribute]));
                
                // Crear datos separados para las líneas seleccionadas y no seleccionadas
                const selectedLineData = lineData.filter(d => d.isSelected).map(d => ({
                    x: xScale(d.date),
                    y: yScale(d.normalizedValues[attribute]),
                    date: d.date
                }));
        
                const unselectedLineData = lineData.filter(d => !d.isSelected).map(d => ({
                    x: xScale(d.date),
                    y: yScale(d.normalizedValues[attribute]),
                    date: d.date
                }));
        
                // Umbral de continuidad (por ejemplo, 1 día)
                const continuityThreshold = 1 * 24 * 60 * 60 * 1000; // 1 día en milisegundos
        
                // Función para dividir en segmentos continuos
                const divideIntoSegments = data => {
                    const segments = [];
                    let currentSegment = [];
        
                    for (let i = 0; i < data.length; i++) {
                        if (currentSegment.length === 0) {
                            currentSegment.push(data[i]);
                        } else {
                            const lastPoint = currentSegment[currentSegment.length - 1];
                            const currentPoint = data[i];
                            if (currentPoint.date - lastPoint.date <= continuityThreshold) {
                                currentSegment.push(currentPoint);
                            } else {
                                segments.push(currentSegment);
                                currentSegment = [currentPoint];
                            }
                        }
                    }
                    if (currentSegment.length > 0) {
                        segments.push(currentSegment);
                    }
                    return segments;
                };
        
                // Dividir datos seleccionados y no seleccionados en segmentos
                const selectedSegments = divideIntoSegments(selectedLineData);
                const unselectedSegments = divideIntoSegments(unselectedLineData);
        
                // Dibujar las líneas para los segmentos seleccionados
                selectedSegments.forEach(segment => {
                    if (segment.length > 1) { // Asegúrate de que haya suficientes puntos para una línea
                        drawLine(chartSvg, segment, attribute, attributeColors[attribute], 1); // Opacidad completa
                    }
                });
        
                // Dibujar las líneas para los segmentos no seleccionados con menor opacidad
                unselectedSegments.forEach(segment => {
                    if (segment.length > 1) {
                        drawLine(chartSvg, segment, attribute, attributeColors[attribute], 0.3); // Opacidad 0.3
                    }
                });
            });
        }
        
        

        const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("background-color", "white")
        .style("border", "1px solid #ccc")
        .style("padding", "8px")
        .style("border-radius", "4px")
        .style("box-shadow", "0px 2px 10px rgba(0, 0, 0, 0.2)")
        .style("pointer-events", "none")
        .style("opacity", 0);
        
        // Brush setup
        const brush = d3.brushX()
            .extent([[0, 0], [width, height]])
            .on("end", brushended);

        chartSvg.append("g")
            .attr("class", "brush")
            .call(brush);

        function brushended(event) {
            if (!event.selection) return; // Si no se ha seleccionado nada, no hacer nada

            const [x0, x1] = event.selection;
            const newDomain = [xScale.invert(x0), xScale.invert(x1)];

            // Actualizar las escalas y el gráfico
            xScale.domain(newDomain);

            // Llamar nuevamente a drawChart con los datos filtrados según el área seleccionada
            drawChart(selectedAttributes, data, newDomain[0], newDomain[1], selectedDates, dailyData);
        }

        // Reset the chart on double-click
        chartSvg.on("dblclick", function() {
            xScale.domain(d3.extent(normalizedData, d => d.date)); // Restablecer dominio de la escala X
            drawChart(selectedAttributes, data, null, null, selectedDates, dailyData); // Volver a cargar los datos completos
        });
        // Dibujar los puntos
        selectedAttributes.forEach(attribute => {
            const lineData = normalizedData.filter(d => !isNaN(d.normalizedValues[attribute]));
    
            chartSvg.selectAll(`circle.${attribute}`)
                .data(lineData)
                .join('circle')
                .attr('class', attribute)
                .attr('cx', d => xScale(d.date))
                .attr('cy', d => yScale(d.normalizedValues[attribute]))
                .attr('r', () => {
                    const aqiCheckbox = document.querySelector('#aqi-size-toggle');
                    return aqiCheckbox && aqiCheckbox.checked ? 4 : 0;
                })
                .attr('fill', d => getAQIColor(d.value[attribute], attribute))
                .attr('stroke-width', 1.5)
                .attr('opacity', d => d.isSelected ? 1 : 0.08)
                .on('mouseover', function(event, d) {
                    const [mouseX, mouseY] = d3.pointer(event);
                    const point = d3.select(this);
                    
                    // Sumar un día a la fecha
                    const modifiedDate = d3.timeDay.offset(d.date, -1);
                    const pointDate = d3.timeFormat("%Y-%m-%d")(modifiedDate);
                    
                    // Filtrar los registros de dailyData para la fecha modificada
                    const matchingRecords = dailyData.filter(record => d3.timeFormat("%Y-%m-%d")(record.date) === pointDate);
                    
                    // Calcular el promedio de WSPMValues
                    const windSpeed = matchingRecords.length > 0 
                        ? (matchingRecords.reduce((sum, record) => {
                            // Sumar todos los valores en WSPMValues
                            const totalWSPM = record.WSPMValues.reduce((acc, value) => acc + value, 0);
                            // Calcular el promedio
                            return sum + (totalWSPM / record.WSPMValues.length);
                        }, 0) / matchingRecords.length).toFixed(2)
                        : 'No disponible';
                    
                    // Transición para agrandar el punto seleccionado
                    point.transition()
                        .duration(200)
                        .attr('r', 10)
                        .style('stroke', 'cyan')
                        .style('stroke-width', 3);
                    
                    // Actualiza el contenido del tooltip
                    tooltip.transition()
                        .duration(200)
                        .style('opacity', 1);
                    
                    const selectedCity = document.querySelector('#city-checkboxes input[type="radio"]:checked').value;
                    tooltip.html(`
                        <strong>Ciudad:</strong> ${selectedCity.replace('Data_', '').replace('.csv', '')}<br>
                        <strong>Contaminante:</strong> ${attribute}<br>
                        <strong>Fecha:</strong> ${d3.timeFormat("%d/%m/%Y")(d.date)}<br>
                        <strong>Concentración:</strong> ${d.value[attribute]?.toFixed(2)}<br>
                        <strong>Velocidad del viento:</strong> ${windSpeed} m/s<br>
                    `);
                
                    // Obtener dimensiones del tooltip
                    const tooltipNode = tooltip.node();
                    const tooltipWidth = tooltipNode.offsetWidth;
                    const tooltipHeight = tooltipNode.offsetHeight;
                
                    // Calcular posición limitada dentro de los márgenes de la gráfica
                    let tooltipX = event.pageX;
                    let tooltipY = event.pageY;
                
                    // Limitar X dentro del área visible
                    if (tooltipX + tooltipWidth > width + margin.left) {
                        tooltipX = tooltipX - tooltipWidth - 10; // 10px de offset
                    }
                
                    // Limitar Y dentro del área visible
                    if (tooltipY + tooltipHeight > height + margin.top) {
                        tooltipY = tooltipY - tooltipHeight - 10; // 10px de offset
                    }
                
                    // Asegurar que no se salga por la izquierda o arriba
                    tooltipX = Math.max(margin.left, tooltipX);
                    tooltipY = Math.max(margin.top, tooltipY);
                
                    // Aplicar la posición calculada
                    tooltip.style('left', `${tooltipX}px`)
                        .style('top', `${tooltipY}px`)
                        .style('color', 'black');
                })
                
                .on('mouseout', function() {
                    const point = d3.select(this);
                    point.transition()
                        .duration(200)
                        .attr('r', 4)
                        .style('stroke', 'none')
                        .style('stroke-width', 0);
                
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
                
                    // Título de la ventana emergente
                    floatingWindow.append('div')
                        .style('text-align', 'center')
                        .style('font-size', '14px')
                        .style('font-weight', 'bold')
                        .style('margin-bottom', '10px')
                        .text(`Serie temporal por hora de la fecha ${d3.timeFormat("%d-%m-%Y")(d.date)} `);
                
                    // Colores definidos para cada atributo
                    const attributeColors = {
                        'PM2_5': '#FF0000', // Rojo fuerte para reflejar peligro
                        'PM10': '#FF9900', // Naranja brillante para particulado
                        'SO2': '#FFD700', // Amarillo intenso para gases tóxicos
                        'NO2': '#d500f1', // Verde neón para contaminación visible
                        'CO': '#00CED1', // Turquesa vibrante para gas incoloro
                        'O3': '#0000FF', // Azul intenso para ozono
                        'TEMP': '#008000', // Rosa fuerte para variación térmica
                        'PRES': '#8B0000', // Rojo oscuro para presión atmosférica
                        'DEWP': '#4B0082', // Indigo para representar humedad
                        'RAIN': '#1E90FF'  // Azul cielo para lluvia
                    };

                
                    const units = {
                        'PM2_5': 'µg/m³',
                        'PM10': 'µg/m³',
                        'SO2': 'µg/m³',
                        'NO2': 'µg/m³',
                        'CO': 'mg/m³',
                        'O3': 'µg/m³',
                        'TEMP': '°C',
                        'PRES': 'hPa',
                        'DEWP': '°C',
                        'RAIN': 'mm'
                    };
                
                    // Crear checkboxes
                    const checkboxContainer = floatingWindow.append('div')
                        .style('display', 'flex')
                        .style('flex-direction', 'column');
                
                    const contaminants = ['PM2_5', 'PM10', 'SO2', 'NO2', 'CO', 'O3'];
                    const meteorologicalFactors = ['TEMP', 'PRES', 'DEWP', 'RAIN'];
                
                    const contaminantChecks = checkboxContainer.append('div')
                        .style('display', 'flex')
                        .style('font-size', '12px');
                
                    contaminants.forEach(contaminant => {
                        // Cambiar la condición para que el checkbox esté marcado si es el contaminante actual
                        const isChecked = contaminant === attribute; // Usar 'attribute' en lugar de 'currentContaminant'
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
                
                    const meteorologicalChecks = checkboxContainer.append('div')
                        .style('display', 'flex')
                        .style('font-size', '12px');
                
                    meteorologicalFactors.forEach(factor => {
                        // Similar para factores meteorológicos
                        const isCheckedmet = factor === attribute;
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
                        const selectedContaminants = Array.from(floatingWindow.selectAll('input[type="checkbox"]:checked'))
                            .map(input => input.value);
                
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
            
                        // Normalización para visualización (sin alterar los valores reales)
                        const normalizedData = selectedDayData.map(d => {
                            const normalized = { hour: d.hour };
                            selectedContaminants.forEach(contaminant => {
                                const values = selectedDayData.map(row => row[contaminant]).filter(v => !isNaN(v));
                                const minValue = d3.min(values);
                                const maxValue = d3.max(values);
                                normalized[contaminant] = isNaN(d[contaminant])
                                    ? NaN
                                    : (d[contaminant] - minValue) / (maxValue - minValue);
                            });
                            return normalized;
                        });
            
                        floatingWindow.select('svg').remove();
            
                        const miniMargin = { top: 20, right: 20, bottom: 40, left: 50 };
                        const miniWidth = 400 - miniMargin.left - miniMargin.right;
                        const miniHeight = 200 - miniMargin.top - miniMargin.bottom;
            
                        const miniSvg = floatingWindow.append('svg')
                            .attr('width', miniWidth + miniMargin.left + miniMargin.right)
                            .attr('height', miniHeight + miniMargin.top + miniMargin.bottom)
                            .append('g')
                            .attr('transform', `translate(${miniMargin.left}, ${miniMargin.top})`);
            
                        const xMiniScale = d3.scaleLinear()
                            .domain([0, 23])
                            .range([0, miniWidth]);
            
                        const xMiniAxis = d3.axisBottom(xMiniScale).ticks(8).tickValues(d3.range(0, 24, 3)).tickFormat(d => `${d}:00`);
                        const yMiniScale = d3.scaleLinear().domain([0, 1]).range([miniHeight, 0]);
            
                        miniSvg.append('g')
                            .attr('transform', `translate(0, ${miniHeight})`)
                            .call(xMiniAxis)
                            .selectAll('text')
                            .style('text-anchor', 'end')
                            .attr('dx', '-0.5em')
                            .attr('dy', '-0.2em')
                            .attr('transform', 'rotate(-45)');
            
                        miniSvg.append('g').call(d3.axisLeft(yMiniScale));
            
                        selectedContaminants.forEach(contaminant => {
                            const line = d3.line()
                            .defined(d => !isNaN(d[contaminant]))
                            .x(d => xMiniScale(d.hour))
                            .y(d => yMiniScale(d[contaminant]))
                            .curve(d3.curveMonotoneX); 
                        
            
                            miniSvg.append('path')
                                .datum(normalizedData)
                                .attr('fill', 'none')
                                .attr('stroke', attributeColors[contaminant])
                                .attr('stroke-width', 1.5)
                                .attr('d', line);
            
                            // Puntos en cada hora
                            miniSvg.selectAll(`.point-${contaminant}`)
                                .data(selectedDayData)
                                .enter()
                                .append('circle')
                                .attr('class', `point-${contaminant}`)
                                .attr('cx', d => xMiniScale(d.hour))
                                .attr('cy', (d, i) => yMiniScale(normalizedData[i][contaminant]))
                                .attr('r', 3)
                                .attr('fill', attributeColors[contaminant]);
                        });
            
                        // Línea vertical y valores dinámicos
                        const verticalLine = miniSvg.append('line')
                            .attr('y1', 0)
                            .attr('y2', miniHeight)
                            .attr('stroke', '#000')
                            .attr('stroke-dasharray', '4 2')
                            .attr('visibility', 'hidden');
            
                            const tooltip = floatingWindow.append('div')
                            .attr('id', 'tooltip')
                            .style('position', 'absolute')
                            .style('background', '#fff')
                            .style('border', '1px solid #ccc')
                            .style('padding', '5px')
                            .style('border-radius', '4px')
                            .style('box-shadow', '0px 4px 8px rgba(0, 0, 0, 0.1)')
                            .style('font-size', '10px') // Tamaño reducido de fuente
                            .style('line-height', '1.2')
                            .style('visibility', 'hidden');
                        
                        miniSvg.append('rect')
                            .attr('width', miniWidth)
                            .attr('height', miniHeight)
                            .attr('fill', 'none')
                            .attr('pointer-events', 'all')
                            .on('mousemove', function(event) {
                                const [mouseX, mouseY] = d3.pointer(event, this); // Obtener posición del mouse
                                const hour = Math.round(xMiniScale.invert(mouseX)); // Hora más cercana
                                const xPosition = xMiniScale(hour); // Posición exacta de la línea en el eje X
                            
                                // Actualizar posición de la línea vertical
                                verticalLine.attr('x1', xPosition).attr('x2', xPosition).attr('visibility', 'visible');
                            

                                const modifiedDate2 = d3.timeDay.offset(d.date, -1);


                                // Filtrar los datos de `dailyData` para encontrar la fecha seleccionada
                                const selectedDate = d3.timeFormat("%Y-%m-%d")(modifiedDate2); // Formato de la fecha actual
                                const matchingRecord = dailyData.find(record => {
                                    const recordDate = d3.timeFormat("%Y-%m-%d")(record.date); // Formatear la fecha del registro
                                    return recordDate === selectedDate;
                                });
                            
                                // Extraer la velocidad del viento para la hora actual
                                let windSpeed = 'No disponible';
                                if (matchingRecord && matchingRecord.WSPMValues && matchingRecord.WSPMValues.length === 24) {
                                    windSpeed = `${matchingRecord.WSPMValues[hour]?.toFixed(2)} m/s`; // Velocidad específica de la hora
                                }
                            
                                // Obtener datos de contaminantes para la hora seleccionada en `selectedDayData`
                                const hourData = selectedDayData.find(d => d.hour === hour);
                            
                                if (hourData) {
                                    tooltip.style('visibility', 'visible')
                                        .style('left', `${xPosition + miniMargin.left}px`) // Ajustar al eje X del gráfico
                                        .style('top', `${yMiniScale(1) + miniMargin.top + 65}px`) // Justo encima del gráfico
                                        .html(
                                            selectedContaminants
                                                .map(contaminant =>
                                                    `${contaminant}: ${hourData[contaminant]} ${units[contaminant]}`
                                                )
                                                .join('<br>') +
                                            `<br>Vel. del viento: ${windSpeed}` // Mostrar la velocidad del viento
                                        );
                                } else {
                                    tooltip.style('visibility', 'hidden');
                                }
                            })
                            .on('mouseout', () => {
                                verticalLine.attr('visibility', 'hidden');
                                tooltip.style('visibility', 'hidden');
                            });
                            
                            
                        
                    });
                }
            
                updateChart();
            })
        });
    }
    
    
    
}

function drawLine(chartSvg, points, attribute, color, opacity = 1, isSelected = false) {
    const lineGenerator = d3.line()
        .x(d => d.x)
        .y(d => d.y)
        .curve(d3.curveMonotoneX);

    chartSvg.append('path')
        .data([points])
        .attr('class', `line ${attribute} ${isSelected ? 'selected' : 'not-selected'}`)
        .attr('d', lineGenerator(points))
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 2)
        .attr('opacity', opacity)
        .on('mouseover', function () {
            d3.select(this)
                .attr('stroke-width', 4);
        })
        .on('mouseout', function () {
            d3.select(this)
                .attr('stroke-width', 2);
        });
}


// Variable global para almacenar el contaminante seleccionado actualmente
let currentContaminant = null;
// Manejar cambios en los radio buttons
document.querySelectorAll('#city-checkboxes input[type="radio"]').forEach(radio => {
    radio.addEventListener('change', handleCityOrCheckboxChange);
});

// Manejar cambios en el checkbox
document.getElementById('visualizar-todo').addEventListener('change', handleCityOrCheckboxChange);

async function handleCityOrCheckboxChange() {
    // Ciudad seleccionada
    const selectedCity = document.querySelector('#city-checkboxes input[type="radio"]:checked')?.value || null;

    // Verificar si el checkbox 'visualizar-todo' está marcado
    const isChecked = document.getElementById('visualizar-todo').checked;

    let dateList = [];
    if (isChecked) {
        // Generar fechas desde el 1 de marzo de 2013 hasta el 28 de febrero de 2017
        const start = new Date(2013, 2, 1); // Marzo es el mes 2 (0 indexado)
        const end = new Date(2017, 1, 28); // Febrero es el mes 1 (0 indexado)
        for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
            dateList.push(new Date(date).toISOString().split('T')[0]); // Formatear fecha en formato YYYY-MM-DD
        }
    } else {
        // Usar las fechas seleccionadas en los inputs
        const startDate = document.getElementById('fecha-inicio').value;
        const endDate = document.getElementById('fecha-fin').value;

        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
                dateList.push(new Date(date).toISOString().split('T')[0]); // Formatear fecha en formato YYYY-MM-DD
            }
        } else {
            console.warn("Por favor selecciona un rango de fechas válido.");
        }
    }

    // Llamar a la función drawThemeRiver con la ciudad seleccionada y las fechas generadas
    try {
        await drawThemeRiver(selectedCity, dateList);
    } catch (error) {
        console.error("Error al ejecutar drawThemeRiver:", error);
    }

    // Establecer un contaminante por defecto (por ejemplo, PM2.5)
    currentContaminant = currentContaminant || 'PM2_5';

    // Actualizar las gráficas
    updateChart();
    updateCorrelationMatrix();
    // updateUMAP();
    updateTimeSeriesChart(selectedCity, isChecked ? null : document.getElementById('fecha-inicio').value, isChecked ? null : document.getElementById('fecha-fin').value);

}
// Escuchar cambios en el rango de fechas
document.getElementById('fecha-inicio').addEventListener('change', handleDateChange);
document.getElementById('fecha-fin').addEventListener('change', handleDateChange);

async function handleDateChange() {
    const selectedCity = document.querySelector('#city-checkboxes input[type="radio"]:checked')?.value || null;
    const startDate = document.getElementById('fecha-inicio').value;
    const endDate = document.getElementById('fecha-fin').value;

    if (!startDate || !endDate) {
        console.warn("Por favor selecciona un rango de fechas válido.");
        return;
    }

    // Generar el rango de fechas
    const dateList = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        dateList.push(new Date(date).toISOString().split('T')[0]); // Formatear fecha en formato YYYY-MM-DD
    }

    // Llamar a drawThemeRiver
    try {
        await drawThemeRiver(selectedCity, dateList);
    } catch (error) {
        console.error("Error al ejecutar drawThemeRiver:", error);
    }

    // Actualizar las gráficas
    updateChart();
    if (currentContaminant) {
        updateTimeSeriesChart(selectedCity, startDate, endDate);
    }

}


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
        updateTimeSeriesChart(selectedCity, startDate, endDate);
    }
    
    document.getElementById('fecha-rango').innerText = isChecked ? "Visualizando todos los datos." : "";
            updateTimeSeriesChart(selectedCity, startDate, endDate);
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
    const response = await fetch(`UMAP_AQI_NEW/${selectedCity}`);
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
    plotUMAP(filteredData, fechaInicio, fechaFin);
    
}

function plotUMAP(data, fechaInicio, fechaFin) {
    // Limpiar el gráfico anterior
    d3.select("#umap-plot").selectAll("*").remove();
    // console.log("Fechas de entrada:", fechaInicio, fechaFin);

    // Función para actualizar la opacidad de los filtros
    function updateFilterOpacity(activeFilterId) {
        const filters = ["station-filter", "year-filter", "month-filter"];
        filters.forEach((filterId) => {
            const filterElement = document.getElementById(filterId);
            if (filterId === activeFilterId) {
                filterElement.classList.remove("dimmed");
            } else {
                filterElement.classList.add("dimmed");
            }
        });
    }

        // Evento para la estación del año
    document.getElementById('station-filter').addEventListener('change', (event) => {
        const selectedSeason = event.target.value;
        const filteredData = filterDataBySeason(selectedSeason, data);
        const selectedDates = filteredData.map(d => `${d.year}-${d.month}-${d.day}`);
        highlightSeason(selectedSeason, data, svg, xScale, yScale);

        handleSelectionUpdate(filteredData, selectedDates, fechaInicio, fechaFin);

        // Ajustar la opacidad de los puntos
        svg.selectAll('circle')
            .attr('opacity', d => filteredData.includes(d) ? 1 : 0.3); // Establece opacidad a 0.3 para los puntos no seleccionados
        
        updateFilterOpacity('station-filter');
    });

    // Evento para el año
    document.getElementById('year-filter').addEventListener('change', (event) => {
        const selectedYear = parseInt(event.target.value, 10);
        const filteredData = data.filter(d => d.year === selectedYear);
        const selectedDates = filteredData.map(d => `${d.year}-${d.month}-${d.day}`);
        highlightYear(selectedYear, data, svg, xScale, yScale);

        handleSelectionUpdate(filteredData, selectedDates, fechaInicio, fechaFin);

        // Ajustar la opacidad de los puntos
        svg.selectAll('circle')
            .attr('opacity', d => filteredData.includes(d) ? 1 : 0.3); // Establece opacidad a 0.3 para los puntos no seleccionados

        updateFilterOpacity('year-filter');
    });

    // Evento para el mes
    document.getElementById('month-filter').addEventListener('change', (event) => {
        const selectedMonth = event.target.value;
        const filteredData = filterDataByMonth(selectedMonth, data);
        const selectedDates = filteredData.map(d => `${d.year}-${d.month}-${d.day}`);
        highlightMonth(selectedMonth, data, svg, xScale, yScale);

        handleSelectionUpdate(filteredData, selectedDates, fechaInicio, fechaFin);

        // Ajustar la opacidad de los puntos
        svg.selectAll('circle')
            .attr('opacity', d => filteredData.includes(d) ? 1 : 0.3); // Establece opacidad a 0.3 para los puntos no seleccionados

        updateFilterOpacity('month-filter');
    });

    // Función para manejar la actualización de gráficos
    function handleSelectionUpdate(filteredData, selectedDates, fechaInicio, fechaFin) {
        if (selectedDates.length === 0) {
            console.warn("No hay fechas válidas seleccionadas.");
            return;
        }

        // console.log("Actualizando gráficos con fechas seleccionadas:", selectedDates);
        const cityFile = filteredData.length > 0 ? filteredData[0].city : null;

        updateTimeSeriesChart(cityFile, fechaInicio, fechaFin, selectedDates);
        updateCorrelationMatrixnew(selectedDates);
        drawThemeRiver(cityFile, selectedDates);
        updateRadialChartWithSelection(filteredData, fechaInicio, fechaFin);
    }

    // Función para filtrar datos por estación
    function filterDataBySeason(season, data) {
        const seasonRanges = {
            Primavera: { start: { month: 3, day: 20 }, end: { month: 6, day: 21 } },
            Verano: { start: { month: 6, day: 21 }, end: { month: 9, day: 22 } },
            Otoño: { start: { month: 9, day: 22 }, end: { month: 12, day: 21 } },
            Invierno: { start: { month: 12, day: 21 }, end: { month: 3, day: 20 } }
        };

        const range = seasonRanges[season];
        if (!range) return [];

        return data.filter(d => {
            const start = new Date(d.year, range.start.month - 1, range.start.day);
            const end = new Date(d.year, range.end.month - 1, range.end.day);
            const date = new Date(d.year, d.month - 1, d.day);

            return season === 'Invierno'
                ? (date >= start || date <= end)
                : (date >= start && date <= end);
        });
    }

    // Función para filtrar datos por mes
    function filterDataByMonth(month, data) {
        const monthMapping = {
            Enero: 1, Febrero: 2, Marzo: 3, Abril: 4, Mayo: 5, Junio: 6,
            Julio: 7, Agosto: 8, Septiembre: 9, Octubre: 10, Noviembre: 11, Diciembre: 12
        };
        const monthNumber = monthMapping[month];
        return data.filter(d => d.month === monthNumber);
    }

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
            // Agregar manejador para el filtro de estación

        .on("mouseover", (event, d) => {
            tooltip.style("visibility", "visible")
                .html(`
                    <strong>Ciudad:</strong> ${d.city.replace('Data_', '').replace('.csv', '')}<br>
                    <strong>Fecha:</strong> ${d.day}/${d.month}/${d.year}<br>
                    <strong>AQI:</strong> ${d.AQI}
                `);
            d3.select(event.target)
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
            d3.select(event.target)
                .attr("r", 6)  // Restaurar el radio original
                .attr("stroke", "none");  // Quitar el borde
        });
        
        function highlightSeason(season, data, svg, xScale, yScale) {
            // Definir rangos de fechas para cada estación
            const seasonRanges = {
                Primavera: { start: { month: 3, day: 20 }, end: { month: 6, day: 21 } },
                Verano: { start: { month: 6, day: 21 }, end: { month: 9, day: 22 } },
                Otoño: { start: { month: 9, day: 22 }, end: { month: 12, day: 21 } },
                Invierno: { start: { month: 12, day: 21 }, end: { month: 3, day: 20 } },
            };
        
            const range = seasonRanges[season];
            if (!range) return;
        
            function isInSeason(d) {
                const start = new Date(d.year, range.start.month - 1, range.start.day);
                const end = new Date(d.year, range.end.month - 1, range.end.day);
                const date = new Date(d.year, d.month - 1, d.day);
        
                if (season === 'Invierno') {
                    return (
                        (date >= start && d.month >= 12) || 
                        (d.month <= 3 && date <= end)
                    );
                }
        
                return date >= start && date <= end;
            }
        
            svg.selectAll("circle")
                .attr("stroke", "none")
                .attr("r", 6);
        
            svg.selectAll("circle")
                .filter(d => isInSeason(d))
                .attr("stroke", "blue")
                .attr("stroke-width", 2)
                .attr("r", 8);
        }
        
        function highlightYear(year, data, svg, xScale, yScale) {
            svg.selectAll("circle")
                .attr("stroke", "none")
                .attr("r", 6);
        
            svg.selectAll("circle")
                .filter(d => d.year === year)
                .attr("stroke", "blue")
                .attr("stroke-width", 2)
                .attr("r", 8);
        }
        
        function highlightMonth(month, data, svg, xScale, yScale) {
            const months = {
                Enero: 1, Febrero: 2, Marzo: 3, Abril: 4, Mayo: 5, Junio: 6,
                Julio: 7, Agosto: 8, Septiembre: 9, Octubre: 10, Noviembre: 11, Diciembre: 12
            };
        
            const monthNumber = months[month];
            if (!monthNumber) return;
        
            svg.selectAll("circle")
                .attr("stroke", "none")
                .attr("r", 6);
        
            svg.selectAll("circle")
                .filter(d => d.month === monthNumber)
                .attr("stroke", "blue")
                .attr("stroke-width", 2)
                .attr("r", 8);
        }
    // Variables para la selección
    let isDrawing = false;
    let points = [];
    let selectionLine; // Para almacenar la línea de selección

    // Zoom
    const zoom = d3.zoom()
        .scaleExtent([0.5, 10])
        .on("zoom", (event) => {
            g.attr("transform", event.transform);
        });

    svg.call(zoom);
    const initialTransform = d3.zoomIdentity.translate(width / 9.5, height / 20).scale(0.79);
    svg.call(zoom).call(zoom.transform, initialTransform);

    svg.on("mousedown", (event) => {
        if (event.button !== 2) return; // Solo activar con anticlick (botón derecho del mouse)

        // Limpiar la selección anterior
        if (selectionLine) {
            selectionLine.remove();
        }

        isDrawing = true;
        points = []; // Reiniciar puntos

        const [startX, startY] = d3.pointer(event, g.node());
        points.push([startX, startY]);

        // Crear línea inicial
        selectionLine = g.append("polyline")
            .attr("fill", "rgba(100, 100, 255, 0.3)")
            .attr("stroke", "blue")
            .attr("stroke-width", 2)
            .attr("points", points.join(" "));

        svg.on("mousemove", (event) => {
            if (!isDrawing) return;

            const [currentX, currentY] = d3.pointer(event, g.node());
            points.push([currentX, currentY]);
            selectionLine.attr("points", points.join(" "));
        });
    });

    svg.on("mouseup", () => {
        if (!isDrawing) return;

        isDrawing = false;

        // Unir el último punto con el primero
        points.push(points[0]); // Añadir el primer punto al final para cerrar el polígono
        selectionLine.attr("points", points.join(" ")); // Actualizar la línea para incluir el cierre

        // Filtrar los puntos seleccionados dentro del polígono
        const selectionData = data.filter(d => {
            const x = xScale(d.UMAP1);
            const y = yScale(d.UMAP2);
            return d3.polygonContains(points, [x, y]); // Verificar si el punto está dentro del polígono
        });

        // Verificar si hay datos seleccionados
        if (selectionData.length === 0) {
            console.warn("No se seleccionaron puntos dentro del área.");
            return;
        }

        // Construir el arreglo de fechas seleccionadas
        const selectedDates = selectionData.map(d => `${d.year}-${d.month}-${d.day}`);

        // Verifica que haya fechas válidas en `selectedDates`
        if (selectedDates.length === 0) {
            console.warn("No hay fechas válidas en los datos seleccionados.");
            return;
        }

        // Obtener el archivo de la ciudad seleccionada
        const cityFile = selectionData[0].city;
        // console.log("Puntos seleccionados:");
        // console.log(`Ciudad: ${selectionData[0].city}`);
        // selectionData.forEach(d => {
        //     console.log(`Fecha: ${d.day}/${d.month}/${d.year}`);
        // });

        // Llamar a las funciones con las fechas seleccionadas
        updateTimeSeriesChart(cityFile, fechaInicio, fechaFin, selectedDates);
        updateCorrelationMatrixnew(selectedDates);
        drawThemeRiver(cityFile, selectedDates);
        updateRadialChartWithSelection(selectionData, fechaInicio, fechaFin);

        // Restaurar todos los puntos a su estado original antes de aplicar cambios a los puntos seleccionados
        svg.selectAll("circle")
            .attr("r", 6)  // Restaurar el radio original de los puntos (ajusta según el tamaño original)
            .attr("stroke", "none");  // Eliminar el borde azul

        // Hacer los puntos seleccionados más grandes y agregar un borde azul
        selectionData.forEach(d => {
            const x = xScale(d.UMAP1);
            const y = yScale(d.UMAP2);
            // Buscar el círculo correspondiente y cambiar su radio y agregar un borde
            svg.selectAll("circle")
                .filter(function() {
                    const cx = parseFloat(this.getAttribute("cx"));
                    const cy = parseFloat(this.getAttribute("cy"));
                    return cx === x && cy === y;
                })
                .attr("r", 8)  // Cambiar el tamaño del radio
                .attr("stroke", "blue")  // Agregar borde azul
                .attr("stroke-width", 3);  // Establecer el grosor del borde
        });
    });

    // Agregar la leyenda como botones
    const legendData = [
        { color: '#00E400', label: 'Bueno', AQI: 1 },
        { color: '#FFFF00', label: 'Moderado', AQI: 2 },
        { color: '#FF7E00', label: 'Insalubre', AQI: 3 },
        { color: '#FF0000', label: 'Muy Insalubre', AQI: 4 },
        { color: '#99004c', label: 'Malo', AQI: 5 },
        { color: '#800000', label: 'Severo', AQI: 6 },
    ];

    // Crear la leyenda como botones, asegurando que esté delante de otros elementos
    if (container.select('.legend-pca').empty()) {
        const legend = container.insert('div', ':first-child')
            .attr('class', 'legend-pca')
            .style('display', 'flex')
            .style('justify-content', 'center')
            .style('align-items', 'center')
            .style('position', 'absolute')
            .style('bottom', '-1%') // Coloca la leyenda en la parte inferior del contenedor
            .style('left', '2%')
            .style('width', '96%') // Ajusta el ancho disponible
            .style('height', 'auto')
            .style('font-family', 'Arial, sans-serif')
            .style('font-weight', 'bold')
            .style('z-index', '1000') // Asegura que esté encima de cualquier cosa
            .style('pointer-events', 'all') // Permite interacciones con los botones
            .style('border-radius', '10px')
            .style('padding', '10px') // Espaciado interno para los botones
            .style('text-align', 'center');  // Centrar el texto

        legendData.forEach((item, index) => {
            const legendButton = legend.append('button')
                .attr('class', 'legend-item-pca')
                .style('background-color', item.color)
                .style('padding', '3px 10px')
                .style('margin', '0 4px')
                .style('border-radius', '5px')
                .style('color', index > 3 ? 'white' : 'black') // Texto blanco para "Malo" y "Severo"
                .style('border', 'none')
                .style('cursor', 'pointer')
                .style('font-weight', 'bold')
                .style('text-align', 'center')  // Centrar el texto
                .style('font-size', '12px')
                .style('box-shadow', '0px 2px 5px rgba(0, 0, 0, 0.3)') // Sombra para resaltar los botones
                .text(item.label);

            // Cambiar la opacidad y agregar borde en hover
            legendButton
                .on('mouseover', () => {
                    legendButton.style('box-shadow', '0px 0px 5px 2px rgba(0,0,0,0.5)');
                })
                .on('mouseout', () => {
                    if (!legendButton.classed('selected')) {
                        legendButton.style('box-shadow', 'none');
                    }
                });

            // Filtrar puntos al hacer clic
            legendButton.on('click', () => {
                // Quitar la sombra de todos los botones y restablecer tamaño
                legend.selectAll('button')
                    .style('box-shadow', 'none')
                    .style('transform', 'scale(1)')
                    .style('opacity', '0.7')  // Reducir opacidad de los otros botones
                    .classed('selected', false);
                
                // Agregar la clase 'selected' al botón clickeado para aplicar la sombra
                legendButton.style('box-shadow', '0px 0px 5px 2px rgba(0,0,0,0.5)')
                    .style('transform', 'scale(1.1)') // Hacer que el botón crezca un poco
                    .style('opacity', '1')  // El botón seleccionado no pierde opacidad
                    .classed('selected', true);

                const selectedAQI = index + 1; // AQI corresponde al índice + 1

                // Filtrar puntos en el gráfico UMAP
                svg.selectAll('circle')
                    .attr('opacity', d => (d.AQI === selectedAQI ? 1 : 0.1));

                // Filtrar datos para otras visualizaciones
                const selectedData = data.filter(d => d.AQI === selectedAQI);
                const selectedDates = selectedData.map(d => `${d.year}-${d.month}-${d.day}`);

                // Actualizar otras gráficas con los datos seleccionados
                updateTimeSeriesChart(selectedData[0]?.city, fechaInicio, fechaFin, selectedDates);
                updateCorrelationMatrixnew(selectedDates);
                drawThemeRiver(selectedData[0]?.city, selectedDates);
                updateRadialChartWithSelection(selectedData, fechaInicio, fechaFin);

            });
        });

        // Agregar un botón para resetear el filtro
        legend.append('button')
            .attr('class', 'reset-button-pca')
            .style('background-color', '#ccc')
            .style('padding', '5px 15px')
            .style('margin', '0 5px')
            .style('border-radius', '5px')
            .style('color', 'black')
            .style('border', 'none')
            .style('cursor', 'pointer')
            .style('font-size', '12px')
            .style('font-weight', 'bold')
            .style('box-shadow', '0px 2px 5px rgba(0, 0, 0, 0.3)') // Sombra para resaltar el botón
            .text('Resetear')
            .on('mouseover', function () {
                d3.select(this).style('box-shadow', '0px 0px 5px 2px rgba(0,0,0,0.5)');
            })
            .on('mouseout', function () {
                d3.select(this).style('box-shadow', 'none');
            })
            .on('click', () => {
                // Resetear opacidad de todos los puntos
                svg.selectAll('circle')
                    .attr('opacity', 1);

                // Eliminar la sombra de todos los botones y quitar la clase 'selected'
                legend.selectAll('button')
                    .style('box-shadow', 'none')
                    .style('transform', 'scale(1)')
                    .style('opacity', '1')  // Restaurar opacidad original
                    .classed('selected', false);
            });
    }

}

function updateCorrelationMatrixnew(dates) {
    // console.log(dates);
    const selectedAttributes = Array.from(document.querySelectorAll('.options-chek-correlation input[type="checkbox"]:checked'))
                                    .map(cb => cb.value);

    if (selectedAttributes.length === 0) return;

    // Obtener las ciudades seleccionadas
    const selectedCities = Array.from(document.querySelectorAll('#city-checkboxes input[type="radio"]:checked'))
                                .map(cb => cb.value);

    const visualizarTodo = document.getElementById('visualizar-todo').checked;

    selectedCities.forEach(selectedCity => {
        d3.csv(`data/${selectedCity}`).then(data => {
            // Filtrar los datos por las fechas seleccionadas
            if (dates && dates.length > 0) {
                data = data.filter(d => {
                    const date = `${d.year}-${d.month}-${d.day}`;
                    return dates.includes(date); // Filtrar solo las fechas seleccionadas
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
            // console.log(parsedData);
            const correlationMatrix = calculateCorrelationMatrix(parsedData, selectedAttributes);
            const matrizdistancia = calculateDistanceMatrix(correlationMatrix);
            const hierarchyData = buildHierarchy(selectedAttributes, matrizdistancia);
            // console.log(correlationMatrix);
            
            // Crear o actualizar el dendrograma radial
            createRadialDendrogram(hierarchyData, selectedAttributes, matrizdistancia, selectedCity, dates.join(', '));
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
        PM2_5: +d.PM2_5 || null,
        PM10: +d.PM10 || null,
        SO2: +d.SO2 || null,
        NO2: +d.NO2 || null,
        CO: +d.CO || null,
        O3: +d.O3 || null,
        TEMP: +d.TEMP || null,
        PRES: +d.PRES || null,
        DEWP: +d.DEWP || null,
        RAIN: +d.RAIN || null,
    }));

    const selectedDatesSet = new Set(dates.map(date => new Date(date).getTime()));
    const filteredData = data.filter(d => selectedDatesSet.has(d.date.getTime()));

    if (filteredData.length === 0) {
        alert("No se encontraron datos para las fechas seleccionadas.");
        return;
    }

    const contaminantAttributes = ["O3", "CO", "NO2", "SO2", "PM10", "PM2_5"];
    const meteorologicalAttributes = ["RAIN", "DEWP", "PRES", "TEMP"];
    const attributes = [...contaminantAttributes, ...meteorologicalAttributes];

    const attributeStats = attributes.reduce((stats, attr) => {
        const values = filteredData.map(d => d[attr]).filter(value => value !== null);
        stats[attr] = { min: Math.min(...values), max: Math.max(...values) };
        return stats;
    }, {});

    const normalizedData = filteredData.map(d => {
        const normalized = { date: d.date };
        attributes.forEach(attr => {
            const { min, max } = attributeStats[attr];
            normalized[attr] = d[attr] !== null && max > min
                ? (d[attr] - min) / (max - min)
                : 0.5;
        });
        return normalized;
    });

    const margin = { top: 100, right: 10, bottom: 70, left: 30 };
    const width = 600 - margin.left - margin.right;
    const height = 420 - margin.top - margin.bottom;

    const container = d3.select("#evolution-plot");
    container.selectAll("*").remove();

    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

    const chartGroup = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const labelsGroup = svg.append("g")
        .attr("transform", `translate(50, ${height + margin.top -295})`);

    const stack = d3.stack()
        .keys(attributes)
        .value((d, key) => d[key] || 0)
        .order(d3.stackOrderNone)
        .offset(d3.stackOffsetWiggle);

    const series = stack(normalizedData);

    const x = d3.scaleLinear()
        .domain([0, normalizedData.length - 1])
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([
            d3.min(series.flat(), d => d[0]),
            d3.max(series.flat(), d => d[1])
        ])
        .range([height, 0]);

    const attributeColors = {
        'PM2_5': '#FF0000',
        'PM10': '#FF9900',
        'SO2': '#FFD700',
        'NO2': '#d500f1',
        'CO': '#00CED1',
        'O3': '#0000FF',
        'TEMP': '#008000',
        'PRES': '#8B0000',
        'DEWP': '#4B0082',
        'RAIN': '#1E90FF'
    };

    const area = d3.area()
        .x((d, i) => x(i))
        .y0(d => y(d[0]))
        .y1(d => y(d[1]));

    const updateGraph = (xDomain) => {
        x.domain([
            Math.max(0, xDomain[0]),
            Math.min(normalizedData.length - 1, xDomain[1])
        ]);

        chartGroup.selectAll("path")
            .data(series)
            .join("path")
            .attr("fill", d => attributeColors[d.key])
            .attr("d", area);

        const maxTicks = 30; // Número máximo de fechas visibles
        const totalVisibleDates = Math.round(x.domain()[1] - x.domain()[0]);
        const tickStep = Math.ceil(totalVisibleDates / maxTicks);
        const visibleDates = d3.range(
            Math.round(x.domain()[0]),
            Math.round(x.domain()[1]),
            tickStep
        );

        const dateTicks = visibleDates.map(i => ({
            index: i,
            date: normalizedData[i].date
        }));

        const gridLines = chartGroup.selectAll(".grid-line")
            .data(dateTicks, d => d.index);

        gridLines.enter()
            .append("line")
            .attr("class", "grid-line")
            .merge(gridLines)
            .attr("x1", d => x(d.index))
            .attr("x2", d => x(d.index))
            .attr("y1", 0)
            .attr("y2", height)
            .attr("stroke", "#000")
            .attr("stroke-opacity", 0.15)
            .attr("stroke-width", 1);

        gridLines.exit().remove();

        chartGroup.select(".x-axis")
            .call(
                d3.axisBottom(x)
                    .tickValues(visibleDates)
                    .tickFormat(i => d3.timeFormat("%d-%m-%Y")(normalizedData[i].date))
            )
            .selectAll("text")
            .attr("transform", `rotate(-45)`)
            .style("text-anchor", "end");
    };

    chartGroup.append("g")
        .selectAll("path")
        .data(series)
        .join("path")
        .attr("fill", d => attributeColors[d.key])
        .attr("d", area);

    chartGroup.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${height})`)
        .call(
            d3.axisBottom(x)
                .ticks(20)
                .tickFormat(i => d3.timeFormat("%d-%m-%Y")(normalizedData[Math.round(i)].date))
        )
        .selectAll("text")
        .attr("transform", `rotate(-45)`)
        .style("text-anchor", "end");

    // Eliminamos o comentamos esta línea para ocultar el eje Y
    // chartGroup.append("g")
    //     .call(d3.axisLeft(y));

    const brush = d3.brushX()
        .extent([[0, 0], [width, height]])
        .on("end", ({ selection }) => {
            if (!selection) return;

            const [x0, x1] = selection.map(x.invert);
            const startIndex = Math.max(0, Math.floor(x0));
            const endIndex = Math.min(normalizedData.length - 1, Math.ceil(x1));

            updateGraph([startIndex, endIndex]);
            chartGroup.select(".brush").call(brush.move, null);
        });

    chartGroup.append("g")
        .attr("class", "brush")
        .call(brush);

    svg.on("dblclick", () => {
        updateGraph([0, normalizedData.length - 1]);
    });

    const labelOrder = [
        "PM2_5", "PM10", "SO2", "NO2", "CO", "O3", "TEMP", "PRES", "DEWP", "RAIN"
    ];

    labelOrder.forEach((attr, index) => {
        labelsGroup.append("text")
            .attr("x", (index % 5) * 120)
            .attr("y", Math.floor(index / 5) * 20)
            .text(attr)
            .style("fill", attributeColors[attr])
            .style("font-size", "14px")
            .style("font-weight", "bold");
    });

    // Llamada inicial para dibujar la gráfica con las fechas y las líneas
    updateGraph([0, normalizedData.length - 1]);
}
