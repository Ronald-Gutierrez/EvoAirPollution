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
                    selectCityCheckbox(station.stationId);
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







//////////////////////
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
        const isCheckedmet = factor === currentContaminant;

        meteorologicalChecks.append('label')
            .style('margin-right', '10px')
            .style('color', attributeColors[factor]) // Establecer el color del texto
            .text(factor)
            .append('input')
            .attr('type', 'checkbox')
            .attr('value', factor)
            .property('checked', isCheckedmet)  // Puedes preseleccionar según sea necesario
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

            // Completar horas faltantes con la media
            selectedContaminants.forEach(contaminant => {
                let consecutiveNaNs = 0;
                for (let i = 0; i < selectedDayData.length; i++) {
                    if (isNaN(selectedDayData[i][contaminant])) {
                        consecutiveNaNs++;
                        if (consecutiveNaNs <= 3) {
                            // Si hay entre 1 y 3 horas consecutivas faltantes, completar con la media
                            const prevValue = selectedDayData[i - 1]?.[contaminant];
                            const nextValue = selectedDayData[i + 1]?.[contaminant];
                            if (!isNaN(prevValue) && !isNaN(nextValue)) {
                                selectedDayData[i][contaminant] = (prevValue + nextValue) / 2;
                            }
                        }
                    } else {
                        consecutiveNaNs = 0;  // Reiniciar el contador si el valor no es NaN
                    }
                }
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

            // Escalas y ejes con soporte para valores negativos
            const yMax = d3.max(selectedDayData, d => Math.max(...Object.values(d).filter(val => !isNaN(val))));
            const yMin = d3.min(selectedDayData, d => Math.min(...Object.values(d).filter(val => !isNaN(val))));
            const yMiniScale = d3.scaleLinear()
                .domain([yMin, yMax])
                .range([miniHeight, 0]);

            const xMiniScale = d3.scaleLinear()
                .domain([0, 23])
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