// Función para inicializar el mapa de Beijing con Google Maps
function initMap() {
    const beijing = { lat: 40.3, lng: 116.4074 }; // Coordenadas de Beijing
    const map = new google.maps.Map(document.getElementById("map"), {
        zoom: 8,
        center: beijing,
    });

    // Cargar el archivo GeoJSON
    fetch('map/beijing.json')
        .then(response => response.json())
        .then(data => {
            // Dibujar los límites de los distritos en el mapa
            data.features.forEach(feature => {
                const district = new google.maps.Polygon({
                    paths: feature.geometry.coordinates[0].map(coord => ({ lat: coord[1], lng: coord[0] })),
                    strokeColor: "#000000", // Color del borde
                    strokeOpacity: 0.5,
                    strokeWeight: 1,
                    fillColor: "#000000", // Color de relleno
                    fillOpacity: 0.1,
                });
                district.setMap(map);
            });
        })
        .catch(error => {
            console.error("Error al cargar el GeoJSON:", error);
        });
}

// Escuchar cambios en el selector de ciudad
document.getElementById('city').addEventListener('change', updateChart);

// Escuchar cambios en los checkboxes de atributos
document.querySelectorAll('.options-chek input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', updateChart);
});

// Escuchar cambios en el rango de fechas
document.getElementById('fecha-inicio').addEventListener('change', updateChart);
document.getElementById('fecha-fin').addEventListener('change', updateChart);

// Escuchar cambios en el checkbox de "Visualizar Todo"
document.getElementById('visualizar-todo').addEventListener('change', function () {
    const isChecked = this.checked;
    document.getElementById('fecha-inicio').disabled = isChecked;
    document.getElementById('fecha-fin').disabled = isChecked;

    // Actualizar gráfico para visualizar todo
    updateChart(); // Actualizar gráfico automáticamente al cambiar este checkbox

    // Mostrar mensaje adecuado
    if (isChecked) {
        document.getElementById('fecha-rango').innerText = "Visualizando todos los datos.";
    } else {
        document.getElementById('fecha-rango').innerText = ""; // Limpiar mensaje
    }
});

// Función para cargar y procesar los datos
function updateChart() {
    const selectedCity = document.getElementById('city').value;
    const selectedAttributes = Array.from(document.querySelectorAll('.options-chek input[type="checkbox"]:checked'))
                                   .map(cb => cb.value);
    
    // Obtener fechas del rango
    const startDate = document.getElementById('fecha-inicio').value;
    const endDate = document.getElementById('fecha-fin').value;

    // Verificar si se seleccionó una ciudad y si hay atributos seleccionados
    if (!selectedCity || selectedAttributes.length === 0) return;

    // Cargar datos del archivo CSV seleccionado
    d3.csv(`data/${selectedCity}`).then(data => {
        // Verificar si "Visualizar Todo" está marcado
        const visualizarTodo = document.getElementById('visualizar-todo').checked;

        // Si se seleccionó "Visualizar Todo", no aplicar filtro de fecha
        if (!visualizarTodo && startDate && endDate) {
            data = data.filter(d => {
                const date = new Date(`${d.year}-${d.month}-${d.day}`);
                return date >= new Date(startDate) && date <= new Date(endDate);
            });
        }

        // Parsear la fecha y agrupar los datos por día
        const parsedData = d3.groups(data, d => `${d.year}-${d.month}-${d.day}`).map(([date, entries]) => {
            const avg = {};
            selectedAttributes.forEach(attr => {
                const values = entries.map(d => +d[attr.replace('.', '_')]).filter(v => !isNaN(v));
                avg[attr] = values.length > 0 ? d3.mean(values) : 0; // Si no hay valores, usar 0
            });
            avg.date = date;
            avg.year = entries[0].year; // Agregar el año para las etiquetas
            return avg;
        });

        drawRadialChart(parsedData, selectedAttributes);
        // Mostrar rango de fechas elegido
        if (startDate && endDate) {
            document.getElementById('fecha-rango').innerText = `Rango de fechas: ${startDate} a ${endDate}`;
        } else if (visualizarTodo) {
            document.getElementById('fecha-rango').innerText = "Visualizando todos los datos.";
        }
    });
}

// Función para dibujar el gráfico radial con guías circulares y etiquetas de años
function drawRadialChart(data, attributes) {
    d3.select('#chart-view-radial').html(""); // Limpiar el contenedor del gráfico
    const width = 450;
    const height = 450;
    const radius = Math.min(width, height) / 2 - 40;
    const svg = d3.select('#chart-view-radial')
                  .append('svg')
                  .attr('width', width)
                  .attr('height', height)
                  .append('g')
                  .attr('transform', `translate(${width / 2}, ${height / 2})`);

    const angleScale = d3.scaleLinear()
                         .domain([0, data.length])
                         .range([0, 2 * Math.PI]);

    // Agregar guías circulares
    const maxValues = attributes.map(attr => d3.max(data, d => d[attr]));
    const maxRadius = d3.max(maxValues);
    const centralHoleRadius = 30; // Aumentar el radio del hueco
    const radialScale = d3.scaleLinear().domain([0, maxRadius]).range([centralHoleRadius, radius]); // Ajustar para el hueco

    // Círculo central que representa el hueco, estilo punteado
    svg.append("circle")
       .attr("cx", 0)
       .attr("cy", 0)
       .attr("r", centralHoleRadius) // Radio del hueco
       .attr("fill", "none")
       .attr("stroke", "#000") // Color del borde del hueco
       .attr("stroke-width", 1.5)
       .attr("stroke-dasharray", "3,3"); // Estilo punteado

    [0.25, 0.5, 0.75, 1].forEach(level => {
        svg.append("circle")
           .attr("cx", 0)
           .attr("cy", 0)
           .attr("r", radialScale(maxRadius * level))
           .attr("fill", "none")
           .attr("stroke", "#000")
           .attr("stroke-dasharray", "3,3")
           .attr("stroke-width", 1);
    });

    attributes.forEach((attr, i) => {
        const line = d3.lineRadial()
                       .angle((d, j) => angleScale(j))
                       .radius(d => radialScale(d[attr]) || 0); // Manejar NaN

        svg.append('path')
           .datum(data)
           .attr('fill', 'none')
           .attr('stroke', d3.schemeCategory10[i % 10]) // Cambia el color de la línea
           .attr('stroke-width', 1.5)
           .attr('stroke-opacity', 0.6) // Ajustar la transparencia de las líneas
           .attr('d', line);
    });

    // Mostrar etiquetas de año en el borde del círculo
    const years = Array.from(new Set(data.map(d => d.year))); // Extraer años únicos
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

// Inicializar el gráfico al cargar la página
updateChart();
