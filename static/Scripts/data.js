async function getWeatherData(lat, lon) {
    let res = await fetch(`/check_city?lat=${lat}?lon=${lon}`);
    let data = await res.json();

    if (data) {
        console.log("Requested From Database!");
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

    return data;
}
function changeCity(lat, lon) {
    getWeatherData(lat, lon).then(async data => {
        await fetch("/city", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
            current_data: data.current,
            daily_data: data.daily,
            hourly_data: data.hourly,
            latitude: lat,
            longitude: lon
            })
        });
    });
}