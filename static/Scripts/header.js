const searchForm = document.getElementById("search-bar-container");
const searchBar = document.getElementById("search-bar");
const cityList = document.getElementById("city-list");
const celsiusButton = document.getElementById("degree-change");
const temperature = document.getElementsByClassName("temperature");
const degree = document.getElementsByClassName("degree");

let isCelsius = true
let timer;

searchBar.addEventListener("input", () => {
    clearTimeout(timer);
    const query = searchBar.value.trim();
    if (query.length === 0) {
        cityList.innerHTML = "";
        return;
    }
    
    cityList.innerHTML = ""
    timer = setTimeout(async () => {
        const response = await fetch("/search_city?q=" + encodeURIComponent(query));
        const data = await response.json();

        if (!data.cities.length) {
            console.log("City not found!");
            return
        }
        data.cities.forEach(city => {
            const cityButton = document.createElement("li");
            cityButton.textContent = `${city[0]}, ${city[1]}`
            cityButton.addEventListener("click", () => {
                window.location.href = `${encodeURIComponent(city[0])}`
            });
            cityList.appendChild(cityButton);
        });
    }, 250);

    document.addEventListener("click", (e) => {
        if (!e.target.closest("#search-bar-container")) {
            cityList.innerHTML = "";
            searchBar.value = "";
        }
    });
});
cityList.addEventListener("input", () => {
    cityList.style.height = cityList.children.length * 75 + "px";
});

celsiusButton.addEventListener("click", () => {
    isCelsius = !isCelsius;

    const symbol = isCelsius ? "°C": "°F";
    for (let i = 0; i < temperature.length; i++) {
        temperature[i].textContent = `${invertDegree(Number(temperature[i].textContent), !isCelsius)}`;
        degree[i].textContent = symbol;
    }
    
    const chart = Chart.getChart("chart");
    const chartLabel = chart.data.datasets[0].label;
    const data = JSON.parse(document.getElementById("chart-data").textContent);

    if ( chartLabel.includes("Temperature", "Apparent Temperature") ) {
        if (chartLabel.includes("Apparent")) {    
            chart.data.datasets[0].data = isCelsius ?
                data.apparent_temperature:
                data.apparent_temperature.map(f => invertDegree(f, true));
            chart.data.datasets[0].label =`Apparent Temperature (${symbol})`;
        }
        else {
            chart.data.datasets[0].data = isCelsius ?
                data.temperature:
                data.temperature.map(f => invertDegree(f, true));
            chart.data.datasets[0].label = `Temperature (${symbol})`;
        }
        chart.update();
    }
});

function invertDegree(temperature, isCelsius) {
    if (isCelsius) {
        return Math.round(temperature * 9 / 5 + 32);
    }
    return Math.round((temperature - 32) * 5 / 9);
}
