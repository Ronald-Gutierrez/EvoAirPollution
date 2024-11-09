function updateTimeSeriesChart(selectedCity, contaminant, startDate, endDate) {
    currentContaminant = contaminant; // Asignar el contaminante actual

    const container = d3.select('#serie-temporal');

    const margin = { top: 20, right: 30, bottom: 60, left: 60 };
    const width = 1050 - margin.left - margin.right;
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
            
                tooltip.transition()
                       .duration(200)
                       .style('opacity', 1); // Hacer visible el tooltip
            
                tooltip.html(`<strong>Ciudad:</strong> ${selectedCity}<br>
                              <strong>Contaminante:</strong> ${contaminant}<br>
                              <strong>Fecha:</strong> ${d3.timeFormat("%Y-%m-%d")(d.date)}<br>
                              <strong>Concentración:</strong> ${d.value}<br>
                              <strong>AQI:</strong> ${d.aqi}`)
                       .style('left', (mouseX + margin.left) + 'px') // Centrado en la posición del mouse
                       .style('top', (mouseY + margin.top - tooltip.node().offsetHeight - 10) + 'px') // Encima del punto
                       .style('color', 'black'); // Color de texto en negro
            })
            
            
              .on('mouseout', function() {
                  tooltip.transition()
                         .duration(200)
                         .style('opacity', 0); // Hacer invisible el tooltip
              })


              
            //   .on('click', function(event, d) {
            //     // Eliminar la ventana flotante previa, si existe
            //     let floatingWindow = d3.select('#floating-window');
            //     if (!floatingWindow.empty()) {
            //         floatingWindow.remove();
            //     }
            
            //     // Crear nueva ventana flotante debajo del punto de clic
            //     const [mouseX, mouseY] = d3.pointer(event, svg.node());
            
            //     floatingWindow = container.append('div')
            //         .attr('id', 'floating-window')
            //         .style('position', 'absolute')
            //         .style('left', `${mouseX + margin.left}px`)
            //         .style('top', `${mouseY + margin.top + 10}px`)
            //         .style('background-color', '#fff')
            //         .style('border', '1px solid #ccc')
            //         .style('padding', '10px')
            //         .style('border-radius', '4px')
            //         .style('box-shadow', '0px 4px 8px rgba(0, 0, 0, 0.1)')
            //         .style('z-index', 1000);
            
            //     // Botón para cerrar la ventana
            //     floatingWindow.append('button')
            //         .text('X')
            //         .attr('class', 'close-button')
            //         .style('position', 'absolute')
            //         .style('top', '5px')
            //         .style('right', '5px')
            //         .style('border', 'none')
            //         .style('background', 'transparent')
            //         .style('font-size', '14px')
            //         .style('cursor', 'pointer')
            //         .on('click', () => floatingWindow.remove());
            
            //     // Cargar los datos horarios del día y contaminante seleccionado
            //     d3.csv(`data/${selectedCity}`).then(hourlyData => {
            //         const selectedDate = d3.timeFormat("%Y-%m-%d")(d.date);  // Formatear la fecha
            //         const selectedDayData = hourlyData
            //             .filter(row => {
            //                 const rowDate = new Date(`${row.year}-${row.month}-${row.day}`);
            //                 return rowDate.getTime() === d.date.getTime();
            //             })
            //             .map(row => ({
            //                 hour: +row.hour,
            //                 value: +row[contaminant.replace('.', '_')]  // Usar el contaminante seleccionado
            //             }))
            //             .filter(row => !isNaN(row.value));  // Filtrar valores inválidos
            
            //         // Crear o actualizar el SVG para la serie temporal horaria
            //         const miniMargin = { top: 20, right: 20, bottom: 40, left: 50 };
            //         const miniWidth = 400 - miniMargin.left - miniMargin.right;
            //         const miniHeight = 200 - miniMargin.top - miniMargin.bottom;
            
            //         // Elimina el SVG anterior, si existe, para actualizar con nuevos datos
            //         floatingWindow.select('svg').remove();
            
            //         const miniSvg = floatingWindow.append('svg')
            //             .attr('width', miniWidth + miniMargin.left + miniMargin.right)
            //             .attr('height', miniHeight + miniMargin.top + miniMargin.bottom)
            //             .append('g')
            //             .attr('transform', `translate(${miniMargin.left}, ${miniMargin.top})`);
            
            //         // Escalas y ejes
            //         const xMiniScale = d3.scaleLinear()
            //             .domain([0, 23])  // Rango de horas en el día
            //             .range([0, miniWidth]);
            //         const yMiniScale = d3.scaleLinear()
            //             .domain([0, d3.max(selectedDayData, d => d.value)])  // Escala basada en los valores de contaminante
            //             .range([miniHeight, 0]);
            
            //         const xMiniAxis = d3.axisBottom(xMiniScale).ticks(24).tickFormat(d => `${d}:00`);
            //         const yMiniAxis = d3.axisLeft(yMiniScale);
            
            //         miniSvg.append('g')
            //             .attr('transform', `translate(0, ${miniHeight})`)
            //             .call(xMiniAxis)
            //             .selectAll('text')
            //             .style('text-anchor', 'end')
            //             .attr('dx', '-0.5em')
            //             .attr('dy', '-0.2em')
            //             .attr('transform', 'rotate(-45)');
            
            //         miniSvg.append('g').call(yMiniAxis);
            
            //         // Etiquetas de ejes
            //         miniSvg.append('text')
            //             .attr('x', miniWidth / 2)
            //             .attr('y', miniHeight + miniMargin.bottom - 5)
            //             .attr('text-anchor', 'middle')
            //             .style('font-size', '12px')
            //             .text('Hora del día');
            
            //         miniSvg.append('text')
            //             .attr('x', -miniHeight / 2)
            //             .attr('y', -miniMargin.left + 10)
            //             .attr('transform', 'rotate(-90)')
            //             .attr('text-anchor', 'middle')
            //             .style('font-size', '12px')
            //             .text(`Concentración de ${contaminant}`);
            
            //         // Línea de la serie temporal horaria
            //         const line = d3.line()
            //             .x(d => xMiniScale(d.hour))
            //             .y(d => yMiniScale(d.value));
            
            //         miniSvg.append('path')
            //             .datum(selectedDayData)
            //             .attr('fill', 'none')
            //             .attr('stroke', '#007acc')
            //             .attr('stroke-width', 1.5)
            //             .attr('d', line);
            //     });
            // })
            // // .on('click', function(event, d) {
            // //     // Cargar los datos horarios del día seleccionado
            // //     d3.csv(data/${selectedCity}).then(hourlyData => {
            // //         const selectedDate = d3.timeFormat("%Y-%m-%d")(d.date);  // Formatear la fecha
            // //         const selectedDayData = hourlyData
            // //             .filter(row => new Date(${row.year}-${row.month}-${row.day}).getTime() === d.date.getTime())
            // //             .map(row => ({
            // //                 date: selectedDate, // Añadir la fecha en cada registro
            // //                 hour: row.hour,
            // //                 ...Object.fromEntries(Object.keys(row).map(key => [key.replace('.', '_'), row[key]]))
            // //             }));
            
            // //         // Mostrar la fecha en la consola
            // //         console.log(Datos horarios para el día: ${selectedDate});
            // //         console.table(selectedDayData, ['date', 'hour', 'city', 'contaminant', contaminant.replace('.', '_')]);
            // //     });
            // // })
            
            
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
