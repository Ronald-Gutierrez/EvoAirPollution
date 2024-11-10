
function updateTimeSeriesChart(selectedCity, contaminant, startDate, endDate) {
    currentContaminant = contaminant; // Asignar el contaminante actual

    const container = d3.select('#serie-temporal');

    const margin = { top: 20, right: 30, bottom: 60, left: 60 };
    const width = 1020 - margin.left - margin.right;
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
