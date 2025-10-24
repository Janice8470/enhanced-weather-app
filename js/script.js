// Main script.js for Enhanced Weather App
(function(){
  // Try to read CONFIG from js/config.js (user should copy config.example.js to config.js)
  const API_KEY = (typeof CONFIG !== 'undefined' && CONFIG.OPENWEATHER_API_KEY) ? CONFIG.OPENWEATHER_API_KEY : null;

  // DOM
  const searchForm = document.getElementById('searchForm');
  const cityInput = document.getElementById('cityInput');
  const weatherEl = document.getElementById('weather');
  const cityNameEl = document.getElementById('cityName');
  const dateEl = document.getElementById('date');
  const tempEl = document.getElementById('temp');
  const tempUnitEl = document.getElementById('tempUnit');
  const descEl = document.getElementById('desc');
  const weatherIconEl = document.getElementById('weatherIcon');
  const forecastEl = document.getElementById('forecast');
  const historyEl = document.getElementById('history');
  const detectBtn = document.getElementById('detectBtn');
  const unitToggle = document.getElementById('unitToggle');
  const unitLabel = document.getElementById('unitLabel');

  const STORAGE_KEY = 'enhanced-weather:history';
  const UNIT_KEY = 'enhanced-weather:unit';

  let unit = localStorage.getItem(UNIT_KEY) || 'metric'; // 'metric' or 'imperial'

  function init(){
    // set unit toggle
    unitToggle.checked = (unit === 'imperial');
    unitLabel.textContent = unit === 'metric' ? '°C' : '°F';
    tempUnitEl.textContent = unit === 'metric' ? '°C' : '°F';

    renderHistory();

    searchForm.addEventListener('submit', onSearch);
    detectBtn.addEventListener('click', detectLocation);
    unitToggle.addEventListener('change', onToggleUnit);

    // try to detect automatically (don't block if users deny)
    if (navigator.geolocation){
      navigator.geolocation.getCurrentPosition(pos => {
        const {latitude:lat, longitude:lon} = pos.coords;
        fetchWeatherByCoords(lat, lon, 'Your location');
      }, ()=>{/*ignore*/});
    }
  }

  function onSearch(e){
    e.preventDefault();
    const city = cityInput.value.trim();
    if (!city) return;
    fetchCoordsForCity(city).then(loc =>{
      if (loc) {
        saveToHistory(loc.name);
        fetchWeather(loc.lat, loc.lon, loc.name);
      } else {
        alert('City not found');
      }
    });
  }

  function onToggleUnit(){
    unit = unitToggle.checked ? 'imperial' : 'metric';
    localStorage.setItem(UNIT_KEY, unit);
    unitLabel.textContent = unit === 'metric' ? '°C' : '°F';
    tempUnitEl.textContent = unit === 'metric' ? '°C' : '°F';
    // if weather panel visible, re-fetch for last city
    const last = getLastHistory();
    if (last) {
      fetchCoordsForCity(last).then(loc => loc && fetchWeather(loc.lat, loc.lon, loc.name));
    }
  }

  async function fetchCoordsForCity(city){
    if (!API_KEY) { showMissingKey(); return; }
    try{
      const q = encodeURIComponent(city);
      const url = `https://api.openweathermap.org/geo/1.0/direct?q=${q}&limit=1&appid=${API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!data || !data.length) return null;
      return {lat: data[0].lat, lon: data[0].lon, name: data[0].name + (data[0].state ? (', '+data[0].state) : '') + ', ' + data[0].country };
    }catch(err){console.error(err); return null}
  }

  async function fetchWeatherByCoords(lat, lon, name){
    if (!API_KEY) { showMissingKey(); return; }
    // reverse geocode to try to get a nice name
    try{
      const rurl = `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${API_KEY}`;
      const rres = await fetch(rurl);
      const rdata = await rres.json();
      const prettyName = rdata && rdata[0] ? (rdata[0].name + ', ' + rdata[0].country) : name || 'Current location';
      saveToHistory(prettyName);
      fetchWeather(lat, lon, prettyName);
    }catch(err){
      console.error(err);
      fetchWeather(lat, lon, name || 'Current location');
    }
  }

  // Use free endpoints: current weather + 5-day/3-hour forecast (aggregate into days)
  async function fetchWeather(lat, lon, displayName){
    if (!API_KEY) { showMissingKey(); return; }
    try{
      // current weather
      const curUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=${unit}&appid=${API_KEY}`;
      const curRes = await fetch(curUrl);
      if (!curRes.ok) throw new Error('Current weather fetch failed');
      const cur = await curRes.json();

      // 5-day / 3-hour forecast
      const fUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=${unit}&appid=${API_KEY}`;
      const fRes = await fetch(fUrl);
      if (!fRes.ok) throw new Error('Forecast fetch failed');
      const fdata = await fRes.json();

      // populate current
      const now = new Date(cur.dt * 1000);
      cityNameEl.textContent = displayName;
      dateEl.textContent = now.toLocaleString();
      tempEl.textContent = Math.round(cur.main.temp);
      tempUnitEl.textContent = unit === 'metric' ? '°C' : '°F';
      descEl.textContent = cur.weather && cur.weather[0] ? cur.weather[0].description : '';
      const icon = cur.weather && cur.weather[0] ? cur.weather[0].icon : '';
      weatherIconEl.src = icon ? `https://openweathermap.org/img/wn/${icon}@2x.png` : '';

      // aggregate forecast into days (skip today)
      const daysMap = {};
      const todayStr = new Date().toISOString().slice(0,10);
      fdata.list.forEach(item =>{
        const d = new Date(item.dt * 1000);
        const dateStr = d.toISOString().slice(0,10);
        if (dateStr === todayStr) return; // skip today
        if (!daysMap[dateStr]) daysMap[dateStr] = [];
        daysMap[dateStr].push(item);
      });

      const dayKeys = Object.keys(daysMap).slice(0,5);
      const daily = dayKeys.map(k => {
        const arr = daysMap[k];
        let max = -Infinity, min = Infinity; let icon = '';
        arr.forEach(it => { max = Math.max(max, it.main.temp_max); min = Math.min(min, it.main.temp_min); });
        // choose icon near midday (12:00) or fallback to first
        const mid = arr.find(it => new Date(it.dt*1000).getHours()===12) || arr[0];
        icon = mid && mid.weather && mid.weather[0] ? mid.weather[0].icon : '';
        return { dt: new Date(k+'T00:00:00').getTime()/1000, max, min, icon };
      });

      renderForecast(daily);
      weatherEl.classList.remove('hidden');
    }catch(err){
      console.error(err);
      alert('Could not fetch weather. See console for details.');
    }
  }

  function renderForecast(days){
    forecastEl.innerHTML = '';
    days.forEach(d =>{
      const date = new Date(d.dt * 1000);
      const dayName = date.toLocaleDateString(undefined, {weekday:'short'});
      const max = Math.round(d.max);
      const min = Math.round(d.min);
      const icon = d.icon || '';

      const div = document.createElement('div');
      div.className = 'day';
      div.innerHTML = `
        <div class="dtop"><strong>${dayName}</strong></div>
        <img src="https://openweathermap.org/img/wn/${icon}.png" alt="">
        <div class="temps">${max}${unit === 'metric' ? '°C' : '°F'} / ${min}${unit === 'metric' ? '°C' : '°F'}</div>
      `;
      forecastEl.appendChild(div);
    });
  }

  function saveToHistory(city){
    if (!city) return;
    let list = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    // remove duplicates (case-insensitive)
    list = list.filter(c => c.toLowerCase() !== city.toLowerCase());
    list.unshift(city);
    if (list.length > 5) list = list.slice(0,5);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    renderHistory();
  }

  function renderHistory(){
    historyEl.innerHTML = '';
    const list = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    list.forEach(city =>{
      const btn = document.createElement('button');
      btn.textContent = city;
      btn.addEventListener('click', ()=>{
        cityInput.value = city;
        fetchCoordsForCity(city).then(loc=> loc && fetchWeather(loc.lat, loc.lon, loc.name));
      });
      historyEl.appendChild(btn);
    });
  }

  function getLastHistory(){
    const list = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return list.length ? list[0] : null;
  }

  function detectLocation(){
    if (!navigator.geolocation){
      alert('Geolocation not supported by your browser');
      return;
    }
    navigator.geolocation.getCurrentPosition(pos => {
      const {latitude:lat, longitude:lon} = pos.coords;
      fetchWeatherByCoords(lat, lon, 'Current location');
    }, err=>{
      alert('Could not get location: ' + (err.message || err.code));
    });
  }

  function showMissingKey(){
    alert('No OpenWeatherMap API key found. Please copy js/config.example.js to js/config.js and add your key. See README.');
  }

  // init
  window.addEventListener('DOMContentLoaded', init);

})();
