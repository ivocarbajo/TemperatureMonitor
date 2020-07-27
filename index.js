const express = require('express');
const fetch = require('node-fetch');
const lowdb = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
require('dotenv').config();
const adapter = new FileSync('data/db.json');
const db = lowdb(adapter);
const app = express();
const port = process.env.PORT;
const owmKey = process.env.OWM_KEY;
const sensorIp = process.env.SENSOR_IP;
const updateRate = process.env.UPDATE_RATE || 10000;

db.defaults({
    dataPoints: 0,
    celciusData: [],
    humidityData: [],
    outsideCelcius: [],
    outsideHumidity: []
}).write();

setInterval(() => {
    fetch(`http://${sensorIp}`).then(data => data.json()).then(json => {
        if ((db.get('dataPoints').value()-1 != -1 && json.celcius != 2147483647) &&
            (db.get("celciusData").takeRight(1).value()[0].y != json.celcius ||
            db.get("humidityData").takeRight(1).value()[0].y != json.humidity)) {
                addDataPoints(json);
            }else if (db.get('dataPoints').value()-1 == -1 && json.celcius != 2147483647){
                addDataPoints(json);
            }
    }).catch(() => {
        console.log("Sensor is offline, cannot query, retrying in 10 seconds...");
    });
}, updateRate);

function addDataPoints (json) {
    json.date = Date.now();
    db.update('dataPoints', n => n + 1).write();
    console.log("Generated a data point");
    var xaxisDate = new Date().toString() + " GMT";
    db.get('celciusData').push({
        x: xaxisDate,
        y: json.celcius
    }).write();
    db.get('humidityData').push({
        x: xaxisDate,
        y: json.humidity
    }).write();
    fetch(`https://api.openweathermap.org/data/2.5/weather?id=3128760&appid=${owmKey}&units=metric`).then(data => data.json()).then(json => {
        db.get('outsideCelcius').push({
            x: xaxisDate,
            y: json.main.temp
        }).write();
        db.get('outsideHumidity').push({
            x: xaxisDate,
            y: json.main.humidity
        }).write();
    }).catch(() => console.log(`Open Weather Map is unnaccesible. ${owmKey}`));
}

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.get('/', (req, res) => res.render('index', {
    celciusData: db.get('celciusData'),
    humidityData: db.get('humidityData'),
    outsideHumidity: db.get('outsideHumidity'),
    outsideCelcius: db.get('outsideCelcius')
}));
//app.get('/api', (req, res) => res.json(data));
app.get('/api/celciusData', (req, res) => res.json(celciusData));
app.get('/api/humidityData', (req, res) => res.json(humidityData));

app.listen(port, () => console.log(`Api is up on port ${port}`));
