const searchBtn = document.getElementById('search-btn');
const cityInput = document.getElementById('city-input');
const weatherInfo = document.getElementById('weather-info');
const errorMessage = document.getElementById('error-message');

// API mappings for Open-Meteo weather codes to icons/descriptions
const weatherCodeMap = {
    0: { desc: 'Clear sky', icon: 'sun' },
    1: { desc: 'Mainly clear', icon: 'cloud-sun' },
    2: { desc: 'Partly cloudy', icon: 'cloud-sun' },
    3: { desc: 'Overcast', icon: 'cloud' },
    45: { desc: 'Fog', icon: 'smog' },
    48: { desc: 'Depositing rime fog', icon: 'smog' },
    51: { desc: 'Light drizzle', icon: 'cloud-rain' },
    53: { desc: 'Moderate drizzle', icon: 'cloud-rain' },
    55: { desc: 'Dense drizzle', icon: 'cloud-showers-heavy' },
    61: { desc: 'Slight rain', icon: 'cloud-rain' },
    63: { desc: 'Moderate rain', icon: 'cloud-rain' },
    65: { desc: 'Heavy rain', icon: 'cloud-showers-heavy' },
    71: { desc: 'Slight snow', icon: 'snowflake' },
    73: { desc: 'Moderate snow', icon: 'snowflake' },
    75: { desc: 'Heavy snow', icon: 'snowflake' },
    95: { desc: 'Thunderstorm', icon: 'bolt' },
    96: { desc: 'Thunderstorm with hail', icon: 'bolt' },
    99: { desc: 'Heavy thunderstorm', icon: 'bolt' }
};

// Map icons to animated weather SVGs
function getIconUrl(iconCode) {
    const iconBase = "https://www.amcharts.com/wp-content/themes/amcharts4/css/img/icons/weather/animated/";
    const map = {
        'sun': 'day.svg',
        'cloud-sun': 'cloudy-day-1.svg',
        'cloud': 'cloudy.svg',
        'smog': 'cloudy.svg',
        'cloud-rain': 'rainy-1.svg',
        'cloud-showers-heavy': 'rainy-3.svg',
        'snowflake': 'snowy-1.svg',
        'bolt': 'thunder.svg'
    };
    return iconBase + (map[iconCode] || 'day.svg');
}

function getSafeCity(raw) {
    return raw.trim().replace(/[^a-zA-Z\s,'-]/g, '');
}

searchBtn.addEventListener('click', () => {
    const city = getSafeCity(cityInput.value);
    if (city !== '') fetchWeather(city);
});

cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const city = getSafeCity(cityInput.value);
        if (city !== '') fetchWeather(city);
    }
});

async function fetchWeather(city) {
    try {
        // Hide UI while loading
        weatherInfo.classList.add('hidden');
        errorMessage.classList.add('hidden');
        
        // 1. Geocoding: Get lat/lon for the city name using Nominatim API
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}`);
        const geoData = await geoRes.json();
        
        if (geoData.length === 0) {
            showError();
            return;
        }
        
        const lat = geoData[0].lat;
        const lon = geoData[0].lon;
        const displayName = geoData[0].display_name.split(',')[0]; // Get the main city name
        
        // 2. Fetch weather from Open-Meteo using lat/lon
        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=relativehumidity_2m&daily=sunrise,sunset&timezone=auto`);
        const weatherData = await weatherRes.json();
        
        updateUI(displayName, weatherData);
        
    } catch (error) {
        console.error("Error fetching weather:", error);
        showError();
    }
}

function updateUI(city, data) {
    errorMessage.classList.add('hidden');
    weatherInfo.classList.remove('hidden');
    
    const current = data.current_weather;
    
    // Get humidity from the first hour as an approximation for current
    const humidity = data.hourly.relativehumidity_2m[0] || 50; 
    
    const weatherInfoCode = weatherCodeMap[current.weathercode] || { desc: 'Unknown', icon: 'sun' };
    
    // Calculate exact real local time using the timezone offset
    const now = new Date();
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const exactLocalTime = new Date(utcTime + (data.utc_offset_seconds * 1000));
    
    const options = { weekday: 'long', hour: 'numeric', minute: '2-digit' };
    const timeString = exactLocalTime.toLocaleString('en-US', options);
    
    document.getElementById('city-name').textContent = city;
    document.getElementById('date-time').textContent = timeString;
    document.getElementById('temperature').textContent = `${Math.round(current.temperature)}°C`;
    document.getElementById('description').textContent = weatherInfoCode.desc;
    document.getElementById('wind-speed').textContent = `${Math.round(current.windspeed)} km/h`;
    document.getElementById('humidity').textContent = `${humidity}%`;
    
    // Parse Sunrise and Sunset
    if (data.daily && data.daily.sunrise && data.daily.sunset) {
        const sunriseDate = new Date(data.daily.sunrise[0]);
        const sunsetDate = new Date(data.daily.sunset[0]);
        
        const timeOptions = { hour: 'numeric', minute: '2-digit' };
        document.getElementById('sunrise').textContent = sunriseDate.toLocaleString('en-US', timeOptions);
        document.getElementById('sunset').textContent = sunsetDate.toLocaleString('en-US', timeOptions);
    }
    
    document.getElementById('weather-icon').src = getIconUrl(weatherInfoCode.icon);
    
    // Apply Day/Night Theme
    if (current.is_day === 0) {
        document.body.classList.add('night-mode');
    } else {
        document.body.classList.remove('night-mode');
    }
}

function showError() {
    weatherInfo.classList.add('hidden');
    errorMessage.classList.remove('hidden');
}

async function fetchWeatherByCoords(lat, lon) {
    try {
        weatherInfo.classList.add('hidden');
        errorMessage.classList.add('hidden');
        
        // Reverse geocoding to get city name
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
        const geoData = await geoRes.json();
        const city = geoData.address.city || geoData.address.town || geoData.address.village || geoData.address.county || "Current Location";
        
        // Fetch weather from Open-Meteo using lat/lon
        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=relativehumidity_2m&daily=sunrise,sunset&timezone=auto`);
        const weatherData = await weatherRes.json();
        
        updateUI(city, weatherData);
        
    } catch (error) {
        console.error("Error fetching weather by coords:", error);
        showError();
    }
}

// Location Button Logic
const locationBtn = document.getElementById('location-btn');
locationBtn.addEventListener('click', () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            fetchWeatherByCoords(position.coords.latitude, position.coords.longitude);
        }, () => {
            errorMessage.textContent = 'Could not get your location. Please enable location services.';
            showError();
        });
    } else {
        errorMessage.textContent = 'Geolocation is not supported by your browser.';
        showError();
    }
});

// Recommendation Chips Logic
const recChips = document.querySelectorAll('.rec-chip');
recChips.forEach(chip => {
    chip.addEventListener('click', () => {
        fetchWeather(chip.getAttribute('data-city'));
    });
});

// On load: try to get user's location, fallback to London
window.addEventListener('load', () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            fetchWeatherByCoords(position.coords.latitude, position.coords.longitude);
        }, error => {
            console.log("Geolocation denied or failed. Fallback to London.");
            fetchWeather('London');
        });
    } else {
        fetchWeather('London');
    }
});
