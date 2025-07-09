const API_KEY = "41876783c505135c13dec9105265e95d";
window.hourlyChart = null;
window.map = null;

async function loadWeather(cityName = null) {
    const city = cityName || document.getElementById("cityInput").value.trim() || "Taipei";
    const cached = localStorage.getItem(`weather_${city}`);
    const now = Date.now();

    if (cached) {
        const { timestamp, data } = JSON.parse(cached);
        if (now - timestamp < 10 * 60 * 1000) {
            renderWeather(data.current, data.forecast);
            notifyWeather(data.current);
            return;
        }
    }

    try {
        const current = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric&lang=zh_tw`).then(res => res.json());
        const forecast = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${API_KEY}&units=metric&lang=zh_tw`).then(res => res.json());

        if (current.cod !== 200 || forecast.cod !== "200") throw new Error("找不到城市");

        localStorage.setItem(`weather_${city}`, JSON.stringify({ timestamp: now, data: { current, forecast } }));

        renderWeather(current, forecast);
        notifyWeather(current);
    } catch (err) {
        alert("查詢失敗，請確認城市拼寫是否正確。\n範例：Taipei、Tokyo、New York");
    }
}

function renderWeather(current, forecast) {
    document.getElementById("currentWeather").innerHTML = `
<h3>${current.name}</h3>
<img src="https://openweathermap.org/img/wn/${current.weather[0].icon}@2x.png" />
<p>${current.weather[0].description}｜🌡️ ${current.main.temp}°C</p>
<p>體感：${current.main.feels_like}°C｜濕度：${current.main.humidity}%</p>
<p>💨 風速：${current.wind.speed} m/s｜🌧️ 降雨機率：約 ${current.pop ? Math.round(current.pop * 100) : 0}%</p>
<p>⏲️ 最後更新時間：${new Date(current.dt * 1000).toLocaleString()}</p>
`;

    const hourlyTemps = forecast.list.slice(0, 8);
    const labels = hourlyTemps.map((h) => h.dt_txt.slice(11, 16));
    const temps = hourlyTemps.map((h) => h.main.temp);

    const ctx = document.getElementById("hourlyChart").getContext("2d");
    if (window.hourlyChart instanceof Chart) {
        window.hourlyChart.destroy();
    }
    window.hourlyChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [
                {
                    label: "溫度 (°C)",
                    data: temps,
                    borderColor: "#fbc531",
                    backgroundColor: "rgba(255,255,255,0.2)",
                    tension: 0.3,
                },
            ],
        },
        options: {
            plugins: { legend: { labels: { color: "white" } } },
            scales: {
                x: { ticks: { color: "white" } },
                y: { ticks: { color: "white" } },
            },
        },
    });

    const daily = forecast.list.filter((_, i) => i % 8 === 0);
    const forecastHTML = daily
        .map((d) => {
            const weather = d.weather[0].main.toLowerCase();
            let weatherClass = "clouds";
            if (weather.includes("clear")) weatherClass = "sunny";
            else if (weather.includes("rain")) weatherClass = "rain";
            else if (weather.includes("snow")) weatherClass = "snow";
            return `
    <div class="forecast-day ${weatherClass} text-center">
        <p>${d.dt_txt.slice(5, 10)}</p>
        <img class="forecast-icon" src="https://openweathermap.org/img/wn/${d.weather[0].icon}.png" />
        <p>${d.weather[0].description}</p>
        <p>${d.main.temp_min} ~ ${d.main.temp_max}°C</p>
        <p>💨 ${d.wind.speed} m/s｜🌧️ ${d.pop ? Math.round(d.pop * 100) : 0}%</p>
    </div>`;
        })
        .join("");
    document.getElementById("forecastList").innerHTML = forecastHTML;

    const lat = current.coord.lat;
    const lon = current.coord.lon;
    const mapUrl = `https://maps.google.com/maps?q=${lat},${lon}&z=12&output=embed`;
    document.getElementById("map").innerHTML = `<iframe width="100%" height="100%" style="border:0" src="${mapUrl}" allowfullscreen loading="lazy"></iframe>`;
}

// existing HTML omitted for brevity, this update focuses on modifying the notifyWeather function
function notifyWeather(current) {
    const temp = current.main.temp;
    const pop = current.pop || 0;
    let title = `${current.name} 天氣提醒`;
    let body = `${current.weather[0].description}，目前溫度：${temp}°C`;

    let shouldNotify = false;

    if (pop > 0.6) {
        body = `🌧️ 降雨機率超過 60%，記得帶傘！\n${body}`;
        shouldNotify = true;
    } else if (temp < 10) {
        body = `❄️ 溫度低於 10°C，注意保暖！\n${body}`;
        shouldNotify = true;
    } else if (temp > 35) {
        body = `🌞 高溫超過 35°C，小心中暑！\n${body}`;
        shouldNotify = true;
    } else {
        shouldNotify = true; // 即便沒有特殊條件，也發出標準通知
    }

    if (!shouldNotify) return;

    const options = {
        body: body,
        icon: `https://openweathermap.org/img/wn/${current.weather[0].icon}.png`,
    };

    if (Notification.permission === "granted") {
        new Notification(title, options);
    } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                new Notification(title, options);
            }
        });
    }
}

function autoLocate() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (pos) => {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;
            const res = await fetch(`https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${API_KEY}`);
            const data = await res.json();
            const city = data[0]?.name || "Taipei";
            document.getElementById("cityInput").value = city;
            loadWeather(city);
        }, () => loadWeather("Taipei"));
    } else {
        loadWeather("Taipei");
    }
}

autoLocate();