const searchForm = document.getElementById("search-bar-container");
const searchBar = document.getElementById("search-bar");
const cityList = document.getElementById("city-list");
const celsiusButton = document.getElementById("degree-change");
const temperature = document.getElementsByClassName("temperature");
const degree = document.getElementsByClassName("degree");

let isCelsius = true
let symbol = "°C";
let timer;

searchBar.addEventListener("input", () => {
    clearTimeout(timer);
    const query = searchBar.value.trim();
    if (query.length === 0) {
        cityList.innerHTML = "";
        return;
    }
    
    cityList.innerHTML = "";
    timer = setTimeout(async () => {
        const response = await fetch("/search_city?q=" + encodeURIComponent(query));
        const data = await response.json();
        
        if (data.error) {
            cityList.appendChild(element({tag:"li", text:`${data.error}`}));
            return;
        }
        data.cities.forEach(city => {
            const cityButton = element({tag:"li", text:`${city.name}, ${city.state}`});
            cityButton.addEventListener("click", async () => {
                const json = await getWeatherData(city.latitude, city.longitude);
                const cityData = Object.keys(json).length === 1 ? json[0]: json;
                init(cityData, city);
                searchBar.value = "";
                cityList.innerHTML = "";
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

    symbol = isCelsius ? "°C": "°F";
    for (let i = 0; i < degree.length; i++) {
        if (i < temperature.length)
            temperature[i].textContent = `${invertDegree(Number(temperature[i].textContent), !isCelsius)}`;
        degree[i].textContent = symbol;
    }
    
    const chart = Chart.getChart("chart");
    const chartLabel = chart.data.datasets[0].label;

    if ( chartLabel.includes(t("temperature")) ) {
        if (chartLabel.includes(t("apparent"))) {    
            chart.data.datasets[0].data = isCelsius ?
                hourlyData.apparent_temperature:
                hourlyData.apparent_temperature.map(f => invertDegree(f, true));
            chart.data.datasets[0].label =`${t("apparent")} ${t("temperature")} (${symbol})`;
        }
        else {
            chart.data.datasets[0].data = isCelsius ?
                hourlyData.temperature_2m:
                hourlyData.temperature_2m.map(f => invertDegree(f, true));
            chart.data.datasets[0].label = `${t("temperature")} (${symbol})`;
        }
        chart.options.scales.y.suggestedMax = isCelsius ? 40: 120;
        chart.update();
    }
});

function invertDegree(temperature, isCelsius) {
    if (isCelsius) {
        return Math.round(temperature * 9 / 5 + 32);
    }
    return Math.round((temperature - 32) * 5 / 9);
}
