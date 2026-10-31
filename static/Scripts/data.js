function element({tag, className = "", id = "", text = "", src = ""}) {
    const e = document.createElement(tag);
    e.className = className;
    e.id = id;
    e.textContent = text;
    e.src = src;
    return e;
}
async function getWeatherData(lat, lon) {
    let res = await fetch(`/check_city?lat=${lat}&lon=${lon}`);
    let data = await res.json();
    if (data != null) {
        return data;
    }

    const url = "https://api.open-meteo.com/v1/forecast"
    + `?latitude=${lat}&longitude=${lon}`
    + "&current=is_day"
    + "&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset"
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
            pos => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
            err => resolve({ lat: -23.5329, lon: -46.6395 })
        )
    });
}

function iconFor(code) {
    if (code == 0)
        return ["Sun.svg", "condSunny"];
    if ([1, 2].includes(code))
        return ["PartlyCloudy.svg", "condPartlyCloudy"];
    if (code == 3)
        return ["Cloud.svg", "condCloudy"];
    if ([45, 48].includes(code))
        return ["Fog.svg", "condFoggy"];
    if ((code >= 51 && code <= 67) || [80, 81, 82].includes(code))
        return ["RainCloud.svg", "condRain"];
    if ((code >= 71 && code <= 77) || [85, 86].includes(code))
        return ["Snow.svg", "condSnow"];
    if ([95, 96, 99].includes(code))
        return ["ThunderCloud.svg", "condThunderstorm"];
    return ["Cloud.svg", "condCloudy"];
}

function uvCondition(index) {
    if (index < 3) return "uvLow";
    if (index < 6) return "uvModerate";
    if (index < 8) return "uvHigh";
    if (index < 11) return "uvVeryHigh";
    return "uvExtreme";
}
function windDirection(deg) {
    const directions = ["windN", "windNE", "windE", "windSE", "windS", "windSW", "windW", "windNW"];
    return t(directions[Math.round(deg / 45) % 8]);
}

function drawChart(labels, data, label, color, options) {
    const currentChart = Chart.getChart("chart");
    if (currentChart) {
        if (data == currentChart.data.datasets[0].data) return;
        currentChart.destroy();
    }

    new Chart(chart, {
    type: "line",
    data: {
        labels: labels,
        datasets: [{
            label: label,
            data: data,
            borderColor: color,
            tension: 0.5
        }]
    },
    options: options
    });
}

// Render part
const convert = value => isCelsius ? value: invertDegree(value, true);
const convertArray = arr => isCelsius ? arr: arr.map(n => invertDegree(n, true));
let lastCityInfo, lastIndex;

function renderHeader(cityInfo) {
    const city = document.getElementById("city");
    const date = document.getElementById("date");

    city.textContent = `${cityInfo.name}, ${cityInfo.state}, ${cityInfo.country}`;

    date.textContent = new Date().toLocaleDateString(t("locale"));
}

function renderCurrent(hourlyData, i, dailyData) {
    const [icon, condition] = iconFor(hourlyData.weather_code[i])
    document.getElementById("weather-image").src = `static/Icons/${icon}`
    document.getElementById("weather-condition").textContent = t(condition);

    const currentTemperature = document.getElementById("temperature");
    const currentApparentTemperature = document.getElementById("apparent-temperature-button");
    
    currentTemperature.innerHTML = "";
    currentTemperature.append(
        element({tag: "span", className: "temperature", text:convert(hourlyData.temperature_2m[i])}),
        element({tag: "span", className: "degree", text:symbol})
    );

    currentApparentTemperature.innerHTML = "";
    currentApparentTemperature.append(
        element({tag:"span", className:"temperature apparent-temperature-number", text:convert(hourlyData.apparent_temperature[i])}),
        element({tag:"span", className:"degree apparent-temperature-degree", text:symbol})
    );

    const windSpeed = document.getElementById("wind-speed");
    
    document.getElementById("uv-index").textContent = `${t("uvIndex")}: ${t(uvCondition(hourlyData.uv_index[i]))}`;
    document.getElementById("humidity").textContent = `${t("humidity")}: ${hourlyData.relative_humidity_2m[i]}%`;
    document.getElementById("precipitation").textContent = `${t("precipitation")}: ${hourlyData.precipitation[i]} mm`;
    document.getElementById("visibility").textContent = `${t("visibility")}: ${hourlyData.visibility[i] / 1000} Km`;
    windSpeed.textContent = `${t("windSpeed")}: ${hourlyData.wind_speed_10m[i]} km/h `;

    windSpeed.append(
        element({tag:"span", id:"wind-direction", text:windDirection(hourlyData.wind_direction_10m[i])}),
        element({tag:"span", id:"wind-dir-arrow", text:" --> "})
    );
    document.getElementById("wind-dir-arrow").style.transform = `rotate(${hourlyData.wind_direction_10m[i] + 90}deg)`;

    document.getElementById("sunrise").textContent = dailyData.sunrise[0].slice(-5);
    document.getElementById("sunset").textContent = dailyData.sunset[0].slice(-5);
}

let currentChart = "temperature";
function sizeChart(length, points) {
    const scroller = document.getElementById("chart-scroller");
    // Resize the chart to show the amount of points
    document.getElementById("chart-inner").style.width = Math.max(length * (scroller.clientWidth / points), scroller.clientWidth) + "px";
}
function renderChart(hourlyData) {
    const labels = hourlyData.time.map(h => `${new Date(h).getHours()}h`);
    const scroller = document.getElementById("chart-scroller");
    
    sizeChart(labels.length, 25);

    const baseOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            x: { ticks: { autoSkip: false } },
            y: {
                beginAtZero: true
            }
        }
    };
    const tempOptions = {...baseOptions,
        scales: {...baseOptions.scales, y: { beginAtZero: true, suggestedMax: isCelsius ? 40: 120 }
    }};

    const charts = [
       ["uv-index", () => hourlyData.uv_index, t("uvIndex"), "purple", baseOptions],
       ["temperature", () => convertArray(hourlyData.temperature_2m), `${t("temperature")}`, "red", tempOptions],
       ["apparent-temperature-button", () => convertArray(hourlyData.apparent_temperature), `${t("chartApparent")}`, "pink", tempOptions],
       ["humidity", () => hourlyData.relative_humidity_2m, t("chartHumidity"), "rgb(35, 130, 220)", baseOptions],
       ["precipitation", () => hourlyData.precipitation, t("chartPrecipitation"), "lightblue", baseOptions],
       ["visibility", () => hourlyData.visibility.map(n => n / 1000), t("chartVisibility"), "rgba(100,100,100,0.2)", baseOptions],
       ["wind-speed", () => hourlyData.wind_speed_10m, t("windSpeed"), "gray", baseOptions]
    ];

    for (let [id, getData, label, color, options] of charts) {
        document.getElementById(id).onclick = () => {
            if (label.includes(t("temperature"))) {
                label = label.includes(t("apparent")) ? t("apparent"): t("temperature");
                label += ` (${symbol})`;
            }
            drawChart(labels, getData(), label, color, options);
            currentChart = id;
        };
    }

    if (!scroller.dataset.wheelBound) {
        scroller.dataset.wheelBound = "1";
        scroller.addEventListener("wheel", (e) => {
            if (scroller.scrollWidth <= scroller.clientWidth) return;

            e.preventDefault();
            scroller.scrollLeft += e.deltaY;
        }, { passive: false });
    }
    document.getElementById(currentChart).click();
}

function renderForecast(dailyData) {
    const forecast = document.getElementById("forecast");
    forecast.innerHTML = "";
    for (let i = 0; i < 7; i++) {
        const dayInfo = element({tag:"div", id:"day-info"});
        const dayWeather = element({tag:"img", id:"day-weather", src:`static/Icons/${iconFor(dailyData.weather_code[i])[0]}`});
        const dayTemperatures = element({tag:"div", id:"temperature-max-min"});

        const weekDay = new Date(dailyData.time[i] + "T00:00")
            .toLocaleDateString(t("locale"), { weekday: "long" });

        const max = element({tag:"p", id:"max"});
        const min = element({tag:"p", id:"min"});

        max.append(
            element({tag:"span", className:"temperature", text:convert(dailyData.temperature_2m_max[i])}),
            element({tag:"span", className:"degree", text:symbol})
        );
        min.append(
            element({tag:"span", className:"temperature", text:convert(dailyData.temperature_2m_min[i])}),
            element({tag:"span", className:"degree", text:symbol})
        );

        dayTemperatures.append(element({tag:"p", id:"week-day", text:weekDay}), max, min);
        dayInfo.append(dayWeather, dayTemperatures);
        forecast.appendChild(dayInfo);
    }
}

const map = L.map('map');
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

async function init(cityData = undefined, cityInfo = undefined) {
    await i18nReady;

    if (cityData == undefined || cityInfo == undefined) {
        const { lat, lon } = await getPosition();
        
        const res = await fetch(`/search_city?lat=${lat}&lon=${lon}`);
        const cityJson = await res.json();
        cityInfo = cityJson.cities[0];
        
        const json = await getWeatherData(cityInfo.latitude, cityInfo.longitude);
        cityData = Object.keys(json).length === 1 ? json[0]: json;
    }
    
    currentData = cityData.current;
    dailyData = cityData.daily;
    hourlyData = cityData.hourly;

    const currentIndex = Math.max(0, hourlyData.time.indexOf(currentData.time.slice(0, 13) + ":00"));

    lastCityInfo = cityInfo;
    lastIndex = currentIndex;

    renderHeader(cityInfo);
    renderCurrent(hourlyData, currentIndex, dailyData);
    renderChart(hourlyData);
    renderForecast(dailyData);

    map.setView([cityData.latitude, cityData.longitude], 13);
}

init()

window.addEventListener("resize", () => {
    sizeChart(hourlyData.temperature_2m.length, 25)
});

// Re-draw all translated text when the user switches language
document.addEventListener("i18n:changed", () => {
    if (lastCityInfo === undefined) return;
    Chart.getChart("chart")?.destroy();
    renderHeader(lastCityInfo);
    renderCurrent(hourlyData, lastIndex, dailyData);
    renderChart(hourlyData);
    renderForecast(dailyData);
});
