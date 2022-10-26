const API_KEY = '6c2c13cdc0f2b50d2a5812e6b8f0628d';

// Returns a promise which will have a location object once resolved
function getLocation(locationStr) {
  // convert location to lat and lon coords
  let requiredInfo = {
    'lat': 0,
    'lon': 0,
    'city': '',
    'state': '',
    'country': '',
  };
  locationStr = locationStr.replace(/\s/g, '');
  return fetch(`http://api.openweathermap.org/geo/1.0/direct?q=${locationStr}&limit=5&appid=${API_KEY}`, {mode: 'cors'})
    .then(function(response) {
      let responseJSON = response.json();
      return responseJSON;
    })
    .then(function(responseJSON) {
      if (responseJSON.length === 0) {
        throw new Error(`No location found using search string: ${locationStr}`);
      }
      locationJSON = responseJSON[0];
      requiredInfo = {
        'lat': locationJSON['lat'],
        'lon': locationJSON['lon'],
        'city': locationJSON['name'],
        'state': locationJSON['lat'] !== undefined ? locationJSON['lat'] : 'none',
        'country': locationJSON['country'],
      };
      return requiredInfo;
    })
    .catch(function(err) {
      console.log(err);
    });
}

// Returns weather object with all necessary data used in the application
async function getAllWeatherData(locationStr, units) {
  let locationInfo = await getLocation(locationStr);
  let weatherInfo = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${locationInfo['lat']}&lon=${locationInfo['lon']}&appid=${API_KEY}&units=${units}`)
    .then((response) => response.json())
    .catch((err) => console.log(err));
  console.log(weatherInfo);
  return weatherInfo;
}

async function getWeather(locationStr, units='imperial') {
  let allWeatherInfo = await getAllWeatherData(locationStr, units);
  let usedWeatherInfo = {
    'locationName': allWeatherInfo.name,
    'temperature': allWeatherInfo.main.temp,
    'feelsLike': allWeatherInfo.main.feels_like,
    'description': allWeatherInfo.weather[0].description,
    'tempHigh': allWeatherInfo.main.temp_max,
    'tempLow': allWeatherInfo.main.temp_min,
    'humidity': allWeatherInfo.main.humidity,
    // 'rainProbability'
    'sunRise': allWeatherInfo.sys.sunrise,
    'sunSet': allWeatherInfo.sys.sunset,
  }
  console.log(usedWeatherInfo);
  updatePage(usedWeatherInfo);
}
getWeather('Miami, US');

function updatePage(usedWeatherInfo) {
  let locationTitle = document.querySelector('.location-title');
  locationTitle.textContent = usedWeatherInfo.locationName;

  let temperature = document.querySelector('.current-temp');
  temperature.textContent = `${usedWeatherInfo.temperature}°`;

  let feelsLike = document.querySelector('.feels-like');
  feelsLike.textContent = `Feels like: ${usedWeatherInfo.feelsLike}°`;

  let description = document.querySelector('.current-weather-description');
  description.textContent = usedWeatherInfo.description;

  let tempHigh = document.querySelector('.high-temp');
  tempHigh.textContent = `H: ${usedWeatherInfo.tempHigh}°`;

  let tempLow = document.querySelector('.low-temp');
  tempLow.textContent = `L: ${usedWeatherInfo.tempLow}°`;

  let humidity = document.querySelector('.humidity');
  humidity.textContent = `Humidity: ${usedWeatherInfo.humidity}`;
  
  // assign value to rain chance
  
  // assign value to sunrise/set
}