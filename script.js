// Initialize map
const map = L.map('map', {
    worldCopyJump: false,
    maxBounds: [[-90, -180], [90, 180]],
    maxBoundsViscosity: 1.0
}).setView([20, 0], 2);

// Earthquake layer
const quakeLayer = L.layerGroup().addTo(map);

// Legend
const legend = L.control({ position: 'bottomright' });
legend.onAdd = function (map) {
    const div = L.DomUtil.create('div', 'info legend');
    div.innerHTML = `
        <h4>Risk Level</h4>
        <div><span class="high-risk">■</span> High (>70%)</div>
        <div><span class="medium-risk">■</span> Medium (30-70%)</div>
        <div><span class="low-risk">■</span> Low (<30%)</div>
    `;
    return div;
};
legend.addTo(map);

// Load earthquake data
function loadEarthquakes() {
    fetch('/api/earthquakes')
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert(data.error);
                return;
            }

            // Update last updated time
            document.getElementById('last-updated').textContent = `Last updated: ${new Date().toLocaleString()}`;

            // Clear previous markers
            quakeLayer.clearLayers();

            // Add new markers
            data.features.forEach(quake => {
                const coords = quake.geometry.coordinates;
                const props = quake.properties;

                const marker = L.circleMarker([coords[1], coords[0]], {
                    radius: props.mag * 2,
                    fillColor: getRiskColor(props.prediction),
                    color: '#000',
                    weight: 1,
                    opacity: 1,
                    fillOpacity: 0.8
                }).addTo(quakeLayer);

                marker.bindPopup(`
                    <b>Location:</b> ${props.place}<br>
                    <b>Magnitude:</b> ${props.mag.toFixed(1)}<br>
                    <b>Depth:</b> ${props.depth.toFixed(1)} km<br>
                    <b>Time:</b> ${new Date(props.time).toLocaleString()}<br>
                    <b>Risk Prediction:</b> <span class="${getRiskClass(props.prediction)}">${(props.prediction * 100).toFixed(1)}%</span>
                `);
            });

            // Update quake list
            updateQuakeList(data.features);
        })
        .catch(error => {
            console.error('Error loading earthquake data:', error);
            alert('Failed to load earthquake data');
        });
}

// Update earthquake list in sidebar
function updateQuakeList(quakes) {
    const list = document.getElementById('quake-list');
    list.innerHTML = '';

    quakes.sort((a, b) => new Date(b.properties.time) - new Date(a.properties.time));

    quakes.forEach(quake => {
        const props = quake.properties;
        const item = document.createElement('div');
        item.className = 'quake-item';
        item.innerHTML = `
            <div><b>${props.mag.toFixed(1)}</b> - ${props.place}</div>
            <small>${new Date(props.time).toLocaleString()} - 
            <span class="${getRiskClass(props.prediction)}">${(props.prediction * 100).toFixed(1)}% risk</span></small>
        `;
        list.appendChild(item);
    });
}

// Get color based on risk prediction
function getRiskColor(prediction) {
    if (prediction > 0.7) return '#e74c3c';  // red
    if (prediction > 0.3) return '#f39c12';  // orange
    return '#27ae60';  // green
}

// Get risk class for styling
function getRiskClass(prediction) {
    if (prediction > 0.7) return 'high-risk';
    if (prediction > 0.3) return 'medium-risk';
    return 'low-risk';
}

// Handle map clicks for predictions
map.on('click', function (e) {
    fetch(`/api/predict?lat=${e.latlng.lat}&lon=${e.latlng.lng}`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert(data.error);
                return;
            }

            const resultDiv = document.getElementById('prediction-result');
            resultDiv.innerHTML = `
                <div>Prediction for (${data.latitude.toFixed(2)}, ${data.longitude.toFixed(2)}): 
                <span class="${getRiskClass(data.probability)}">${(data.probability * 100).toFixed(1)}% risk</span></div>
            `;

            // Add temporary marker
            const marker = L.circleMarker(e.latlng, {
                radius: 8,
                color: '#000',
                weight: 1,
                fillColor: getRiskColor(data.probability),
                fillOpacity: 1
            }).addTo(map);

            marker.bindPopup(`Predicted risk: ${(data.probability * 100).toFixed(1)}%`);

            // Remove after 5 seconds
            setTimeout(() => {
                map.removeLayer(marker);
            }, 5000);
        });
});

// Refresh button
document.getElementById('refresh-btn').addEventListener('click', loadEarthquakes);

// Initial load
loadEarthquakes();