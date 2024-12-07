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
                const iconUrl = createCustomIcon(station.Notes);

                const marker = new google.maps.Marker({
                    position: position,
                    map: map,
                    title: station.stationId,
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

    console.log(averageAQI)
    ColorAqiglobal = averageAQI
    console.log(ColorAqiglobal)
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


///////////////GRAFICA  RADIAL DE SERIE TEMPORAL.


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
    'PM2_5': '#FF0000', // Rojo fuerte para reflejar peligro
    'PM10': '#FF9900', // Naranja brillante para particulado
    'SO2': '#FFD700', // Amarillo intenso para gases tóxicos
    'NO2': '#4ee456', // Verde neón para contaminación visible
    'CO': '#00CED1', // Turquesa vibrante para gas incoloro
    'O3': '#0000FF', // Azul intenso para ozono
    'TEMP': '#008000', // Rosa fuerte para variación térmica
    'PRES': '#8B0000', // Rojo oscuro para presión atmosférica
    'DEWP': '#4B0082', // Indigo para representar humedad
    'RAIN': '#1E90FF'  // Azul cielo para lluvia
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

// GRAFICAS PAR RADIAL PERO QUE SEA POR LA SELECCION DEL UMAPO

function updateRadialChartWithSelection(selectionData) {
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
        drawRadialChart2(aggregatedData, attributes);
    });
}


function drawRadialChart2(data, attributes) {
    d3.select('#chart-view-radial').html(""); // Limpia el gráfico existente
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

    attributes.forEach((attr, index) => {
        const radialScale = d3.scaleLinear().domain([0, maxValues[index]]).range([centralHoleRadius + index * ringWidth, centralHoleRadius + (index + 1) * ringWidth]);

        svg.append("circle")
           .attr("cx", 0).attr("cy", 0)
           .attr("r", radialScale(maxValues[index]))
           .attr("fill", "none")
           .attr("stroke", "#000")
           .attr("stroke-width", 1)
           .attr("stroke-dasharray", "3,3");

        const lineColor = attributeColors[attr] || '#000';
        let previousDate = null;

        data.forEach((d, i) => {
            const date = new Date(d.date);
            const season = getSeason(date);
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
               .attr('opacity', 0.2)
               .attr('class', `season-${season.replace(/\s+/g, '-')}`) // Clase específica para la estación
               .on("click", function(event) {
                    const clickedSeason = season;
                    const selectedDates = data.filter(d => getSeason(new Date(d.date)) === clickedSeason)
                        .map(d => d.date);
                    console.log(`Fechas en la estación ${clickedSeason}:`, selectedDates);
                    
                    // Limpiar selecciones previas
                    svg.selectAll('path').classed('selected', false);

                    // Resaltar la selección
                    svg.selectAll(`.season-${clickedSeason.replace(/\s+/g, '-')}`).classed('selected', true);

                    // Obtener la ciudad seleccionada
                    const selectedCity = document.querySelector('#city-checkboxes input[type="radio"]:checked').value;
                    
                    // Actualizar la gráfica de series temporales con las fechas seleccionadas
                    updateTimeSeriesChart(selectedCity, null, null, selectedDates);
               });

            const currentAngle = angleScale(i);
            const currentRadius = radialScale(d[attr] || 0);
            const x = Math.sin(currentAngle) * currentRadius;
            const y = -Math.cos(currentAngle) * currentRadius;

            if (i > 0 && previousDate) {
                const currentDate = new Date(d.date);
                const diffDays = (currentDate - previousDate) / (1000 * 60 * 60 * 24);

                if (diffDays === 1) {
                    svg.append('line')
                       .attr('x1', Math.sin(angleScale(i - 1)) * radialScale(data[i - 1][attr] || 0))
                       .attr('y1', -Math.cos(angleScale(i - 1)) * radialScale(data[i - 1][attr] || 0))
                       .attr('x2', x)
                       .attr('y2', y)
                       .attr('stroke', lineColor)
                       .attr('stroke-width', 1.5);
                } else {
                    svg.append('line')
                    .attr('x1', 0)
                    .attr('y1', 0)
                    .attr('x2', Math.sin(angleScale(i)) * radius)
                    .attr('y2', -Math.cos(angleScale(i)) * radius)
                    .attr('stroke', '#000')
                    .attr('stroke-width', 1)
                    .attr('stroke-dasharray', '4,2')
                    .attr('opacity', 0.3); 
                }
            }

            svg.append('circle')
               .attr('cx', x)
               .attr('cy', y)
               .attr('r', 3)
               .attr('fill', lineColor)
               .on("mouseover", () => {
                   tooltip.style("display", "block")
                          .html(`<strong>Fecha:</strong> ${d3.timeFormat('%d/%m/%Y')(new Date(d.date))}<br><strong>${attr}:</strong> ${d[attr].toFixed(2)}`);
               })
               .on("mousemove", (event) => {
                   tooltip.style("left", (event.pageX + 10) + "px")
                          .style("top", (event.pageY - 20) + "px");
               })
               .on("mouseout", () => {
                   tooltip.style("display", "none");
               });

            previousDate = new Date(d.date);
        });

        svg.append('text')
           .attr('x', 0)
           .attr('y', -radialScale(maxValues[index]) - 10)
           .attr('dy', '-0.5em')
           .attr('text-anchor', 'middle')
           .attr('font-size', '14px')
           .attr('font-weight', 'bold')
           .text(attr);
    });

    const step = Math.ceil(data.length / 10);
    data.forEach((d, i) => {
        if (i % step === 0) {
            const angle = angleScale(i);
            const x = Math.sin(angle) * (radius + 10);
            const y = -Math.cos(angle) * (radius + 10);
            const label = d3.timeFormat('%d %b')(new Date(d.date));

            svg.append('text')
               .attr('x', x)
               .attr('y', y)
               .attr('dy', '0.35em')
               .attr('text-anchor', 'middle')
               .attr('font-size', '10px')
               .text(label);
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

    const margin = { top: 20, right: 10, bottom: 60, left: 30 };
    const width = 840 - margin.left - margin.right;
    const height = 360 - margin.top - margin.bottom;

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
    const legendData = [
        { color: '#00E400', label: 'Bueno' },
        { color: '#FFFF00', label: 'Moderado' },
        { color: '#FF7E00', label: 'Insalubre' },
        { color: '#FF0000', label: 'Muy Insalubre' },
        { color: '#99004c', label: 'Malo' },
        { color: '#800000', label: 'Severo' }
    ];
    

    
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

        // Establece los atributos que estarán seleccionados por defecto
        let selectedAttributes = JSON.parse(localStorage.getItem('selectedAttributes')) || ["PM2_5"];

        const attributeColors = {
            'PM2_5': '#FF0000', // Rojo fuerte para reflejar peligro
            'PM10': '#FF9900', // Naranja brillante para particulado
            'SO2': '#FFD700', // Amarillo intenso para gases tóxicos
            'NO2': '#4ee456', // Verde neón para contaminación visible
            'CO': '#00CED1', // Turquesa vibrante para gas incoloro
            'O3': '#0000FF', // Azul intenso para ozono
            'TEMP': '#008000', // Rosa fuerte para variación térmica
            'PRES': '#8B0000', // Rojo oscuro para presión atmosférica
            'DEWP': '#4B0082', // Indigo para representar humedad
            'RAIN': '#1E90FF'  // Azul cielo para lluvia
        };
        let checkboxContainer = container.select('#checkbox-container');
        if (checkboxContainer.empty()) {
            checkboxContainer = container.append('div')
                .attr('id', 'checkbox-container')
                .style('display', 'flex')
                .style('gap', '10px')
                .style('flex-wrap', 'wrap')
                .style('font-weight', 'bold')  // Hacer el texto en negrita
                .style('margin', '30px 0 10px 50px');
        } else {
            checkboxContainer.selectAll('*').remove();
        }
        
        checkboxContainer.selectAll('div')
            .data(attributes)
            .join('div')
            .style('display', 'flex')
            .style('align-items', 'center')  // Asegura que los elementos estén alineados verticalmente
            .style('gap', '5px')  // Espacio entre el checkbox y el label
            .each(function (attribute) {
                const div = d3.select(this);
        
                div.append('input')
                    .attr('type', 'checkbox')
                    .attr('value', attribute)
                    .property('checked', selectedAttributes.includes(attribute))  // Usa el estado guardado
                    .on('change', function () {
                        // Actualiza los atributos seleccionados y guarda el estado
                        selectedAttributes = d3.selectAll('#checkbox-container input:checked')
                            .nodes()
                            .map(node => node.value);
        
                        // Guarda el estado en el localStorage
                        localStorage.setItem('selectedAttributes', JSON.stringify(selectedAttributes));
        
                        // Llama a drawChart para actualizar el gráfico
                        drawChart(selectedAttributes, data, startDate, endDate, selectedDates);
                    });
        
                div.append('label')
                    .text(attribute)
                    .style('cursor', 'pointer')
                    .style('color', attributeColors[attribute])  // Aplicar color a la etiqueta
                    .style('margin', '0')  // Elimina el margen del label para que se alinee mejor
                    .style('vertical-align', 'middle');  // Asegura que el texto se alinee verticalmente con el checkbox
            });
        
        // Llama a drawChart inicialmente con los atributos seleccionados por defecto
        drawChart(selectedAttributes, data, startDate, endDate, selectedDates);
    });

    
    function drawChart(selectedAttributes, data, startDate, endDate, selectedDates) {
        const containerId = 'chart-container';
        let chartContainer = container.select(`#${containerId}`);
    
        if (chartContainer.empty()) {
            chartContainer = container.append('div')
                .attr('id', containerId)
                .style('margin-bottom', '30px');
        }
    
        // Filtrar y transformar los datos
        let filteredData = data.map(d => ({
            date: new Date(`${d.year}-${d.month}-${d.day}`),
            value: selectedAttributes.reduce((acc, attribute) => {
                acc[attribute] = +d[attribute.replace('.', '_')];
                return acc;
            }, {})
        }));
    
        // Filtrar los datos según las fechas seleccionadas (si hay fechas específicas)
        if (selectedDates && selectedDates.length > 0) {
            const selectedDateSet = new Set(selectedDates.map(d => new Date(d).toISOString().split('T')[0]));
            filteredData = filteredData.filter(d => {
                const dateStr = d.date.toISOString().split('T')[0]; // Convertimos la fecha a "YYYY-MM-DD"
                return selectedDateSet.has(dateStr);
            });
        } else {
            let internalStartDate = startDate || d3.min(filteredData, d => d.date);
            let internalEndDate = endDate || d3.max(filteredData, d => d.date);
    
            filteredData = filteredData.filter(d =>
                d.date >= new Date(internalStartDate) && d.date <= new Date(internalEndDate)
            );
        }
    


        
        const averagedData = d3.groups(filteredData, d => d.date)
            .map(([date, values]) => ({
                date: date,
                value: selectedAttributes.reduce((acc, attribute) => {
                    acc[attribute] = d3.mean(values, v => v.value[attribute]);
                    return acc;
                }, {})
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
    
        const xAxis = d3.axisBottom(xScale).tickFormat(d3.timeFormat("%Y-%m-%d"));
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
            const month = d.date.getMonth() + 1; // Enero = 0, por lo que sumamos 1
            const day = d.date.getDate();
            const season = getSeason(month, day);
    
            chartSvg.append('rect')
                .attr('x', xScale(d.date))
                .attr('y', 0)
                .attr('width', xScale(new Date(d.date.getTime() + 86400000)) - xScale(d.date)) // Ancho de 1 día
                .attr('height', height)
                .attr('fill', seasonColors[season])
                .attr('opacity', 0.3);
        });
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
    
        // Agrupar los puntos consecutivos de la misma estación y dibujar líneas
        selectedAttributes.forEach(attribute => {
            const filteredNormalizedData = normalizedData.filter(d => {
                const value = d.value[attribute];
                const aqiColor = getAQIColor(value, attribute);
                return aqiColor !== '#7e0023'; // Filtrar puntos con color negro (fuera de rango)
            });

            let previousPoint = null;
            let lineData = [];
            let currentSeason = null;

            // Procesar y dibujar líneas y puntos válidos
            filteredNormalizedData.forEach((d, i) => {
                const currentPoint = { 
                    x: xScale(d.date), 
                    y: yScale(d.normalizedValues[attribute]), 
                    index: i,
                    date: d.date,
                    value: d.value[attribute]
                };
                const season = getSeason(d.date.getMonth() + 1, d.date.getDate());

                // Verificar si el valor es undefined
                if (d.value[attribute] === undefined) {
                    // Si el valor es undefined, no unir con el punto anterior
                    previousPoint = null; // Reiniciar previousPoint
                    return; // Salir de la iteración actual
                }

                if (previousPoint && season === currentSeason) {
                    lineData.push(previousPoint);
                    lineData.push(currentPoint);
                } else {
                    if (lineData.length > 1) {
                        drawLine(chartSvg, lineData, attribute); // Pasa el atributo correspondiente
                    }
                    lineData = [currentPoint];
                }
                previousPoint = currentPoint;
                currentSeason = season;
            });

            // Dibujar la última línea si es necesario
            if (lineData.length > 1) {
                drawLine(chartSvg, lineData, attribute); // Pasa el atributo correspondiente
            }

            // Dibujar puntos válidos
            chartSvg.selectAll(`circle.${attribute}`)
                .data(filteredNormalizedData)
                .join('circle')
                .attr('class', attribute)
                .attr('cx', d => xScale(d.date))
                .attr('cy', d => yScale(d.normalizedValues[attribute]))
                .attr('r', 3)
                .attr('fill', d => getAQIColor(d.value[attribute], attribute))
                .on('mouseover', function(event, d) {
                    const [mouseX, mouseY] = d3.pointer(event);
                
                    // Transición para agrandar el punto seleccionado
                    const point = d3.select(this);
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
                        'NO2': '#4ee456', // Verde neón para contaminación visible
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
                                .y(d => yMiniScale(d[contaminant]));
            
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
                        
                                // Obtener datos de la hora correspondiente
                                const hourData = selectedDayData.find(d => d.hour === hour);
                        
                                if (hourData) {
                                    tooltip.style('visibility', 'visible')
                                        .style('left', `${xPosition + miniMargin.left}px`) // Ajustar al eje X del gráfico
                                        .style('top', `${yMiniScale(1) + miniMargin.top + 65}px`) // Justo encima del gráfico
                                        .html(selectedContaminants.map(contaminant =>
                                            `${contaminant}: ${hourData[contaminant]} ${units[contaminant]}`
                                        ).join('<br>'));
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

        // Función para dibujar las líneas con el color correspondiente
        function drawLine(chartSvg, points, attribute) {
            chartSvg.append('path')
                .data([points])  // Aseguramos de pasar un array de puntos
                .attr('class', 'line')
                .attr('d', d3.line().x(d => d.x).y(d => d.y)(points))  // Usamos 'points' en lugar de 'd'
                .attr('fill', 'none')
                .attr('stroke', attributeColors[attribute])  // Usar el color del atributo
                .attr('stroke-width', 2)
                .on('mouseover', function(event, d) {
                    // Cambiar el estilo (ejemplo: aumentar el grosor de la línea)
                    d3.select(this)
                        .attr('stroke-width', 4);  // Aumenta el grosor de la línea en hover

                    // Mostrar tooltip con el valor promedio o algún dato relevante
                    chartSvg.append('text')
                        .attr('id', 'tooltip')
                        .attr('x', xScale(d[0].date) + 5)
                        .attr('y', yScale(d3.mean(d, p => p.y)) - 10)  // Promedio de la Y de la línea
                        .attr('font-size', '12px')
                        .attr('fill', '#000')
                        .text(`Attribute: ${attribute}`); // Cambiar a mostrar el atributo
                })
                .on('mouseout', function(event, d) {
                    // Restaurar el estilo al salir
                    d3.select(this)
                        .attr('stroke-width', 2);  // Restaurar el grosor original

                    // Eliminar el tooltip
                    chartSvg.select('#tooltip').remove();
                });
        }
                }
    
}



// Variable global para almacenar el contaminante seleccionado actualmente
let currentContaminant = null;

// Escuchar cambios en los checkboxes de ciudad para la gráfica radial
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
        updateTimeSeriesChart(selectedCity, startDate, endDate);
    });
});

// Escuchar cambios en el rango de fechas para la gráfica radial
document.getElementById('fecha-inicio').addEventListener('change', () => {
    updateChart();
    if (currentContaminant) {
        const selectedCity = document.querySelector('#city-checkboxes input[type="radio"]:checked').value;
        const startDate = document.getElementById('fecha-inicio').value;
        const endDate = document.getElementById('fecha-fin').value;
        updateTimeSeriesChart(selectedCity, startDate, endDate);
    }
});

document.getElementById('fecha-fin').addEventListener('change', () => {
    updateChart();
    if (currentContaminant) {
        const selectedCity = document.querySelector('#city-checkboxes input[type="radio"]:checked').value;
        const startDate = document.getElementById('fecha-inicio').value;
        const endDate = document.getElementById('fecha-fin').value;
        updateTimeSeriesChart(selectedCity, startDate, endDate);
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
        updateTimeSeriesChart(selectedCity, startDate, endDate);
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
    const initialTransform = d3.zoomIdentity.translate(width / 9.5, height / 9.5).scale(0.8);
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
        console.log("Puntos seleccionados:");
        console.log(`Ciudad: ${selectionData[0].city}`);
        selectionData.forEach(d => {
            console.log(`Fecha: ${d.day}/${d.month}/${d.year}`);
        });

        // Llamar a las funciones con las fechas seleccionadas
        updateTimeSeriesChart(cityFile, null, null, selectedDates);
        updateCorrelationMatrixnew(selectedDates);
        drawThemeRiver(cityFile, selectedDates);
        updateRadialChartWithSelection(selectionData);

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
                .attr("r", 10)  // Cambiar el tamaño del radio
                .attr("stroke", "blue")  // Agregar borde azul
                .attr("stroke-width", 3);  // Establecer el grosor del borde
        });
    });

    // Agregar la leyenda
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
        const legend = container.insert('div', ':first-child')
            .attr('class', 'legend-pca')
            .style('display', 'flex')
            .style('justify-content', 'center')
            .style('position', 'absolute')
            .style('top', '93%')  // Coloca la leyenda al final del contenedor
            .style('width', '96%')  // Asegura que ocupe todo el ancho disponible
            .style('height', '5%')  // Asegura que ocupe todo el ancho disponible
            .style('font-family', 'Arial, sans-serif')
            .style('font-weight', 'bold');
    
        legendData.forEach(item => {
            const legendItem = legend.append('div')
                .attr('class', 'legend-item-pca')
                .style('background-color', item.color)
                .style('padding', '3px 12px')  // Reducir el padding para hacer los items más compactos
                .style('margin', '0 2px')  // Aumentar el margen entre los elementos
                .style('border-radius', '5px')  // Bordes redondeados para un diseño más suave
                .style('color', 'black')  // Establecer color de texto por defecto
                .style('text-align', 'center')  // Centrar el texto
                .style('font-size', '14px')  // Hacer el texto más pequeño
                .text(item.label);

            // Cambiar color de texto a blanco para "Malo" y "Severo"
            if (item.label === 'Malo' || item.label === 'Severo') {
                legendItem.style('color', 'white');
            }
        });
    }
}

function updateCorrelationMatrixnew(dates) {
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

            const correlationMatrix = calculateCorrelationMatrix(parsedData, selectedAttributes);
            const matrizdistancia = calculateDistanceMatrix(correlationMatrix);
            const hierarchyData = buildHierarchy(selectedAttributes, matrizdistancia);

            // Crear o actualizar el dendrograma radial
            createRadialDendrogram(hierarchyData, selectedAttributes, matrizdistancia, selectedCity, dates.join(', '));
        });
    });
}



//////////
///GRAFICA PARA MI FLUIO DE EVOLCUION D ETHEME RIVER
////////
async function drawThemeRiver(cityFile, dates) {
    // Añadir la fecha siguiente al último dato en el arreglo
    const lastDate = new Date(dates[dates.length - 1]);
    const nextDate = new Date(lastDate);
    nextDate.setDate(lastDate.getDate() + 1);
    dates.push(nextDate.toISOString());

    // Cargar los datos desde el archivo CSV
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
                : 0.5; // Normalizar valores faltantes como punto neutro
        });
        return normalized;
    });

    const margin = { top: 50, right: 30, bottom: 50, left: 20 };
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

    const x = d3.scaleLinear()
        .domain([0, normalizedData.length - 1])
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([
            d3.min(series.flat(), d => d[0]),
            d3.max(series.flat(), d => d[1])
        ])
        .range([height, 0]);

    // Colores definidos para cada atributo
    const attributeColors = {
        'PM2_5': '#FF0000', // Rojo fuerte para reflejar peligro
        'PM10': '#FF9900', // Naranja brillante para particulado
        'SO2': '#FFD700', // Amarillo intenso para gases tóxicos
        'NO2': '#4ee456', // Verde neón para contaminación visible
        'CO': '#00CED1', // Turquesa vibrante para gas incoloro
        'O3': '#0000FF', // Azul intenso para ozono
        'TEMP': '#008000', // Rosa fuerte para variación térmica
        'PRES': '#8B0000', // Rojo oscuro para presión atmosférica
        'DEWP': '#4B0082', // Indigo para representar humedad
        'RAIN': '#1E90FF'  // Azul cielo para lluvia
    };

    svg.append("g")
        .selectAll("path")
        .data(series)
        .join("path")
        .attr("fill", d => attributeColors[d.key]) // Usar los colores definidos para cada atributo
        .attr("d", d3.area()
            .x((d, i) => x(i))
            .y0(d => y(d[0]))
            .y1(d => y(d[1])));

    const minHeightThreshold = 5;

    series.forEach(layer => {
        const totalLength = layer.length;
        const proportionalPositions = [
            { index: 0, anchor: "start" },
            { index: totalLength - 1, anchor: "end" }
        ];

        proportionalPositions.forEach(({ index, anchor }) => {
            const point = layer[index];
            const height = y(point[0]) - y(point[1]);
            if (Math.abs(height) > minHeightThreshold) {
                svg.append("text")
                    .attr("x", x(index))
                    .attr("y", y((point[0] + point[1]) / 2))
                    .text(layer.key)
                    .attr("fill", "black")
                    .attr("font-size", "12px")
                    .attr("font-weight", "bold")
                    .attr("text-anchor", anchor)
                    .attr("alignment-baseline", "middle");
            }
        });
    });

    // Limitar a 15 fechas si hay más de 30 puntos
    const showDateEveryNPoints = normalizedData.length > 30 ? Math.floor(normalizedData.length / 25) : 1;

    // Mostrar las fechas distribuidas uniformemente
    const displayedDates = [];
    for (let i = 0; i < normalizedData.length; i++) {
        if (i % showDateEveryNPoints === 0) {
            const currentDate = normalizedData[i].date;
            displayedDates.push({ date: currentDate, index: i });

            // Dibujar líneas de separación solo si la diferencia entre las fechas es mayor a un día
            if (i > 0) {
                const prevDate = normalizedData[i - 1].date;
                if ((currentDate - prevDate) > 24 * 60 * 60 * 1000) {
                    svg.append("line")
                        .attr("x1", x(i))
                        .attr("x2", x(i))
                        .attr("y1", 0)
                        .attr("y2", height)
                        .attr("stroke", "black")
                        .attr("stroke-dasharray", "4,4")
                        .attr("stroke-width", 1);
                }
            }
        }
    }

    // Mostrar las fechas seleccionadas
    displayedDates.forEach(({ date, index }) => {
        svg.append("text")
            .attr("x", x(index))
            .attr("y", height + 30)
            .text(d3.timeFormat("%Y-%m-%d")(date))
            .attr("fill", "black")
            .attr("font-size", "10px")
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-45 " + x(index) + "," + (height + 20) + ")");
    });

    const xAxis = d3.axisBottom(x)
        .ticks(d3.timeDay.every(1))
        .tickFormat(d3.timeFormat("%Y-%m-%d"))
        .tickSize(6);

    const yAxis = d3.axisLeft(y)
        .ticks(5)
        .tickSize(6);

    // Ejes X con rotación de 45 grados
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(xAxis)
        .selectAll("text")
        .attr("transform", "rotate(-45)")  // Rotar etiquetas de las fechas
        .style("text-anchor", "end");  // Alineación de las etiquetas rotadas

    svg.append("g")
        .call(yAxis);
}

