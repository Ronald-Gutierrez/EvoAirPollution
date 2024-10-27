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
