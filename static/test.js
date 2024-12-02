
// GRAFICA PARA MI SERIE S TEMPORALES 
function updateTimeSeriesChart(selectedCity, contaminant, startDate, endDate, selectedDates = null) {
    currentContaminant = contaminant;

    const container = d3.select('#serie-temporal');

    const margin = { top: 20, right: 30, bottom: 60, left: 60 };
    const width = 820 - margin.left - margin.right;
    const height = 360 - margin.top - margin.bottom;

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

    // Límites diarios para cada contaminante
    const dailyLimits = {
        'PM2_5': 75,
        'PM10': 150,
        'CO': 4,
        'SO2': 150,
        'NO2': 80,
        'O3': 200
    };
     // Agregar la leyenda solo si no existe ya
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
        const legend = container.insert('div', ':first-child')  // Insertar antes del primer hijo
            .attr('class', 'legend-pca')
            .style('display', 'flex')
            .style('justify-content', 'center')
            .style('margin-bottom', '10px')  // Aumentar el margen para dar más espacio
            .style('margin-left', '240px')  // Aumentar el margen para dar más espacio

            .style('font-family', 'Arial, sans-serif')  // Establecer una fuente limpia
            .style('font-weight', 'bold');  // Hacer el texto en negrita

        legendData.forEach(item => {
            legend.append('div')
                .attr('class', 'legend-item-pca')
                .style('background-color', item.color)
                .style('padding', '6px 12px')  // Reducir el padding para hacer los items más compactos
                .style('margin', '0 2px')  // Aumentar el margen entre los elementos
                .style('border-radius', '10px')  // Bordes redondeados para un diseño más suave
                .style('color', 'black')  // Asegurar que el texto sea blanco para que resalte sobre el color de fondo
                .style('text-align', 'center')  // Centrar el texto
                .text(item.label);
        });
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

    // Crear el tooltip
    const tooltip = container.append('div')
        .attr('class', 'tooltip')
        .style('position', 'absolute')
        .style('background-color', '#fff')
        .style('border', '1px solid #ccc')
        .style('padding', '8px')
        .style('border-radius', '4px')
        .style('opacity', 0);

    d3.csv(`data/${selectedCity}`).then(data => {
        let filteredData;

        if (selectedDates && selectedDates.length > 0) {
            // Filtrar datos según las fechas seleccionadas sin aumentar un día
            const selectedDateSet = new Set(selectedDates);
            filteredData = data.filter(d => {
                const date = `${d.year}-${d.month}-${d.day}`;
                return selectedDateSet.has(date);
            });
        } else {
            // Filtrar datos usando el rango de fechas
            let internalStartDate = startDate;
            let internalEndDate = endDate;

            if (!internalStartDate || !internalEndDate) {
                const dates = data.map(d => new Date(`${d.year}-${d.month}-${d.day}`));
                internalStartDate = d3.min(dates).toISOString().split('T')[0];
                internalEndDate = d3.max(dates).toISOString().split('T')[0];
            }

            filteredData = data.filter(d => {
                const date = new Date(`${d.year}-${d.month}-${d.day}`);
                return date >= new Date(internalStartDate) && date <= new Date(internalEndDate);
            });
        }

        filteredData = filteredData.map(d => ({
            date: new Date(`${d.year}-${d.month}-${d.day}`),
            value: +d[contaminant.replace('.', '_')]
        })).filter(d => !isNaN(d.value));

        const convertedData = filteredData.map(d => ({
            ...d,
            value: contaminant === 'CO' ? d.value / 1000 : d.value
        }));

        const averagedData = d3.groups(convertedData, d => d.date)
            .map(([date, values]) => ({
                date: date,
                value: d3.mean(values, d => d.value)
            }))
            .map(d => {
                const aqi = calculateIndividualAQI(contaminant, d.value);
                const category = aqi !== null ? getAQICategory(aqi) : null;
                const color = category ? aqiColors[category - 1] : meteorologicalColor;
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
            enter => enter.append('g')
                .attr('class', 'x-axis')
                .attr('transform', `translate(0, ${height})`)
                .call(xAxis),
            update => update.transition().duration(750).call(xAxis)
        )
        .selectAll("text") // Selecciona las etiquetas después de la actualización
        .attr("dx", "-0.8em")
        .attr("dy", "-0.2em")
        .style("text-anchor", "end")
        .attr("transform", "rotate(-45)"); // Asegura que todas estén rotadas a -45 grados
    

        svg.selectAll('.y-axis')
           .data([null])
           .join(
               enter => enter.append('g').attr('class', 'y-axis').call(yAxis),
               update => update.transition().duration(750).call(yAxis)
           );


        svg.select('.y-label')
        .text(`Nivel diario de ${contaminant}`)
        .style('font-size', '20px')
        .style('font-weight', 'bold')
        .attr('y', -margin.left + 20); // Ajusta el valor aquí para mover la etiqueta más abajo


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
                const [mouseX, mouseY] = d3.pointer(event, svg.node());
                const selectedCity = document.querySelector('#city-checkboxes input[type="radio"]:checked').value;
                const point = d3.select(this);
                point.transition().duration(200).attr('r', 10).style('stroke', 'cyan').style('stroke-width', 3);
            
                const tooltipWidth = tooltip.node().offsetWidth;
                const tooltipHeight = tooltip.node().offsetHeight;
                const maxX = width + margin.left - tooltipWidth;
                const maxY = height + margin.top - tooltipHeight;
                const limitedX = Math.min(mouseX + margin.left, maxX);
                const limitedY = Math.max(mouseY + margin.top - tooltipHeight - 10, margin.top);

                tooltip.transition().duration(200).style('opacity', 1);
                tooltip.html(`<strong>Ciudad:</strong> ${selectedCity.replace('Data_', '').replace('.csv', '')}<br>
                              <strong>Contaminante:</strong> ${currentContaminant}<br>
                              <strong>Fecha:</strong> ${d3.timeFormat("%d/%m/%Y")(d.date)}<br>
                              <strong>Concentración:</strong> ${d.value.toFixed(2)}<br>
                              <strong>AQI:</strong> ${d.aqi.toFixed(2)}`)
                       .style('left', `${limitedX}px`)
                       .style('top', `${limitedY}px`)
                       .style('color', 'black');
            })
            .on('mouseout', function() {
                const point = d3.select(this);
                point.transition().duration(200).attr('r', 5).style('stroke', 'none').style('stroke-width', 0);
                tooltip.transition().duration(200).style('opacity', 0);
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
                    .text(`Serie temporal por hora de ${currentContaminant} para el ${d3.timeFormat("%d-%m-%Y")(d.date)} `);
            
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
                    const isChecked = contaminant === currentContaminant;
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
                    const isCheckedmet = factor === currentContaminant;
            
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

        // Agregar línea límite diaria
        const limitValue = dailyLimits[contaminant];
        if (limitValue !== undefined) {
            svg.selectAll(".limit-line").remove(); // Eliminar cualquier línea límite existente
            
            svg.append("line")
               .attr("class", "limit-line")
               .attr("x1", 0)
               .attr("x2", width)
               .attr("y1", yScale(limitValue))
               .attr("y2", yScale(limitValue))
               .attr("stroke", "red")
               .attr("stroke-width", 1.5)
               .attr("stroke-dasharray", "5,5"); // Línea discontinua
        }

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

        // Filtrar datos según el rango de fechas seleccionado
        let filteredSeasons = [];
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);

            filteredSeasons = d3.timeDay.range(start, d3.timeDay.offset(end, 1)).map(date => {
                const season = getSeason(date.getMonth() + 1, date.getDate());
                return { date, season };
            });
        } else if (selectedDates && selectedDates.length > 0) {
            // Si hay fechas seleccionadas específicas
            filteredSeasons = selectedDates.map(date => {
                const dateObj = new Date(date);
                const season = getSeason(dateObj.getMonth() + 1, dateObj.getDate());
                return { date: dateObj, season };
            });
        }

        // Agrupar las fechas por temporada contigua
        const groupedSeasons = [];
        let currentSeason = null;
        let start = null;

        filteredSeasons.forEach(({ date, season }, index) => {
            if (season !== currentSeason) {
                if (currentSeason) {
                    groupedSeasons.push({ 
                        season: currentSeason, 
                        start, 
                        end: filteredSeasons[index - 1].date 
                    });
                }
                currentSeason = season;
                start = date;
            }
        });

        // Agregar la última temporada
        if (currentSeason && filteredSeasons.length > 0) {
            groupedSeasons.push({ 
                season: currentSeason, 
                start, 
                end: filteredSeasons[filteredSeasons.length - 1].date 
            });
        }

        // Dibujar rectángulos de fondo para las estaciones
        const seasonRects = svg.selectAll('.season-rect')
        .data(groupedSeasons);

            seasonRects.enter()
            .append('rect')
            .attr('class', 'season-rect')
            .attr('x', d => xScale(d.start))
            .attr('y', 0)
            .attr('width', d => xScale(d.end) - xScale(d.start))
            .attr('height', height)
            .attr('fill', d => seasonColors[d.season])
            .attr('opacity', 0.2) // Para no bloquear la visibilidad
            .lower() // Colocar los rectángulos detrás de los demás elementos
            .merge(seasonRects)
            .transition()
            .duration(750)
            .attr('x', d => xScale(d.start))
            .attr('width', d => xScale(d.end) - xScale(d.start))
            .attr('fill', d => seasonColors[d.season]);

            seasonRects.exit().remove();
    });
}




// Añadir evento de clic en cada punto del gráfico
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
        .text(`Serie temporal por hora de ${currentContaminant} para el ${d3.timeFormat("%d-%m-%Y")(d.date)} `);

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
        const isChecked = contaminant === currentContaminant;
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
        const isCheckedmet = factor === currentContaminant;

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

    // Función para actualizar el gráfico con los datos filtrados
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
});



// Función para dibujar las líneas con el color correspondiente
function drawLine(chartSvg, points, season) {
    chartSvg.append('path')
        .data([points])  // Aseguramos de pasar un array de puntos
        .attr('class', 'line')
        .attr('d', d3.line().x(d => d.x).y(d => d.y)(points))  // Usamos 'points' en lugar de 'd'
        .attr('fill', 'none')
        .attr('stroke', seasonColors[season])  // Usar el color de la estación
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
                .text(`Season: ${season}`);
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