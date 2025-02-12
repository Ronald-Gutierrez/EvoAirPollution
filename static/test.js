// Variable para almacenar la última InfoWindow abierta
let lastInfoWindow = null;

function createArrowIcon(direction) {
    return {
        path: "M0,-1 L-2,-3 L-1,-3 L-1,-8 L1,-8 L1,-3 L2,-3 Z",
        fillColor: "#FF0000",
        fillOpacity: 1,
        strokeColor: "#FFFFF", // Color del borde (debe coincidir con el color de la flecha si deseas que sea del mismo color)
        strokeOpacity: 1, // Opacidad del borde
        strokeWeight: 1, // Grosor del borde (ajustar según lo necesites)
        scale: 3,
        rotation: direction + 180, // Rotación según la dirección del viento
        anchor: new google.maps.Point(0, -4), // Ajusta el punto de anclaje de la flecha
    };
}

function CallupdateWindDirectionAndMarkers(SelectDate){
    console.log(SelectDate);

}

// Función para actualizar los datos y los marcadores
function updateWindDirectionAndMarkers(station, map, position, iconUrl, selectedDate = null) {
    // Definir las fechas predeterminadas
    const fechaInicioPredeterminada = new Date(2013, 2, 1); 
    const fechaFinPredeterminada = new Date(2017, 1, 28);

    // Verificar el estado del checkbox
    const visualizarTodo = document.getElementById('visualizar-todo').checked;

    // Si se proporciona una fecha seleccionada, usarla para sobrescribir el rango de fechas
    let fechaInicio, fechaFin;
    if (selectedDate) {
        fechaInicio = new Date(selectedDate);
        fechaFin = new Date(selectedDate);
    } else {
        fechaInicio = visualizarTodo 
            ? fechaInicioPredeterminada 
            : new Date(document.getElementById('fecha-inicio').value);
        fechaFin = visualizarTodo 
            ? fechaFinPredeterminada 
            : new Date(document.getElementById('fecha-fin').value);
    }

    // console.log('Fecha Inicio: ', fechaInicio);
    // console.log('Fecha Fin: ', fechaFin);

    // Filtrar los datos de la estación para el rango de fechas seleccionado
    const filteredData = station.data.filter(entry => {
        const entryDate = new Date(entry.year, entry.month - 1, entry.day);
        return entryDate >= fechaInicio && entryDate <= fechaFin;
    });

    // Calcular el promedio de la dirección del viento
    let totalWD = 0;
    let count = 0;
    filteredData.forEach(entry => {
        const wd = parseFloat(entry.wd);
        if (!isNaN(wd)) {
            totalWD += wd;
            count++;
        }
    });

    const averageWD = count > 0 ? totalWD / count : 0; // Promedio de la dirección del viento
    // console.log('Promedio de Dirección del Viento: ', averageWD);

    // Eliminar los marcadores previos de la estación (si existen)
    if (station.marker) {
        station.marker.setMap(null);
        station.arrowMarker.setMap(null);
    }

    // Crear un nuevo marcador para la estación
    const marker = new google.maps.Marker({
        position: position,
        map: map,
        icon: {
            url: iconUrl,
            scaledSize: new google.maps.Size(25, 25)
        }
    });

    // Crear el marcador de la flecha
    const arrowPosition = {
        lat: position.lat + 0.03, // Sin cambiar latitud
        lng: position.lng - 0.0, // Ajuste en la longitud
    };

    const arrowMarker = new google.maps.Marker({
        position: arrowPosition,
        map: map,
        icon: createArrowIcon(averageWD), // Usamos el promedio calculado
    });

    // Asociar eventos al nuevo marcador
    const infoWindow = new google.maps.InfoWindow();
    marker.addListener("click", () => {
        updateInfoWindowContent(infoWindow, station, map, marker);
    });

    // Asociar eventos de tooltip al nuevo marcador
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

    marker.addListener("mouseover", (e) => {
        tooltipDiv.style.display = 'block';
        tooltipDiv.innerHTML = `<strong>${station.stationId.charAt(0).toUpperCase() + station.stationId.slice(1)}</strong>`;
        tooltipDiv.style.left = `${e.domEvent.pageX + 10}px`;
        tooltipDiv.style.top = `${e.domEvent.pageY + 10}px`;
    });

    marker.addListener("mousemove", (e) => {
        tooltipDiv.style.left = `${e.domEvent.pageX + 10}px`;
        tooltipDiv.style.top = `${e.domEvent.pageY + 10}px`;
    });

    marker.addListener("mouseout", () => {
        tooltipDiv.style.display = 'none';
    });

    // Asociar los nuevos marcadores con la estación
    station.marker = marker;
    station.arrowMarker = arrowMarker;
    station.infoWindow = infoWindow; // Guardar referencia al InfoWindow
}





// Función para inicializar el mapa de Beijing con Google Maps
function initMap() {
    // Establecer fechas aleatorias por defecto
    const randomDate = new Date(2013, 2, 1);  // Fecha inicial
    const endDate = new Date(2017, 1, 28);   // Fecha final
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
        const lines = csvData.split('\n');
        const headers = lines[0].split(',');
        const stationIdIndex = headers.indexOf('stationId');
        const latitudeIndex = headers.indexOf('latitude');
        const longitudeIndex = headers.indexOf('longitude');
        const yearIndex = headers.indexOf('year');
        const monthIndex = headers.indexOf('month');
        const dayIndex = headers.indexOf('day');
        const aqiIndex = headers.indexOf('AQI');
        const notesIndex = headers.indexOf('Notes');

        // Convertir CSV a array de objetos
        const data = lines.slice(1).map(line => {
            const values = line.split(',');
            return {
                stationId: values[stationIdIndex],
                latitude: parseFloat(values[latitudeIndex]),
                longitude: parseFloat(values[longitudeIndex]),
                year: parseInt(values[yearIndex]),
                month: parseInt(values[monthIndex]),
                day: parseInt(values[dayIndex]),
                AQI: parseFloat(values[aqiIndex]),
                Notes: values[notesIndex]
            };
        }).filter(row => !isNaN(row.AQI));

        const stations = parseCSV(csvData);
        const markers = {}; // Objeto para almacenar los marcadores

        // Función para actualizar AQIs y marcadores
        const updateAQIAndMarkers = () => {
            let fechaInicio = new Date(2013, 2, 1);
            let fechaFin = new Date(2017, 1, 28);

            if (document.getElementById('visualizar-todo').checked) {
                fechaInicio = new Date(2013, 2, 1);
                fechaFin = new Date(2017, 1, 28);
            } else {
                const userFechaInicio = new Date(document.getElementById('fecha-inicio').value);
                const userFechaFin = new Date(document.getElementById('fecha-fin').value);
                if (!isNaN(userFechaInicio) && !isNaN(userFechaFin)) {
                    fechaInicio = userFechaInicio;
                    fechaFin = userFechaFin;
                }
            }

            // Filtrar datos en el rango de fechas
            const filteredData = data.filter(row => {
                const rowDate = new Date(row.year, row.month - 1, row.day);
                return rowDate >= fechaInicio && rowDate <= fechaFin;
            });

            // Recalcular AQI promedio por estación
            const aqiByStation = {};
            filteredData.forEach(row => {
                if (!aqiByStation[row.stationId]) {
                    aqiByStation[row.stationId] = { sum: 0, count: 0 };
                }
                aqiByStation[row.stationId].sum += row.AQI;
                aqiByStation[row.stationId].count += 1;
            });

            // Actualizar o crear marcadores
            stations.forEach(station => {
                const position = { lat: parseFloat(station.latitude), lng: parseFloat(station.longitude) };
                const stationAQI = aqiByStation[station.stationId];
                const averageAQI = stationAQI && stationAQI.count > 0 ? (stationAQI.sum / stationAQI.count).toFixed(2) : 0;
                const iconUrl = createCustomIcon(station.Notes, parseFloat(averageAQI));

                if (markers[station.stationId]) {
                    markers[station.stationId].setIcon({
                        url: iconUrl,
                        scaledSize: new google.maps.Size(25, 25)
                    });
                } else {
                    const marker = new google.maps.Marker({
                        position: position,
                        map: map,
                        icon: {
                            url: iconUrl,
                            scaledSize: new google.maps.Size(25, 25)
                        }
                    });

                    const infoWindow = new google.maps.InfoWindow();
                    marker.addListener("click", () => {
                        updateInfoWindowContent(infoWindow, station, map, marker);
                    });

                    markers[station.stationId] = marker; // Guardar el marcador en el objeto
                }
            });
        };

        // Agregar eventos para actualizar al cambiar fechas
        document.getElementById('fecha-inicio').addEventListener('change', updateAQIAndMarkers);
        document.getElementById('fecha-fin').addEventListener('change', updateAQIAndMarkers);
        document.getElementById('visualizar-todo').addEventListener('change', updateAQIAndMarkers);

        // Cargar AQIs y marcadores al inicio
        updateAQIAndMarkers();
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


function getWindDirectionText(degrees) {
    if (degrees >= 337.5 || degrees < 22.5) return "N (North)";
    if (degrees >= 22.5 && degrees < 45) return "NNE (North-Northeast)";
    if (degrees >= 45 && degrees < 67.5) return "NE (Northeast)";
    if (degrees >= 67.5 && degrees < 90) return "ENE (East-Northeast)";
    if (degrees >= 90 && degrees < 112.5) return "E (East)";
    if (degrees >= 112.5 && degrees < 135) return "ESE (East-Southeast)";
    if (degrees >= 135 && degrees < 157.5) return "SE (Southeast)";
    if (degrees >= 157.5 && degrees < 180) return "SSE (South-Southeast)";
    if (degrees >= 180 && degrees < 202.5) return "S (South)";
    if (degrees >= 202.5 && degrees < 225) return "SSW (South-Southwest)";
    if (degrees >= 225 && degrees < 247.5) return "SW (Southwest)";
    if (degrees >= 247.5 && degrees < 270) return "WSW (West-Southwest)";
    if (degrees >= 270 && degrees < 292.5) return "W (West)";
    if (degrees >= 292.5 && degrees < 315) return "WNW (West-Northwest)";
    if (degrees >= 315 && degrees < 337.5) return "NW (Northwest)";
    return "NNW (North-Northwest)";
}

function updateInfoWindowContent(infoWindow, station, map, marker) {
    // Definir las fechas predeterminadas
    const fechaInicioPredeterminada = new Date(2013, 2, 1); 
    const fechaFinPredeterminada = new Date(2017, 1, 28);

    // Verificar el estado del checkbox
    const visualizarTodo = document.getElementById('visualizar-todo').checked;

    // Obtener las fechas seleccionadas o las predeterminadas
    const fechaInicio = visualizarTodo 
        ? fechaInicioPredeterminada 
        : new Date(document.getElementById('fecha-inicio').value);
    const fechaFin = visualizarTodo 
        ? fechaFinPredeterminada 
        : new Date(document.getElementById('fecha-fin').value);

    // Ajustar las fechas (si es necesario)
    fechaInicio.setDate(fechaInicio.getDate() + 1);
    fechaFin.setDate(fechaFin.getDate());

    // Calcular los promedios
    const { averageAQI, averageWSPM, averageWD } = calculateAverages(
        station, 
        fechaInicio.toISOString().split('T')[0], 
        fechaFin.toISOString().split('T')[0]
    );

    // Convertir la dirección del viento en grados a formato de texto
    const windDirectionText = getWindDirectionText(averageWD);
    
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
            <strong>Dirección del viento:</strong> ${averageWD}° (${windDirectionText})
        </p>
        <p style="margin: 3px 0;"><strong>Zona:</strong> ${station.Notes}</p>
        <p style="margin: 3px 0;"><strong>Fecha Inicio:</strong> ${formatDate(fechaInicio)}</p>
        <p style="margin: 3px 0;"><strong>Fecha Fin:</strong> ${formatDate(fechaFin)}</p>
    </div>`;
    ColorAqiglobal = averageAQI;
    selectCityCheckbox(station.stationId);
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

function createCustomIcon(category, averageAQI) {
    const color = averageAQI >= 0 && averageAQI <= 1.5 ? '#00e400' :
                  averageAQI > 1.5 && averageAQI <= 2.5 ? '#ff0' :
                  averageAQI > 2.5 && averageAQI <= 3.5 ? '#ff7e00' :
                  averageAQI > 3.5 && averageAQI <= 4.5 ? '#f00' :
                  averageAQI > 4.5 && averageAQI <= 5 ? '#99004c' :
                  '#7e0023';

    const svg = d3.create("svg")
        .attr("xmlns", "http://www.w3.org/2000/svg")
        .attr("viewBox", "0 0 100 100")
        .attr("width", "100")
        .attr("height", "100");

    if (category === "Urban") {
        svg.append("polygon")
            .attr("points", "50,20 75,80 25,80")
            .attr("fill", color)
            .attr("stroke", "black")
            .attr("stroke-width", 3);
    } else if (category === "Rural") {
        svg.append("rect")
            .attr("x", "20")
            .attr("y", "20")
            .attr("width", "40")
            .attr("height", "40")
            .attr("fill", color)
            .attr("stroke", "black")
            .attr("stroke-width", 3);
    } else if (category === "Cross Reference") {
        svg.append("polygon")
            .attr("points", "50,15 61,40 87,40 67,60 74,85 50,70 26,85 33,60 13,40 39,40")
            .attr("fill", color)
            .attr("stroke", "black")
            .attr("stroke-width", 3);
    }

    return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg.node().outerHTML);
}

// Escuchar cambios en el rango de fechas
document.getElementById('fecha-inicio').addEventListener('change', updateStationInfoWindows);
document.getElementById('fecha-fin').addEventListener('change', updateStationInfoWindows);
document.getElementById('visualizar-todo').addEventListener('change', updateStationInfoWindows);


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
