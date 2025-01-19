
async function drawThemeRiver(cityFile, dates) {

    const lastDate = new Date(dates[dates.length - 1]);
    const nextDate = new Date(lastDate);
    nextDate.setDate(lastDate.getDate() + 1);
    dates.push(nextDate.toISOString());

    const response = await fetch(`data/${cityFile}`);
    const csvData = await response.text();
    const data = d3.csvParse(csvData, d => ({
        date: new Date(+d.year, +d.month - 1, +d.day, +d.hour || 0),
        PM2_5: +d.PM2_5 || null,
        PM10: +d.PM10 || null,
        SO2: +d.SO2 || null,
        NO2: +d.NO2 || null,
        CO: +d.CO || null,
        O3: +d.O3 || null,
        TEMP: +d.TEMP || null,
        PRES: +d.PRES || null,
        DEWP: +d.DEWP || null,
        RAIN: +d.RAIN || null,
    }));

    const selectedDatesSet = new Set(dates.map(date => new Date(date).getTime()));
    const filteredData = data.filter(d => selectedDatesSet.has(d.date.getTime()));

    // if (filteredData.length === 0) {
    //     alert("No se encontraron datos para las fechas seleccionadas.");
    //     return;
    // }

    const contaminantAttributes = ["O3", "CO", "NO2", "SO2", "PM10", "PM2_5"];
    const meteorologicalAttributes = ["RAIN", "DEWP", "PRES", "TEMP"];
    const attributes = [...contaminantAttributes, ...meteorologicalAttributes];

    const attributeStats = attributes.reduce((stats, attr) => {
        const values = filteredData.map(d => d[attr]).filter(value => value !== null);
        stats[attr] = { min: Math.min(...values), max: Math.max(...values) };
        return stats;
    }, {});

    const normalizedData = filteredData.map(d => {
        const normalized = { date: d.date };
        attributes.forEach(attr => {
            const { min, max } = attributeStats[attr];
            normalized[attr] = d[attr] !== null && max > min
                ? (d[attr] - min) / (max - min)
                : 0.5;
        });
        return normalized;
    });

    const margin = { top: 100, right: 30, bottom: 80, left: 20 };
    const width = 600 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const container = d3.select("#evolution-plot");
    container.selectAll("*").remove();

    // Crear contenedor SVG
    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

    // Contenedor para el gráfico principal
    const chartGroup = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Contenedor para etiquetas
    const labelsGroup = svg.append("g")
        .attr("transform", `translate(${margin.left}, 20)`);

    const stack = d3.stack()
        .keys(attributes)
        .value((d, key) => d[key] || 0)
        .order(d3.stackOrderNone)
        .offset(d3.stackOffsetWiggle);

    const series = stack(normalizedData);

    const x = d3.scaleLinear()
        .domain([0, normalizedData.length - 1])
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([
            d3.min(series.flat(), d => d[0]),
            d3.max(series.flat(), d => d[1])
        ])
        .range([height, 0]);

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

    const area = d3.area()
        .x((d, i) => x(i))
        .y0(d => y(d[0]))
        .y1(d => y(d[1]));

    chartGroup.append("g")
        .selectAll("path")
        .data(series)
        .join("path")
        .attr("fill", d => attributeColors[d.key])
        .attr("d", area);

        const labelOrder = [
            "PM2_5", "PM10", "SO2", "NO2", "CO", "O3", "TEMP", "PRES", "DEWP", "RAIN"
        ];
        
        labelOrder.forEach((attr, index) => {
            labelsGroup.append("text")
                .attr("x", (index % 5) * 120)
                .attr("y", Math.floor(index / 5) * 20)
                .attr("transform", `translate(${margin.left}, 40)`)
                .text(attr)
                .style("fill", attributeColors[attr])
                .style("font-size", "14px")
                .style("font-weight", "bold");
        });
        

    const brush = d3.brushX()
        .extent([[0, 0], [width, height]])
        .on("end", brushended);

    chartGroup.append("g")
        .attr("class", "brush")
        .call(brush);

    chartGroup.on("dblclick", () => drawThemeRiver(cityFile, dates));

    addDates(chartGroup, normalizedData, x, height, 25);

    function brushended({ selection }) {
        if (!selection) return;

        const [x0, x1] = selection.map(x.invert);
        const startIndex = Math.floor(x0);
        const endIndex = Math.ceil(x1);
        const newFilteredData = normalizedData.slice(startIndex, endIndex);

        if (newFilteredData.length > 0) {
            drawZoomedData(newFilteredData);
        }
    }

    function drawZoomedData(filteredZoomedData) {
        container.selectAll("*").remove();

        const zoomSvg = container.append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom);

        const zoomedChartGroup = zoomSvg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const zoomedLabelsGroup = zoomSvg.append("g")
            .attr("transform", `translate(${margin.left}, 20)`);

        const zoomedX = d3.scaleLinear()
            .domain([0, filteredZoomedData.length - 1])
            .range([0, width]);

        const zoomedY = d3.scaleLinear()
            .domain([
                d3.min(series.flat(), d => d[0]),
                d3.max(series.flat(), d => d[1])
            ])
            .range([height, 0]);

        const zoomedArea = d3.area()
            .x((d, i) => zoomedX(i))
            .y0(d => zoomedY(d[0]))
            .y1(d => zoomedY(d[1]));

        zoomedChartGroup.append("g")
            .selectAll("path")
            .data(stack(filteredZoomedData))
            .join("path")
            .attr("fill", d => attributeColors[d.key])
            .attr("d", zoomedArea);

        zoomedChartGroup.append("g")
            .attr("class", "brush")
            .call(brush);

        zoomedChartGroup.on("dblclick", () => drawThemeRiver(cityFile, dates));

        addDates(zoomedChartGroup, filteredZoomedData, zoomedX, height, 30);

        // Reagregar etiquetas en el gráfico de zoom
        const labelOrder = [
            "PM2_5", "PM10", "SO2", "NO2", "CO", "O3", "TEMP", "PRES", "DEWP", "RAIN"
        ];

        labelOrder.forEach((attr, index) => {
            zoomedLabelsGroup.append("text")
                .attr("x", (index % 5) * 120)
                .attr("y", Math.floor(index / 5) * 20)
                .attr("transform", `translate(${margin.left}, 40)`) // Asegurarse de que las etiquetas se alineen correctamente
                .text(attr)
                .style("fill", attributeColors[attr])
                .style("font-size", "14px")
                .style("font-weight", "bold");
        });

    }

    function addDates(svg, data, xScale, height, maxLabels) {
        const formatDate = d3.timeFormat("%d-%m-%Y");
        const step = Math.max(1, Math.floor(data.length / maxLabels));

        data.forEach((d, i) => {
            if (i % step === 0) {
                svg.append("line")
                    .attr("x1", xScale(i))
                    .attr("x2", xScale(i))
                    .attr("y1", 0)
                    .attr("y2", height)
                    .attr("stroke", "black")
                    .attr("opacity", 0.1);

                svg.append("text")
                    .attr("x", xScale(i))
                    .attr("y", height + 40)
                    .text(formatDate(d.date))
                    .attr("fill", "black")
                    .attr("font-size", "10px")
                    .attr("text-anchor", "middle")
                    .attr("transform", `rotate(-45 ${xScale(i)},${height + 40})`);
            }
        });
    }
}
