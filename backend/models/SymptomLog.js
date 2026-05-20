const mongoose = require("mongoose");

const severityEnum = ["","Mild", "Moderate", "Significant", "Severe"];

const symptomLogSchema = new mongoose.Schema({
    
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    cough: {
        type: String,
        enum: severityEnum,
        default: ""
    },

    wheezing: {
        type: String,
        enum: severityEnum,
        default: ""
    },

    shortnessOfBreath: {
        type: String,
        enum: severityEnum,
        default: ""
    },

    chestTightness: {
        type: String,
        enum: severityEnum,
        default: ""
    },

    nighttimeAwakening: {
        type: String,
        enum: severityEnum,
        default: ""
    },

    /* =========================
       SENSOR SNAPSHOT
    ========================= */

    sensorSnapshot: {

        co_ppm: Number,
        o3_ppb: Number,
        no2_ppb: Number,

        temperature: Number,
        humidity: Number,

        pm1: Number,
        pm25: Number,
        pm10: Number,

        location: {
            latitude: Number,
            longitude: Number
        },

        recordedAt: Date
    },

    loggedAt: {
        type: Date,
        default: Date.now
    }

});

module.exports = mongoose.model("SymptomLog", symptomLogSchema);