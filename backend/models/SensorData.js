const mongoose = require("mongoose");

const sensorSchema = new mongoose.Schema({
    // Sensor Values
    co_ppm: Number,
    o3_ppb: Number,
    no2_ppb: Number,
    temperature: Number,
    humidity: Number,
    pm1: Number,
    pm25: Number,
    pm10: Number,

    // Location Data
    location: {
        latitude: { type: Number},
        longitude: { type: Number}
    },

    // Metadata
    timestamp: { 
        type: Date, 
        default: Date.now // Automatically sets the time of insertion
    }
});

module.exports = mongoose.model("SensorData", sensorSchema);

/*
const mongoose = require("mongoose");

const SensorDataSchema = new mongoose.Schema({
  co_ppm: Number,
  o3_ppb: Number,
  temp: Number,
  hum: Number,
  pm1: Number,
  pm25: Number,
  pm10: Number,

  //  Location
  latitude: Number,
  longitude: Number,

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("SensorData", SensorDataSchema);
*/