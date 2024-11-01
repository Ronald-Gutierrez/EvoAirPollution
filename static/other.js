// Función para inicializar el mapa de Beijing con Google Maps
function initMap() {
    const beijing = { lat: 40.3, lng: 116.4074 }; // Coordenadas de Beijing
    const map = new google.maps.Map(document.getElementById("map"), {
        zoom: 8,
        center: beijing,
    });

    fetch('map/beijing.json')
        .then(response => response.json())
        .then(data => {
            data.features.forEach(feature => {
                const district = new google.maps.Polygon({
                    paths: feature.geometry.coordinates[0].map(coord => ({ lat: coord[1], lng: coord[0] })),
                    strokeColor: "#000000",
                    strokeOpacity: 0.5,
                    strokeWeight: 1,
                    fillColor: "#000000",
                    fillOpacity: 0.1,
                });
                district.setMap(map);
            });
        })
        .catch(error => {
            console.error("Error al cargar el GeoJSON:", error);
        });
}

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
    const maxValues = attributes.map(attr => d3.max(data, d => Math.abs(d[attr]))); // Usar valor absoluto
    const centralHoleRadius = 30;
    const ringWidth = (radius - centralHoleRadius) / attributes.length;

    attributes.forEach((attr, index) => {
        const radialScale = d3.scaleLinear()
            .domain([-d3.max(data, d => Math.abs(d[attr])), d3.max(data, d => Math.abs(d[attr]))]) // Dominar con valores negativos
            .range([centralHoleRadius + index * ringWidth, centralHoleRadius + (index + 1) * ringWidth]);

        svg.append("circle").attr("cx", 0).attr("cy", 0)
           .attr("r", radialScale(maxValues[index])).attr("fill", "none")
           .attr("stroke", "#000").attr("stroke-width", 1)
           .attr("stroke-dasharray", "3,3");

        const line = d3.lineRadial()
            .angle((d, j) => angleScale(j))
            .radius(d => radialScale(Math.abs(d[attr]))); // Usar valor absoluto

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
