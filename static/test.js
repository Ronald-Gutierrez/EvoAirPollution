

function updateTimeSeriesChart(selectedCity, startDate, endDate, selectedDates = null) {
    const container = d3.select('#serie-temporal');

    const margin = { top: 20, right: 10, bottom: 60, left: 50 };
    const width = 830 - margin.left - margin.right;
    const height = 360 - margin.top - margin.bottom;

    // Añadir contenedor para el checkbox AQI si no existe
    let aqiCheckboxContainer = container.select('#aqi-checkbox-container');
    
    if (aqiCheckboxContainer.empty()) {
        aqiCheckboxContainer = container.append('div')
            .attr('id', 'aqi-checkbox-container')
            .style('position', 'absolute')
            .style('right', '2%') 
            .style('bottom', '87%') 
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('gap', '5px')
            .style('background-color', 'rgba(255, 255, 255, 0.8)')
            .style('padding', '5px')
            .style('border-radius', '4px');
        
        // Añadir el checkbox
        aqiCheckboxContainer.append('input')
            .attr('type', 'checkbox')
            .attr('id', 'aqi-size-toggle')
            .style('cursor', 'pointer');
    
        // Añadir la etiqueta
        aqiCheckboxContainer.append('label')
            .attr('for', 'aqi-size-toggle')
            .text('AQI')
            .style('font-weight', 'bold')
            .style('cursor', 'pointer')
            .style('user-select', 'none');
    }
    
    // Obtener el checkbox
    
    const aqiCheckbox = document.querySelector('#aqi-size-toggle');

    // Modificar el listener del checkbox AQI
    aqiCheckbox.addEventListener('change', function () {
        const isChecked = aqiCheckbox.checked;
        // console.log(isChecked ? 'AQI seleccionado' : 'AQI no seleccionado');
        
        // Actualizar el radio de todos los círculos existentes
        d3.select('#serie-temporal')
            .selectAll('circle')
            .transition()
            .duration(200)  // Añadir una transición suave de 200ms
            .attr('r', isChecked ? 4 : 0);
    });

    // Añadir contenedor para el checkbox LINE si no existe
    let lineCheckboxContainer = container.select('#line-checkbox-container');

    if (lineCheckboxContainer.empty()) {
        lineCheckboxContainer = container.append('div')
            .attr('id', 'line-checkbox-container')
            .style('position', 'absolute')
            .style('right', '1.35%') // Cambiado a porcentaje
            .style('bottom', '80%') // Ajustado para que esté debajo de AQI (modificado según sea necesario)
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('gap', '5px')
            .style('background-color', 'rgba(255, 255, 255, 0.8)')
            .style('padding', '5px')
            .style('border-radius', '4px');
        
        // Añadir el checkbox
        lineCheckboxContainer.append('input')
            .attr('type', 'checkbox')
            .attr('id', 'line-size-toggle')
            .style('cursor', 'pointer');
        
        // Añadir la etiqueta
        lineCheckboxContainer.append('label')
            .attr('for', 'line-size-toggle')
            .text('Line')
            .style('font-weight', 'bold')
            .style('cursor', 'pointer')
            .style('user-select', 'none');
    }

    // Obtener el checkbox
    const lineCheckbox = document.querySelector('#line-size-toggle');
    lineCheckbox.checked = true;

    lineCheckbox.addEventListener('change', function () {
        const isChecked = lineCheckbox.checked;
    
        // Seleccionar todas las líneas y cambiar su visibilidad
        d3.select('#serie-temporal')
            .selectAll('path.line') // Seleccionar las líneas con clase "line"
            .transition()
            .duration(200) // Transición suave
            .style('opacity', isChecked ? 0.7 : 0); // Mostrar u ocultar las líneas
    });
    

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

        let selectedAttributes = JSON.parse(localStorage.getItem('selectedAttributes')) || ["PM2_5"];

        const attributeColors = {
            'PM2_5': '#FF0000', 
            'PM10': '#FF9900', 
            'SO2': '#FFD700', 
            'NO2': '#d500f1', 
            'CO': '#00CED1', 
            'O3': '#0000FF', 
            'TEMP': '#008000', 
            'PRES': '#8B0000', 
            'DEWP': '#4B0082', 
            'RAIN': '#1E90FF'  
        };
        let checkboxContainer = container.select('#checkbox-container');
        if (checkboxContainer.empty()) {
            checkboxContainer = container.append('div')
                .attr('id', 'checkbox-container')
                .style('display', 'flex')
                .style('gap', '10px')
                .style('flex-wrap', 'wrap')
                .style('font-weight', 'bold') 
                .style('margin', '30px 0 10px 50px');
        } else {
            checkboxContainer.selectAll('*').remove();
        }
        
        checkboxContainer.selectAll('div')
            .data(attributes)
            .join('div')
            .style('display', 'flex')
            .style('align-items', 'center')  
            .style('gap', '5px') 
            .each(function (attribute) {
                const div = d3.select(this);
                div.append('input')
                    .attr('type', 'checkbox')
                    .attr('value', attribute)
                    .property('checked', selectedAttributes.includes(attribute))  
                    .on('change', function () {
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
                    .style('color', attributeColors[attribute])  
                    .style('margin', '0')  
                    .style('vertical-align', 'middle'); 
            });
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
            .domain(d3.extent(normalizedData, d => d.date)) // Asegúrate de que 'date' sea un objeto Date
            .range([0, width]);
    
        const yExtent = d3.extent(
            normalizedData.flatMap(d => selectedAttributes.map(attr => d.normalizedValues[attr]))
        );
        const yScale = d3.scaleLinear()
            .domain([Math.min(0, yExtent[0]), Math.max(1, yExtent[1])])
            .range([height, 0]);
    
        // Crear el eje X
        const xAxis = d3.axisBottom(xScale)
            .tickFormat(d3.timeFormat("%d-%m-%Y")); // Formato de fecha "día/mes/año"
            const yAxis = d3.axisLeft(yScale);
            chartSvg.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0, ${height})`) // Colocar el eje en la parte inferior
            .call(xAxis)
            .selectAll("text")
            .style("text-anchor", "middle") // Centrar el texto
            .style('font-size', '10px')
            .attr("dx", "-34px") // Ajustar la posición del texto
            .attr("dy", "0px")
            .attr("transform", "rotate(-30)"); // Rotar 
        
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
                .attr('r', () => {
                    const aqiCheckbox = document.querySelector('#aqi-size-toggle');
                    return aqiCheckbox.checked ? 4 : 0;
                })
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
                        'NO2': '#d500f1', // Verde neón para contaminación visible
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
                            .y(d => yMiniScale(d[contaminant]))
                            .curve(d3.curveMonotoneX); 
                        
            
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

    }
    
}


function drawLine(chartSvg, points, attribute) {
    const lineGenerator = d3.line()
        .x(d => d.x)
        .y(d => d.y)
        .curve(d3.curveMonotoneX); // Suaviza las líneas

    chartSvg.append('path')
        .data([points]) // Aseguramos pasar un array de puntos
        .attr('class', 'line')
        .attr('d', lineGenerator(points)) // Usamos el generador de líneas suavizado
        .attr('fill', 'none')
        .attr('stroke', attributeColors[attribute]) // Usar el color del atributo
        .attr('stroke-width', 2)
        .attr('opacity', 0.7) // Agregar opacidad a la línea
        .on('mouseover', function(event, d) {
            // Cambiar el estilo (ejemplo: aumentar el grosor de la línea)
            d3.select(this)
                .attr('stroke-width', 4); // Aumenta el grosor de la línea en hover

            // Mostrar tooltip con el valor promedio o algún dato relevante
            chartSvg.append('text')
                .attr('id', 'tooltip')
                .attr('x', points[0].x + 5) // Usamos el primer punto como referencia
                .attr('y', d3.mean(points, p => p.y) - 10) // Promedio de las coordenadas Y
                .attr('font-size', '12px')
                .attr('fill', '#000')
                // .text(`Attribute: ${attribute}`); // Cambiar a mostrar el atributo
        })
        .on('mouseout', function(event, d) {
            // Restaurar el estilo al salir
            d3.select(this)
                .attr('stroke-width', 2); // Restaurar el grosor original

            // Eliminar el tooltip
            chartSvg.select('#tooltip').remove();
        });
}
