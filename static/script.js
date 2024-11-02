// Variable para almacenar la última InfoWindow abierta
let lastInfoWindow = null;

// Función para inicializar el mapa de Beijing con Google Maps
function initMap() {
    const beijing = { lat: 40.3, lng: 116.4074 }; // Coordenadas de Beijing
    
    // Definir estilos personalizados para ocultar carreteras y otros elementos
    const mapStyles = [
        { featureType: "road", elementType: "geometry", stylers: [{ visibility: "on" }] },
        { featureType: "road", elementType: "labels", stylers: [{ visibility: "off" }] }, // Ocultar etiquetas de carreteras
        { featureType: "transit", elementType: "geometry", stylers: [{ visibility: "on" }] },
        { featureType: "poi", elementType: "all", stylers: [{ visibility: "on" }] },
        { featureType: "landscape", elementType: "labels", stylers: [{ visibility: "on" }] },
        { featureType: "administrative", elementType: "labels", stylers: [{ visibility: "on" }] },
        { featureType: "water", elementType: "labels", stylers: [{ visibility: "on" }] }
    ];

    const map = new google.maps.Map(document.getElementById("map"), {
        zoom: 8,
        center: beijing,
        styles: mapStyles, // Aplicar los estilos personalizados
        disableDefaultUI: false // Deshabilitar controles del mapa
    });

    // Crear un objeto para almacenar las estaciones por ciudad
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
    fetch('data/position_station.csv')
        .then(response => response.text())
        .then(csvData => {
            const stations = parseCSV(csvData);
            stations.forEach(station => {
                const position = { lat: parseFloat(station.latitude), lng: parseFloat(station.longitude) };
                const marker = new google.maps.Marker({
                    position: position,
                    map: map,
                    title: station.stationId, // Título del marcador
                    icon: {
                        url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png", // Icono de banderita
                        scaledSize: new google.maps.Size(20, 20) // Ajusta el tamaño de la banderita aquí
                    }
                });

                // Crear un InfoWindow para mostrar información
                const infoWindow = new google.maps.InfoWindow({
                    content: `<div style="font-family: Arial, sans-serif; font-size: 14px; color: #333; padding: 10px; max-width: 200px; line-height: 1.5; border-radius: 5px;">
                                <strong style="font-size: 16px; color: #1a73e8;">${station.stationId}</strong><br>
                                <p style="margin-top: 5px;">${station.Notes}</p>
                            </div>`
                });

                // Agregar un evento de clic al marcador
                marker.addListener("click", () => {
                    openInfoWindow(map, marker, infoWindow); // Abrir InfoWindow
                });

                // Asignar la estación al objeto de estaciones por ciudad
                if (!stationsByCity[station.city]) {
                    stationsByCity[station.city] = [];
                }
                stationsByCity[station.city].push({ marker, infoWindow });
            });

            // Guardar el objeto para uso posterior
            map.stationsByCity = stationsByCity;
        })
        .catch(error => {
            console.error("Error al cargar el archivo CSV:", error);
        });

    // Agregar evento de cambio para los radio buttons de selección de ciudad
    const cityCheckboxes = document.querySelectorAll('input[name="city"]');
    cityCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            // Cerrar la última InfoWindow si está abierta
            if (lastInfoWindow) {
                lastInfoWindow.close();
            }

            const selectedCity = checkbox.value; // Obtener el valor de la ciudad seleccionada
            const stations = map.stationsByCity[selectedCity];

            if (stations) {
                // Abrir la InfoWindow de la primera estación de la ciudad seleccionada
                const { marker, infoWindow } = stations[0];
                openInfoWindow(map, marker, infoWindow); // Abrir InfoWindow
            }

            const lat = parseFloat(checkbox.getAttribute('data-lat'));
            const lng = parseFloat(checkbox.getAttribute('data-lng'));
            const cityPosition = { lat: lat, lng: lng };
            map.setCenter(cityPosition); // Centrar el mapa en la ciudad seleccionada
            map.setZoom(12); // Establecer el nivel de zoom deseado para la ciudad
        });
    });
}

// Función para abrir InfoWindow y manejar el cierre de la anterior
function openInfoWindow(map, marker, infoWindow) {
    // Cerrar la última InfoWindow si está abierta
    if (lastInfoWindow) {
        lastInfoWindow.close();
    }

    infoWindow.open(map, marker); // Abrir InfoWindow
    lastInfoWindow = infoWindow; // Guardar la referencia de la InfoWindow abierta
    map.setZoom(12); // Establecer el nivel de zoom deseado
    map.setCenter(marker.getPosition()); // Centrar el mapa en la estación
}

// Función para parsear CSV a objetos
function parseCSV(data) {
    const lines = data.split('\n');
    const result = [];
    const headers = lines[0].split(','); // Asumimos que la primera línea contiene los encabezados

    for (let i = 1; i < lines.length; i++) {
        const obj = {};
        const currentline = lines[i].split(',');
        if (currentline.length === headers.length) {
            headers.forEach((header, index) => {
                obj[header.trim()] = currentline[index].trim();
            });
            result.push(obj);
        }
    }
    return result;
}


/////PARA MI GRAFICA RADIA/////////////////
// Escuchar cambios en los checkboxes de ciudad
document.querySelectorAll('#city-checkboxes input[type="radio"]').forEach(checkbox => {
    checkbox.addEventListener('change', updateChart);
});

// Escuchar cambios en los checkboxes de atributos
document.querySelectorAll('.options-chek input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', updateChart);
});

// Escuchar cambios en el rango de fechas
document.getElementById('fecha-inicio').addEventListener('change', updateChart);
document.getElementById('fecha-fin').addEventListener('change', updateChart);

document.getElementById('visualizar-todo').addEventListener('change', function () {
    const isChecked = this.checked;
    document.getElementById('fecha-inicio').disabled = isChecked;
    document.getElementById('fecha-fin').disabled = isChecked;
    updateChart();
    document.getElementById('fecha-rango').innerText = isChecked ? "Visualizando todos los datos." : "";
});

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
                return avg;
            });

            drawRadialChart(parsedData, selectedAttributes);
            if (startDate && endDate) {
                document.getElementById('fecha-rango').innerText = `Rango de fechas: ${startDate} a ${endDate}`;
            } else if (visualizarTodo) {
                document.getElementById('fecha-rango').innerText = "Visualizando todos los datos.";
            }
        });
    });
}

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

    attributes.forEach((attr, index) => {
        const radialScale = d3.scaleLinear().domain([0, maxValues[index]])
                              .range([centralHoleRadius + index * ringWidth, centralHoleRadius + (index + 1) * ringWidth]);

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

        // Agregar etiqueta del atributo sobre el anillo
        svg.append('text')
           .attr('x', 0)
           .attr('y', -radialScale(maxValues[index]) - 10)  // Mover la etiqueta un poco más arriba del anillo
           .attr('dy', '-0.5em')
           .attr('text-anchor', 'middle')
           .attr('font-size', '14px')  // Tamaño de fuente más grande
           .attr('font-weight', 'bold')  // Texto en negrita
           .text(attr);
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


updateChart();
