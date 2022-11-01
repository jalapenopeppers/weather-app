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
  return fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${locationStr}&limit=5&appid=${API_KEY}`, {mode: 'cors'})
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
        'state': locationJSON['state'] !== undefined ? locationJSON['state'] : 'none',
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
  return Object.assign({'locationInfo' : locationInfo}, weatherInfo);
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
function getHourlyForecast(allForecastData, timezoneOffset) {
  let dataPoints = allForecastData['list'];
  let hourlyForecast = {};
  let hourIndex = 0;
  for (let dataPoint of dataPoints) {
    if (hourIndex > 4) {
      break;
    }
   hourlyForecast[`${hourIndex}hr`] = {
     'hour': unixToHour(dataPoint.dt, timezoneOffset),
     'time': dataPoint.dt,
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
function getDailyForecast(allForecastData, timezoneOffset) {
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
        'day': unixToDay(dataPoint.dt, timezoneOffset),
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
function unixToHour(unixTime, timezoneOffset) {
  let milliSec = (unixTime + timezoneOffset) * 1000;
  const dateObj = new Date(milliSec);
  let hours = dateObj.getUTCHours();
  let timeStr = '';
  if (hours === 0) {
    timeStr = `12 am`;
  } else if (hours < 13) {
    timeStr = `${hours} am`;
  } else {
    timeStr =  `${hours - 12} pm`;
  }
  return timeStr;
}

// Returns given UNIX time in seconds into a time of form #:## am (ex: 7:45 pm)
function unixToFullHour(unixTime, timezoneOffset) {
  let milliSec = (unixTime + timezoneOffset) * 1000;
  const dateObj = new Date(milliSec);
  let hours = dateObj.getUTCHours();
  let minutes = dateObj.getUTCMinutes();
  let timeStr = '';
  if (hours === 0) {
    timeStr = `12:${String(minutes).padStart(2, '0')} am`;
  } else if (hours < 13) {
    timeStr = `${hours}:${String(minutes).padStart(2, '0')} am`;
  } else {
    timeStr =  `${hours - 12}:${String(minutes).padStart(2, '0')} pm`;
  }
  return timeStr;
}

// Returns given UNIX time in seconds into a day string
function unixToDay(unixTime, timezoneOffset) {
  let milliSec = (unixTime + timezoneOffset) * 1000;
  const dateObj = new Date(milliSec);
  let day = dateObj.getUTCDay();
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

// Returns given string with first letter capitalized
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

async function getWeather(locationStr, units='imperial') {
  let allWeatherInfo = await getAllWeatherData(locationStr, units);
  // console.log(allWeatherInfo);
  let usedWeatherInfo = {
    'locationName': allWeatherInfo.name,
    'locationState': allWeatherInfo.locationInfo.state,
    'locationCountry': allWeatherInfo.locationInfo.country,
    'temperature': allWeatherInfo.main.temp,
    'feelsLike': allWeatherInfo.main.feels_like,
    'description': allWeatherInfo.weather[0].description,
    'category' : allWeatherInfo.weather[0].main,
    'tempHigh': allWeatherInfo.main.temp_max,
    'tempLow': allWeatherInfo.main.temp_min,
    'humidity': allWeatherInfo.main.humidity,
    'time' : allWeatherInfo.dt,
    'timezoneOffset' : allWeatherInfo.timezone,
    'sunrise': allWeatherInfo.sys.sunrise,
    'sunset': allWeatherInfo.sys.sunset,
  }
  console.log(usedWeatherInfo);

  let allForecastData = await getAllForecastData(locationStr, units);
  console.log(allForecastData);
  let hourlyForecast = getHourlyForecast(allForecastData, usedWeatherInfo.timezoneOffset);
  console.log(hourlyForecast);
  let dailyForecast = getDailyForecast(allForecastData, usedWeatherInfo.timezoneOffset);
  console.log(dailyForecast);
  updatePage(usedWeatherInfo, hourlyForecast, dailyForecast);
}

// Updates site visually
function updatePage(usedWeatherInfo, hourlyForecast, dailyForecast) {
  let body = document.querySelector('body');
  body.style.backgroundImage =  `url(${getBackgroundImage(
    usedWeatherInfo.category, 
    usedWeatherInfo.description, 
    usedWeatherInfo.time, 
    usedWeatherInfo.sunset
  )})`;
  
  let locationTitle = document.querySelector('.location-title');
  if (usedWeatherInfo.locationState !== 'none') {
    locationTitle.textContent = `${usedWeatherInfo.locationName}, ${usedWeatherInfo.locationState}`;
  } else {
    locationTitle.textContent = `${usedWeatherInfo.locationName}, ${usedWeatherInfo.locationCountry}`;
  }

  let temperature = document.querySelector('.current-temp');
  temperature.textContent = `${Math.round(usedWeatherInfo.temperature)}`;

  let icon = document.querySelector('img.current-weather-icon');
  icon.setAttribute('src', getIcon(
    usedWeatherInfo.category, 
    usedWeatherInfo.description, 
    usedWeatherInfo.time, 
    usedWeatherInfo.sunrise,
    usedWeatherInfo.sunset
  ));

  let feelsLike = document.querySelector('.feels-like');
  feelsLike.textContent = `Feels like: ${Math.round(usedWeatherInfo.feelsLike)}°`;

  let description = document.querySelector('.current-weather-description');
  description.textContent = capitalizeFirstLetter(usedWeatherInfo.description);

  let tempHigh = document.querySelector('.high-temp');
  tempHigh.textContent = `H: ${Math.round(usedWeatherInfo.tempHigh)}°`;

  let tempLow = document.querySelector('.low-temp');
  tempLow.textContent = `L: ${Math.round(usedWeatherInfo.tempLow)}°`;

  let humidity = document.querySelector('.humidity');
  humidity.textContent = `Humidity: ${Math.round(usedWeatherInfo.humidity)}%`;
  
  let currentRain = document.querySelector('.rain-probability');
  currentRain.textContent = `Rain: ${hourlyForecast['0hr'].rain}%`;

  let sunriseTime = document.querySelector('.sunrise-time-text');
  sunriseTime.textContent = unixToFullHour(usedWeatherInfo.sunrise, usedWeatherInfo.timezoneOffset);

  let sunsetTime = document.querySelector('.sunset-time-text');
  sunsetTime.textContent = unixToFullHour(usedWeatherInfo.sunset, usedWeatherInfo.timezoneOffset);

  // update hourly forecast values
  let forecastNow = document.querySelector('.forecast-0-hour');
  
  let forecastNowHourlyIcon = document.querySelector('.forecast-0-hour img.forecast-icon');
  forecastNowHourlyIcon.setAttribute('src', getIcon(
    usedWeatherInfo.category, 
    usedWeatherInfo.description, 
    usedWeatherInfo.time, 
    usedWeatherInfo.sunrise,
    usedWeatherInfo.sunset
  ));

  let forecastNowTemp = document.querySelector('.forecast-0-hour .forecast-temp');
  forecastNowTemp.textContent = `${Math.round(usedWeatherInfo.temperature)}°`;
  for (let i = 1; i < 6; i++) {
    let hourlyForecastTime = document.querySelector(`.forecast-${i}-hour .forecast-time`);
    hourlyForecastTime.textContent = `${hourlyForecast[`${i - 1}hr`].hour}`;
    let hourlyForecastIcon = document.querySelector(`.forecast-${i}-hour .forecast-icon`);
    hourlyForecastIcon.setAttribute('src', getIcon(
      hourlyForecast[`${i-1}hr`].category, 
      hourlyForecast[`${i-1}hr`].description, 
      hourlyForecast[`${i-1}hr`].time,
      usedWeatherInfo.sunrise,
      usedWeatherInfo.sunset
    ));
    // console.log(`Current time: ${usedWeatherInfo.time}, Sunrise: ${usedWeatherInfo.sunrise}, Sunset: ${usedWeatherInfo.sunset}`);
    let hourlyForecastTemp = document.querySelector(`.forecast-${i}-hour .forecast-temp`);
    hourlyForecastTemp.textContent = `${hourlyForecast[`${i - 1}hr`].temp}°`;
    let hourlyForecastRain = document.querySelector(`.forecast-${i}-hour .forecast-rain`);
    hourlyForecastRain.textContent = `🌧${hourlyForecast[`${i - 1}hr`].rain}%`;
  }

  // update daily forecast values
  let forecastNowDailyTemp = document.querySelector('.forecast-0-day .forecast-temp');
  forecastNowDailyTemp.textContent = `${Math.round(usedWeatherInfo.temperature)}°`;
  
  let forecastNowDailyIcon = document.querySelector('.forecast-0-day img.forecast-icon');
  forecastNowDailyIcon.setAttribute('src', getIcon(
    usedWeatherInfo.category, 
    usedWeatherInfo.description, 
    usedWeatherInfo.time,
    usedWeatherInfo.sunrise,
    usedWeatherInfo.sunset
  ));

  let forecastNowDailyRain = document.querySelector('.forecast-0-day .forecast-rain');
  forecastNowDailyRain.textContent = `🌧${hourlyForecast['0hr'].rain}%`;
  for (let i = 1; i < 6; i++) {
    let dailyForecastTime = document.querySelector(`.forecast-${i}-day .forecast-time`);
    dailyForecastTime.textContent = `${dailyForecast[`${i}d`].day}`;
    let dailyForecastIcon = document.querySelector(`.forecast-${i}-day .forecast-icon`);
    dailyForecastIcon.setAttribute('src', getIcon(
      dailyForecast[`${i}d`].category, 
      dailyForecast[`${i}d`].description,
    ));
    let dailyForecastTemp = document.querySelector(`.forecast-${i}-day .forecast-temp`);
    dailyForecastTemp.textContent = `${dailyForecast[`${i}d`].temp}°`;
    let dailyForecastRain = document.querySelector(`.forecast-${i}-day .forecast-rain`);
    dailyForecastRain.textContent = `🌧${dailyForecast[`${i}d`].rain}%`;
  }
  
}

// Switches between displayed forecasss when button is clicked
function switchDisplayedForecasts() {
  let forecastGrid = document.querySelector('.forecast-grid');
  // console.log(forecastGrid.dataset.forecastType);
  if (forecastGrid.dataset.forecastType === 'hourly') {
    forecastGrid.dataset.forecastType = 'daily';
    forecastGrid.style.transform = `translate(0, -50%)`;
  } else {
    forecastGrid.dataset.forecastType = 'hourly';
    forecastGrid.style.transform = `translate(0, 0)`;
  }
}

// Returns an icon path given a weather category and using the current time
function getIcon(categoryStr, description, currentTime = 0, sunriseTime = 0, sunsetTime = 0) {
  /*
    Math explanation: there are 86400 seconds in a day. sunsetTime - sunriseTime gives time in seconds
      between the events within the current day. Subtracting that from 86400 provides an approximate
      length of time between the current day's sunset and the next day's sunrise which is then used to
      estimate the next sunrise time.
  */
  let nextSunriseTime = sunsetTime + (86400 - (sunsetTime - sunriseTime));
  let iconPath = '';
  if (categoryStr === 'Thunderstorm') {
    iconPath = './icons/weather-lightning.svg';
  } else if (categoryStr === 'Drizzle' || categoryStr === 'Rain') {
    iconPath = './icons/weather-pouring.svg';
  } else if (categoryStr === 'Snow') {
    iconPath = './icons/weather-snowy-heavy.svg';
  } else if (categoryStr === 'Clear') {
    if (currentTime <= sunsetTime || currentTime >= nextSunriseTime) {
      // console.log(`Curr time: ${currentTime} Next sunrise: ${nextSunriseTime}`);
      iconPath = './icons/weather-sunny.svg';
    } else {
      iconPath = './icons/weather-night.svg';
    }
  } else if (categoryStr === 'Clouds') {
    if (currentTime <= sunsetTime || currentTime >= nextSunriseTime) {
      // console.log(`Curr time: ${currentTime} Next sunrise: ${nextSunriseTime}`);
      iconPath = './icons/weather-partly-cloudy.svg';
    } else {
      if (description === 'overcast clouds') {
        iconPath = './icons/weather-cloudy.svg';
      } else {
        iconPath = './icons/weather-night-partly-cloudy.svg';
      }
    }
  }
  return iconPath;
}

// Returns path of background image given current weather and time
function getBackgroundImage(categoryStr, description, currentTime = 0, sunsetTime = 0) {
  let iconPath = '';
  if (categoryStr === 'Clear') {
    if (currentTime < sunsetTime) {
      iconPath = './images/day/clear-day.jpg';
    } else {
      iconPath = './images/night/clear-night.jpg';
    }
  } else if (categoryStr === 'Clouds') {
    if (currentTime < sunsetTime) {
      iconPath = './images/day/cloudy-day.jpg';
    } else {
      iconPath = './images/night/cloudy-night.jpg';
    }
  } else if (categoryStr === 'Rain') {
    if (currentTime < sunsetTime) {
      iconPath = './images/day/rainy-day.jpg';
    } else {
      iconPath = './images/night/rainy-night.jpg';
    }
  } else if (categoryStr === 'Snow') {
    if (currentTime < sunsetTime) {
      iconPath = './images/day/snowy-day.jpg';
    } else {
      iconPath = './images/night/snowy-night.jpg';
    }
  }

  return iconPath;
}

// Attach event handlers
function attachEventHandlers() {
  let switchUnitsButton = document.querySelector('button.change-units-button');
  switchUnitsButton.addEventListener('click', (e) => {
    let currentUnits = e.currentTarget.dataset.units;
    if (currentUnits === 'F') {
      e.currentTarget.dataset.units = 'C';
      e.currentTarget.textContent = 'C';
      let locationStr = document.querySelector('input#search-weather').value;
      getWeather(locationStr, 'metric');
    } else {
      e.currentTarget.dataset.units = 'F';
      e.currentTarget.textContent = 'F';
      let locationStr = document.querySelector('input#search-weather').value;
      getWeather(locationStr, 'imperial');
    }
  });
  let switchForecastsButton = document.querySelector('.switch-forecasts-button');
  switchForecastsButton.addEventListener('change', (e) => {
    switchDisplayedForecasts();
  });
}

function setUpApp() {
  attachEventHandlers();
  getWeather('Miami, US');
}
setUpApp();