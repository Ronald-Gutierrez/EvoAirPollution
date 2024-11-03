// Desactivar selección de texto
document.addEventListener('selectstart', function (e) {
    e.preventDefault();
});

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
                avg.stationId = entries[0].stationId;
                avg.cityName = selectedCity;
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
    const startOffsetAngle = -40 * (Math.PI / 180);

    const svg = d3.select('#chart-view-radial')
                  .append('svg')
                  .attr('width', width)
                  .attr('height', height)
                  .append('g')
                  .attr('transform', `translate(${width / 2}, ${height / 2})`);

    const angleScale = d3.scaleLinear()
                         .domain([0, data.length])
                         .range([startOffsetAngle, 2 * Math.PI + startOffsetAngle]);

    const maxValues = attributes.map(attr => d3.max(data, d => d[attr]));
    const centralHoleRadius = 30;
    const ringWidth = (radius - centralHoleRadius) / attributes.length;

    attributes.forEach((attr, index) => {
        const radialScale = d3.scaleLinear()
                              .domain([0, maxValues[index]])
                              .range([centralHoleRadius + index * ringWidth, centralHoleRadius + (index + 1) * ringWidth]);

        svg.append("circle")
           .attr("cx", 0)
           .attr("cy", 0)
           .attr("r", radialScale(maxValues[index]))
           .attr("fill", "none")
           .attr("stroke", "#000")
           .attr("stroke-width", 1)
           .attr("stroke-dasharray", "3,3");

        const line = d3.lineRadial()
                      .angle((d, j) => angleScale(j))
                      .radius(d => radialScale(d[attr]) || 0);

        svg.append('path')
           .datum(data)
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

    let startAngle, endAngle;
    let selectionActive = false;
    let selectionPath;

    svg.on('mousedown', function(event) {
        event.preventDefault();
        const [mouseX, mouseY] = d3.pointer(event);
        startAngle = Math.atan2(-mouseY, mouseX) - startOffsetAngle;
        if (startAngle < 0) startAngle += 2 * Math.PI;
        selectionActive = true;

        if (selectionPath) {
            selectionPath.remove();
        }

        selectionPath = svg.append('path')
            .datum({})
            .attr('fill', 'rgba(128, 128, 128, 0.5)')
            .attr('d', d3.arc()
                .innerRadius(0)
                .outerRadius(radius)
                .startAngle(startAngle)
                .endAngle(startAngle));
    })
    .on('mousemove', function(event) {
        if (selectionActive) {
            const [mouseX, mouseY] = d3.pointer(event);
            endAngle = Math.atan2(-mouseY, mouseX) - startOffsetAngle;
            if (endAngle < 0) endAngle += 2 * Math.PI;

            if (endAngle >= startAngle) {
                selectionPath.attr('d', d3.arc()
                    .innerRadius(0)
                    .outerRadius(radius)
                    .startAngle(startAngle)
                    .endAngle(endAngle));
            } else {
                selectionPath.attr('d', d3.arc()
                    .innerRadius(0)
                    .outerRadius(radius)
                    .startAngle(endAngle)
                    .endAngle(startAngle));
            }
        }
    })
    .on('mouseup', function(event) {
        if (selectionActive) {
            selectionActive = false;

            const selectedRange = calculateDateRange(startAngle, endAngle, data);
            console.log(`Rango seleccionado: Desde ${selectedRange.firstDate} hasta ${selectedRange.lastDate}`);
            console.log(`Estación ID: ${selectedRange.stationId} - Nombre de la ciudad: ${selectedRange.cityName}`);
        }
    });

    function calculateDateRange(startAngle, endAngle, data) {
        const totalAngles = 2 * Math.PI;
        const totalSegments = data.length;

        const selectedStartSegment = Math.floor((startAngle / totalAngles) * totalSegments);
        const selectedEndSegment = Math.floor((endAngle / totalAngles) * totalSegments);

        const selectedData = data.slice(
            Math.min(selectedStartSegment, selectedEndSegment),
            Math.max(selectedStartSegment, selectedEndSegment) + 1
        );
        const firstDate = selectedData.length > 0 ? selectedData[0].date : null;
        const lastDate = selectedData.length > 0 ? selectedData[selectedData.length - 1].date : null;
        const stationId = selectedData.length > 0 ? selectedData[0].stationId : null;
        const cityName = selectedData.length > 0 ? selectedData[0].cityName : null;

        return { firstDate, lastDate, stationId, cityName };
    }
}

updateChart();
