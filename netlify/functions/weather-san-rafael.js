const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';
const SMN_ALERTS_URL = 'https://ws2.smn.gob.ar/alertas';
const SAN_RAFAEL = {
  name: 'San Rafael, Mendoza',
  latitude: -34.6177,
  longitude: -68.3301,
  timezone: 'America/Argentina/Mendoza'
};

function maxOf(list=[]) {
  return list.reduce((acc, n) => Math.max(acc, Number.isFinite(n) ? n : -Infinity), -Infinity);
}

function minOf(list=[]) {
  return list.reduce((acc, n) => Math.min(acc, Number.isFinite(n) ? n : Infinity), Infinity);
}

exports.handler = async () => {
  try {
    const url = new URL(OPEN_METEO_URL);
    url.searchParams.set('latitude', SAN_RAFAEL.latitude);
    url.searchParams.set('longitude', SAN_RAFAEL.longitude);
    url.searchParams.set('timezone', SAN_RAFAEL.timezone);
    url.searchParams.set('forecast_days', '2');
    url.searchParams.set('current', 'temperature_2m,relative_humidity_2m,wind_speed_10m,wind_gusts_10m,weather_code');
    url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max');
    url.searchParams.set('hourly', 'relative_humidity_2m,precipitation_probability,wind_speed_10m,wind_gusts_10m,weather_code');

    const [weatherRes, alertsRes] = await Promise.allSettled([
      fetch(url.toString()),
      fetch(SMN_ALERTS_URL)
    ]);

    if(weatherRes.status !== 'fulfilled' || !weatherRes.value.ok) {
      throw new Error('No se pudo consultar el clima.');
    }

    const weather = await weatherRes.value.json();
    const daily = weather.daily || {};
    const hourly = weather.hourly || {};
    const current = weather.current || {};

    const humidityList = (hourly.relative_humidity_2m || []).map(Number).filter(Number.isFinite);
    const rainProbList = (hourly.precipitation_probability || []).map(Number).filter(Number.isFinite);
    const gustList = (hourly.wind_gusts_10m || []).map(Number).filter(Number.isFinite);
    const windList = (hourly.wind_speed_10m || []).map(Number).filter(Number.isFinite);
    const weatherCodes = (hourly.weather_code || []).map(Number).filter(Number.isFinite);

    let alertsText = '';
    if(alertsRes.status === 'fulfilled' && alertsRes.value.ok) {
      try {
        const alertsJson = await alertsRes.value.json();
        alertsText = JSON.stringify(alertsJson);
      } catch(_) {}
    }
    const alertsLower = String(alertsText || '').toLowerCase();
    const thunderCodes = weatherCodes.some(code => [95, 96, 99].includes(code));

    const payload = {
      city: SAN_RAFAEL.name,
      updated_at: new Date().toISOString(),
      temp_current: Math.round(Number(current.temperature_2m) || 0),
      temp_max: Math.round(Number((daily.temperature_2m_max || [])[0]) || 0),
      temp_min: Math.round(Number((daily.temperature_2m_min || [])[0]) || 0),
      humidity_now: Math.round(Number(current.relative_humidity_2m) || 0),
      humidity_min: Math.round(minOf(humidityList)),
      humidity_max: Math.round(maxOf(humidityList)),
      rain_probability: Math.round(Number((daily.precipitation_probability_max || [])[0]) || maxOf(rainProbList) || 0),
      wind_speed: Math.round(Number(current.wind_speed_10m) || maxOf(windList) || 0),
      wind_gusts: Math.round(Number(current.wind_gusts_10m) || maxOf(gustList) || 0),
      uv_max: Math.round(Number((daily.uv_index_max || [])[0]) || 0),
      zonda: /zonda/.test(alertsLower),
      hail_risk: /granizo/.test(alertsLower),
      lightning_risk: thunderCodes || /tormenta electrica|actividad electrica|rayos/.test(alertsLower),
      source: {
        forecast: 'Open-Meteo',
        alerts: 'SMN'
      }
    };

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    };
  } catch(error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message || 'No se pudo cargar el clima.' })
    };
  }
};
