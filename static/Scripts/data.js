async function getWeatherData(lat, lon) {
    let res = await fetch(`/check_city?lat=${lat}&lon=${lon}`);
    let data = await res.json();
    if (data != null) {
        console.log("Requested from Database!");
        return data;
    }

    const url = "https://api.open-meteo.com/v1/forecast"
    + `?latitude=${lat}&longitude=${lon}`
    + "&current=is_day"
    + "&daily=weather_code,temperature_2m_max,temperature_2m_min"
    + "&hourly=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,"
    + "visibility,wind_speed_10m,wind_direction_10m,uv_index"
    + "&timezone=auto";
    res = await fetch(url);
    data = await res.json();
    if (!res.ok) {
        throw new Error(data.reason)
    }

    // Format data
    data.daily.temperature_2m_max = data.daily.temperature_2m_max.map(n => Math.round(n));
    data.daily.temperature_2m_min = data.daily.temperature_2m_min.map(n => Math.round(n));

    data.hourly.temperature_2m = data.hourly.temperature_2m.map(n => Math.round(n));
    data.hourly.apparent_temperature = data.hourly.apparent_temperature.map(n => Math.round(n));

    console.log("Requested from API!");
    await fetch("/city", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
        current: data.current,
        daily: data.daily,
        hourly: data.hourly,
        latitude: lat,
        longitude: lon
        })
    });

    return data;
}

function getPosition() {
    return new Promise(resolve => {
        navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
            () => resolve({ lat: -23.5329, lon: -46.6395 })
        )
    });
}

function iconFor(code) {
    if (code == 0)
        return ["Sun.svg", "Sunny"];
    if ([1, 2].includes(code))
        return ["PartlyCloudy.svg", "Partly Cloudy"];
    if (code == 3)
        return ["Cloud.svg", "Cloudy"];
    if ([45, 48].includes(code))
        return ["Fog.svg", "Foggy"];
    if ((code >= 51 && code <= 67) || [80, 81, 82].includes(code))
        return ["RainCloud.svg", "Rain"];
    if ((code >= 71 && code <= 77) || [85, 86].includes(code))
        return ["Snow.svg", "Snowing"];
    if ([95, 96, 99].includes(code))
        return ["ThunderCloud.svg", "Thunderstorm"];
    return ["Cloud.svg", "Cloudy"];
}

function windDirection(deg) {
    direction = ["S", "SW", "W", "NW", "N", "NE", "E", "SE"];
    return direction[Math.round(deg % 8)];
}

let labels = [];
for (let i = 3, j = 0; j < 7 * 24; j++) {
    labels.push(`${i}h`);
    i++;
    if (i >= 24) {
        i = 0;
    }
}

function drawChart(info, label, color, options) {
    const currentChart = Chart.getChart("chart");
    if (currentChart) {
        if (currentChart.data.datasets[0].label === label) return;
        currentChart.destroy();
    }

    new Chart(chart, {
    type: "line",
    data: {
        labels: labels,
        datasets: [{
            label: label,
            data: info,
            borderColor: color,
            tension: 0.5
        }]
    },
    options: options
    });
}

async function init() {
    const { lat, lon } = await getPosition();

    const res = await fetch(`/search_city?lat=${lat}&lon=${lon}`);
    const cityInfo = await res.json();
    
    const json = await getWeatherData(cityInfo.latitude, cityInfo.longitude);
    const cityData = Object.keys(json).length === 1 ? json[0]: json;
    console.log(cityData);

    // Data
    const currentData = cityData.current;
    const dailyData = cityData.daily;
    const hourlyData = cityData.hourly;

    // daily data
    const city = document.getElementById("city");
    const dateElement = document.getElementById("date");

    city.textContent = `${cityInfo.name}, ${cityInfo.state}, ${cityInfo.country}`;

    const date = new Date();
    const hour = date.getHours();
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    dateElement.textContent = `${day}.${month}.${year}`;

    // Current data
    const currentIndex = hour > 3 ? hour - 3: 21 + hour;

    const currentIcon = document.getElementById("weather-image");
    const currentCondition = document.getElementById("weather-code");
    const currentTemperature = document.getElementById("temperature");
    const currentApparentTemperature = document.getElementById("apparent-temperature-button");

    const currentCode = iconFor(hourlyData.weather_code[currentIndex])
    currentIcon.src = `static/Icons/${currentCode[0]}`
    currentCondition.textContent = `${currentCode[1]}`;

    const temperature = document.createElement("span");
    temperature.className = "temperature";
    temperature.textContent = hourlyData.temperature_2m[currentIndex];
    
    const degree = document.createElement("span");
    degree.className = "degree";
    degree.textContent = "°C";

    currentTemperature.innerHTML = "";
    currentTemperature.appendChild(temperature);
    currentTemperature.appendChild(degree);

    const apparentTemperature = document.createElement("span");
    apparentTemperature.className = "temperature, apparent-temperature-number";
    apparentTemperature.textContent = hourlyData.apparent_temperature[currentIndex];

    const apparentDegree = document.createElement("span");
    apparentDegree.className = "degree, apparent-temperature-degree";
    apparentDegree.textContent = "°C";

    currentApparentTemperature.innerHTML = "";
    currentApparentTemperature.appendChild(apparentTemperature);
    currentApparentTemperature.appendChild(apparentDegree);

    // Chart
    const humidityButton = document.getElementById("humidity");
    const precipitationButton = document.getElementById("precipitation");
    const visibilityButton = document.getElementById("visibility");
    const windSpeedButton = document.getElementById("wind-speed");
    
    humidityButton.textContent = `Humidity: ${hourlyData.relative_humidity_2m[currentIndex]}%`;
    precipitationButton.textContent = `Precipitation: ${hourlyData.precipitation[currentIndex]} mm`;
    visibilityButton.textContent = `Visibility ${hourlyData.visibility[currentIndex] / 1000} Km`;
    windSpeedButton.textContent = `Wind Speed: ${hourlyData.wind_speed_10m[currentIndex]} km/h `;
    
    const windDirectionSpan = document.createElement("span");
    windDirectionSpan.id = "wind-direction";
    windDirectionSpan.textContent = windDirection(hourlyData.wind_direction_10m[currentIndex]);

    windSpeedButton.appendChild(windDirectionSpan);

    const scroller = document.getElementById("chart-scroller");
    const chartInner = document.getElementById("chart-inner");

    chartInner.style.width = Math.max(labels.length * 40, 800) + "px";

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            x: { ticks: { autoSkip: false } },
            y: {
                beginAtZero: true,
            }
        }
    };
    const temperatureOptions = JSON.parse(JSON.stringify(options));
    temperatureOptions.scales.y.suggestedMax = isCelsius ? 40: 120;

    drawChart(hourlyData.temperature_2m, "Temperature (°C)", "red", temperatureOptions)
    currentTemperature.addEventListener("click", () => {
        const info = isCelsius ? hourlyData.temperature_2m: hourlyData.temperature_2m.map(f => invertDegree(f, true));
        temperatureOptions.scales.y.suggestedMax = isCelsius ? 40: 120;
        drawChart(info, "Temperature (°C)", "red", temperatureOptions);
    });
    currentApparentTemperature.addEventListener("click", () => {
        const info = isCelsius ? hourlyData.apparent_temperature: hourlyData.apparent_temperature.map(f => invertDegree(f, true));
        temperatureOptions.scales.y.suggestedMax = isCelsius ? 40: 120;
        drawChart(info, "Apparent Temperature (°C)", "pink", temperatureOptions);
    });
    humidityButton.addEventListener("click", () => {
        drawChart(hourlyData.relative_humidity_2m, "Humidity (%)", "darkblue", options);
    });
    visibilityButton.addEventListener("click", () => {
        drawChart(hourlyData.visibility.map(v => v / 1000), "Visibility (Km)", "yellow", options);
    });
    windSpeedButton.addEventListener("click", () => {
        drawChart(hourlyData.wind_speed_10m, "Wind Speed (Km)", "gray", options);
    });

    scroller.addEventListener("wheel", (e) => {
        if (scroller.width <= scroller.clientWidth) return;

        e.preventDefault();
        scroller.scrollLeft += e.deltaY;
    }, { passive: false });

    // Forecast
    const forecast = document.getElementById("forecast");
    for (let i = 0; i < 7; i++) {
        const dayInfo = document.createElement("div");
        dayInfo.id = "day-info";

        const dayWeather = document.createElement("img");
        dayWeather.id = "day-weather";
        dayWeather.src = `static/Icons/${iconFor(dailyData.weather_code[i])[0]}`
        
        const dayTemperatures = document.createElement("div");
        dayTemperatures.id = "temperature-max-min";

        const date = new Date(dailyData.time[i] + "T00:00");
        const weekDay = document.createElement("p");
        weekDay.id = "week-day";
        weekDay.textContent = date.toLocaleDateString("en-US", { weekday: "long" });

        const dayMax = document.createElement("p");
        const dayMin = document.createElement("p");
        dayMax.id = "max";
        dayMin.id = "min";

        const max = document.createElement("span");
        const min = document.createElement("span");
        max.className = min.className = "temperature";

        max.textContent = dailyData.temperature_2m_max[i];
        min.textContent = dailyData.temperature_2m_min[i];

        dayMax.appendChild(max);
        dayMax.appendChild(degree.cloneNode(true));
        dayMin.appendChild(min);
        dayMin.appendChild(degree.cloneNode(true));

        dayTemperatures.appendChild(weekDay);
        dayTemperatures.appendChild(dayMax);
        dayTemperatures.appendChild(dayMin);

        dayInfo.appendChild(dayWeather);
        dayInfo.appendChild(dayTemperatures);

        forecast.appendChild(dayInfo);
    }
    
    // Map
    const map = L.map('map').setView([cityData.latitude, cityData.longitude], 13);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
}

init()