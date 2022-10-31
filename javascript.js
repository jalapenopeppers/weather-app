// import {format} from 'date-fns';

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

// Returns object with all necessary data used for forecast
async function getAllForecastData(locationStr, units) {
  let locationInfo = await getLocation(locationStr);
  let forecastInfo = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${locationInfo['lat']}&lon=${locationInfo.lon}&appid=${API_KEY}&units=${units}`)
    .then((response) => response.json())
    .catch((err) => console.log(err));
  return forecastInfo;
}

// Returns object with the hourly forecasts for the next several hours.
//   The free version of OpenWeather API allows hourly forecasts in 3 hour blocks
function getHourlyForecast(allForecastData) {
  let dataPoints = allForecastData['list'];
  let hourlyForecast = {};
  let hourIndex = 0;
  for (let dataPoint of dataPoints) {
    if (hourIndex > 4) {
      break;
    }
   hourlyForecast[`${hourIndex}hr`] = {
     'hour': unixToHour(dataPoint.dt),
     'temp': Math.round(dataPoint.main.temp),
     'description': dataPoint.weather['0'].description,
     'category': dataPoint.weather['0'].main,
     'rain': Math.round(dataPoint.pop * 100),
   }
    hourIndex++;
  }

  return hourlyForecast;
}

// Returns object with the daily forecasts for the next several days.
//   The forecasts are made by averaging the hourly forecasts
function getDailyForecast(allForecastData) {
  let dataPoints = allForecastData['list'];
  let dailyForecast = {};
  let index = 1;
  let dayIndex = 0;
  let tempSum = 0;
  let highestRainProbability = 0;
  for (let dataPoint of dataPoints) {
    if (index % 8 === 0) {
      dayIndex++;
      dailyForecast[`${dayIndex}d`] = {
        'day': unixToDay(dataPoint.dt),
        'temp': Math.round(tempSum / 8),
        'description': dataPoint.weather['0'].description, // fix this to be more accurate
        'category': dataPoint.weather['0'].main,
        'rain': Math.round(highestRainProbability * 100),
      }
      tempSum = 0;
      highestRainProbability = 0;
    }
    tempSum += dataPoint.main.temp;
    highestRainProbability = (dataPoint.pop > highestRainProbability) ? dataPoint.pop : highestRainProbability;
    index++;
  }

  return dailyForecast;
}

// Returns given UNIX time in seconds into an hour time
function unixToHour(unixTime) {
  let milliSec = unixTime * 1000;
  const dateObj = new Date(milliSec);
  let hours = dateObj.getHours();
  let hourStr = '';
  if (hours < 12) {
    hourStr = `${hours} am`;
  } else {
    hourStr =  `${hours - 12} pm`;
  }
  return hourStr;
}

// Returns given UNIX time in seconds into a day string
function unixToDay(unixTime) {
  let milliSec = unixTime * 1000;
  const dateObj = new Date(milliSec);
  let day = dateObj.getDay();
  let dayStr = '';
  if (day === 0) {
    dayStr = 'Sun';
  } else if (day === 1) {
    dayStr = 'Mon';
  } else if (day === 2) {
    dayStr = 'Tue';
  } else if (day === 3) {
    dayStr = 'Wed';
  } else if (day === 4) {
    dayStr = 'Thu';
  } else if (day === 5) {
    dayStr = 'Fri';
  } else if (day === 6) {
    dayStr = 'Sat';
  }

  return dayStr;
}

async function getWeather(locationStr, units='imperial') {
  let allWeatherInfo = await getAllWeatherData(locationStr, units);
  console.log(allWeatherInfo);
  let usedWeatherInfo = {
    'locationName': allWeatherInfo.name,
    'temperature': allWeatherInfo.main.temp,
    'feelsLike': allWeatherInfo.main.feels_like,
    'description': allWeatherInfo.weather[0].description,
    'category' : allWeatherInfo.weather[0].main,
    'tempHigh': allWeatherInfo.main.temp_max,
    'tempLow': allWeatherInfo.main.temp_min,
    'humidity': allWeatherInfo.main.humidity,
    // 'rainProbability'
    'time' : allWeatherInfo.dt,
    'sunRise': allWeatherInfo.sys.sunrise,
    'sunSet': allWeatherInfo.sys.sunset,
  }
  // console.log(usedWeatherInfo);

  let allForecastData = await getAllForecastData(locationStr, units);
  console.log(allForecastData);
  let hourlyForecast = getHourlyForecast(allForecastData);
  console.log(hourlyForecast);
  let dailyForecast = getDailyForecast(allForecastData);
  console.log(dailyForecast);
  updatePage(usedWeatherInfo, hourlyForecast, dailyForecast);
}

function updatePage(usedWeatherInfo, hourlyForecast, dailyForecast) {
  let locationTitle = document.querySelector('.location-title');
  locationTitle.textContent = usedWeatherInfo.locationName;

  let temperature = document.querySelector('.current-temp');
  temperature.textContent = `${Math.round(usedWeatherInfo.temperature)}°`;

  let icon = document.querySelector('img.current-weather-icon');
  icon.setAttribute('src', getIcon(
    usedWeatherInfo.category, 
    usedWeatherInfo.description, 
    usedWeatherInfo.time, 
    usedWeatherInfo.sunset
  ));

  let feelsLike = document.querySelector('.feels-like');
  feelsLike.textContent = `Feels like: ${Math.round(usedWeatherInfo.feelsLike)}°`;

  let description = document.querySelector('.current-weather-description');
  description.textContent = usedWeatherInfo.description;

  let tempHigh = document.querySelector('.high-temp');
  tempHigh.textContent = `H: ${Math.round(usedWeatherInfo.tempHigh)}°`;

  let tempLow = document.querySelector('.low-temp');
  tempLow.textContent = `L: ${Math.round(usedWeatherInfo.tempLow)}°`;

  let humidity = document.querySelector('.humidity');
  humidity.textContent = `Humidity: ${Math.round(usedWeatherInfo.humidity)}%`;
  
  let currentRain = document.querySelector('.rain-probability');
  currentRain.textContent = `Rain: ${hourlyForecast['0hr'].rain}%`;

  // assign value to sunrise/set

  // update hourly forecast values
  let forecastNow = document.querySelector('.forecast-0-hour');
  // update icon
  let forecastNowTemp = document.querySelector('.forecast-0-hour .forecast-temp');
  forecastNowTemp.textContent = `${Math.round(usedWeatherInfo.temperature)}°`;
  for (let i = 1; i < 6; i++) {
    let hourlyForecastTime = document.querySelector(`.forecast-${i}-hour .forecast-time`);
    hourlyForecastTime.textContent = `${hourlyForecast[`${i - 1}hr`].hour}`;
    let hourlyForecastIcon = document.querySelector(`.forecast-${i}-hour .forecast-icon`);
    // hourlyForecastTime.textContent = hourlyForecast{`${i - 1}hr`}.hour;
    let hourlyForecastTemp = document.querySelector(`.forecast-${i}-hour .forecast-temp`);
    hourlyForecastTemp.textContent = `${hourlyForecast[`${i - 1}hr`].temp}°`;
    let hourlyForecastRain = document.querySelector(`.forecast-${i}-hour .forecast-rain`);
    hourlyForecastRain.textContent = `🌧${hourlyForecast[`${i - 1}hr`].rain}%`;
  }

  // update daily forecast values
  let forecastNowDailyTemp = document.querySelector('.forecast-0-day .forecast-temp');
  forecastNowDailyTemp.textContent = `${Math.round(usedWeatherInfo.temperature)}°`;
  // Update icon
  let forecastNowDailyRain = document.querySelector('.forecast-0-day .forecast-rain');
  forecastNowDailyRain.textContent = `🌧${hourlyForecast['0hr'].rain}%`;
  for (let i = 1; i < 6; i++) {
    let dailyForecastTime = document.querySelector(`.forecast-${i}-day .forecast-time`);
    dailyForecastTime.textContent = `${dailyForecast[`${i}d`].day}`;
    let dailyForecastIcon = document.querySelector(`.forecast-${i}-day .forecast-icon`);
    // dailyForecastIcon.textContent = dailyForecast{`${i}d`}.hour;
    let dailyForecastTemp = document.querySelector(`.forecast-${i}-day .forecast-temp`);
    dailyForecastTemp.textContent = `${dailyForecast[`${i}d`].temp}°`;
    let dailyForecastRain = document.querySelector(`.forecast-${i}-day .forecast-rain`);
    dailyForecastRain.textContent = `🌧${dailyForecast[`${i}d`].rain}%`;
  }
  
}

// Switches between displayed forecasss when button is clicked
function switchDisplayedForecasts() {
  let forecastGrid = document.querySelector('.forecast-grid');
  if (forecastGrid.dataset.forecastType === 'hourly') {
    forecastGrid.dataset.forecastType = 'daily';
    forecastGrid.style.transform = `translate(0, -50%)`;
  } else {
    forecastGrid.dataset.forecastType = 'hourly';
    forecastGrid.style.transform = `translate(0, 0)`;
  }
}

// Returns an icon path given a weather category and using the current time
function getIcon(categoryStr, description, currentTime = 0, sunsetTime = 0) {
  let iconPath = '';
  if (categoryStr === 'Thunderstorm') {
    iconPath = './icons/weather-lightning.svg';
  } else if (categoryStr === 'Drizzle' || categoryStr === 'Rain') {
    iconPath = './icons/weather-pouring.svg';
  } else if (categoryStr === 'Snow') {
    iconPath = './icons/weather-snow-heavy.svg';
  } else if (categoryStr === 'Clear') {
    if (currentTime < sunsetTime) {
      iconPath = './icons/weather-night.svg';
    } else {
      iconPath = './icons/weather-sunny.svg';
    }
  } else if (categoryStr === 'Clouds') {
    if (currentTime < sunsetTime) {
      iconPath = './icons/weather-night-partly-cloudy.svg';
    } else {
      if (description === 'overcast clouds') {
        iconPath = './icons/weather-cloudy.svg';
      } else {
        iconPath = './icons/weather-partly-cloudy.svg';
      }
    }
  }
  return iconPath;
}

// Attach event handlers
function attachEventHandlers() {
  let switchForecastsButton = document.querySelector('button.switch-forecasts-button');
  switchForecastsButton.addEventListener('click', switchDisplayedForecasts);
}

function setUpApp() {
  attachEventHandlers();
  getWeather('Miami, US');
}
setUpApp();