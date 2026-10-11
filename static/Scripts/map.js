const cityData = JSON.parse(document.getElementById("city-data").textContent);
const map = L.map('map').setView([cityData.latitude, cityData.longitude], 13);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);