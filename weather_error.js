const API_KEY = "41876783c505135c13dec9105265e95d"; // ← 替換為你自己的 OpenWeatherMap 金鑰
window.hourlyChart = null;

async function loadWeather() {
  const city = document.getElementById('cityInput').value.trim();
  if (!city) return alert("請輸入城市名稱");

  try {
    const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${API_KEY}&lang=zh_tw`);
    if (!res.ok) throw new Error("找不到該城市");

    const current = await res.json();

    document.getElementById('currentWeather').innerHTML = `
      <h3>${current.name}</h3>
      <p>${current.weather[0].description}，溫度：${current.main.temp}°C</p>
      <img src="https://openweathermap.org/img/wn/${current.weather[0].icon}.png" alt="icon" />
    `;

    notifyWeather(current);
    updateMap(current.coord.lat, current.coord.lon, current.name);

    const forecastRes = await fetch(`https://api.openweathermap.org/data/3.0/onecall?lat=${current.coord.lat}&lon=${current.coord.lon}&exclude=minutely,alerts&units=metric&appid=${API_KEY}&lang=zh_tw`);
    const forecast = await forecastRes.json();

    updateHourlyChart(forecast.hourly);
    updateForecastList(forecast.daily);

  } catch (err) {
    alert("天氣資料取得失敗：" + err.message);
  }
}

function notifyWeather(current) {
  if (typeof Notification === 'undefined') return;

  const temp = current.main.temp;
  const pop = current.pop || 0;
  let title = `${current.name} 天氣提醒`;
  let body = `${current.weather[0].description}，目前溫度：${temp}°C`;

  if (pop > 0.6) body = `🌧️ 降雨機率高！\\n${body}`;
  else if (temp < 10) body = `❄️ 天氣寒冷！\\n${body}`;
  else if (temp > 35) body = `🌞 氣溫過高！\\n${body}`;

  const options = {
    body,
    icon: `https://openweathermap.org/img/wn/${current.weather[0].icon}.png`,
  };

  if (Notification.permission === "granted") {
    new Notification(title, options);
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then(p => {
      if (p === "granted") new Notification(title, options);
    });
  }
}

function updateHourlyChart(hourly) {
  const labels = hourly.slice(0, 12).map(h => new Date(h.dt * 1000).getHours() + "時");
  const temps = hourly.slice(0, 12).map(h => h.temp);

  const ctx = document.getElementById("hourlyChart").getContext("2d");
  if (window.hourlyChart) window.hourlyChart.destroy();

  window.hourlyChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "溫度 (°C)",
        data: temps,
        borderColor: "#fff",
        backgroundColor: "rgba(255,255,255,0.2)",
        tension: 0.3
      }]
    },
    options: {
      scales: {
        x: { ticks: { color: "#fff" }, grid: { color: "rgba(255,255,255,0.1)" } },
        y: { ticks: { color: "#fff" }, grid: { color: "rgba(255,255,255,0.1)" } }
      },
      plugins: { legend: { labels: { color: "#fff" } } }
    }
  });
}

function updateForecastList(daily) {
  const forecastList = document.getElementById("forecastList");
  forecastList.innerHTML = "";

  daily.slice(1, 6).forEach(day => {
    const date = new Date(day.dt * 1000);
    const desc = day.weather[0].description;
    const icon = day.weather[0].icon;
    const tempMin = day.temp.min.toFixed(1);
    const tempMax = day.temp.max.toFixed(1);

    const div = document.createElement("div");
    div.className = `forecast-day ${
      desc.includes("雨") ? "rain" :
      desc.includes("雲") ? "clouds" :
      desc.includes("雪") ? "snow" : "sunny"
    }`;

    div.innerHTML = `
      <h6>${date.getMonth() + 1}/${date.getDate()}</h6>
      <img src="https://openweathermap.org/img/wn/${icon}.png" class="forecast-icon" />
      <p>${desc}</p>
      <p>${tempMin}°C ~ ${tempMax}°C</p>
    `;

    forecastList.appendChild(div);
  });
}

let map = null;
let marker = null;

function updateMap(lat, lon, name) {
  if (!map) {
    map = L.map('map').setView([lat, lon], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);
  } else {
    map.setView([lat, lon], 10);
    if (marker) map.removeLayer(marker);
  }

  marker = L.marker([lat, lon]).addTo(map)
    .bindPopup(`${name}`)
    .openPopup();
}
