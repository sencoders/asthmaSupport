const mongoose = require("mongoose");

const medicalProfileSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true
        },

        // Section A: General Health
        age: {
            type: Number,
            required: true,
            min: 1,
            max: 120
        },
        gender: {
            type: String,
            required: true,
            enum: ["Male", "Female", "Other"]
        },
        height_cm: {
            type: Number,
            required: true,
            min: 50,
            max: 250
        },
        weight_kg: {
            type: Number,
            required: true,
            min: 10,
            max: 300
        },
        smoking_status: {
            type: String,
            required: true,
            enum: ["Non-smoker", "Ex-smoker", "Active smoker"]
        },

        // Section B: Asthma Classification
        
        asthma_severity: {
            type: String,
            required: true,
            enum: [
                "Intermittent",
                "Mild Persistent",
                "Moderate Persistent",
                "Severe Persistent"
            ]
        },
        rescue_inhaler_use: {
            type: String,
            required: true,
            enum: [
                "Rarely",
                "1–2 times/week",
                "3–6 times/week",
                "Daily"
            ]
        },
        last_hospitalization: {
            type: String,
            required: true,
            enum: [
                "Never",
                "Within last year",
                "More than a year ago"
            ]
        },

        // Section C: Personal Triggers
        known_triggers: {
            type: [String],
            default: [],
            enum: [
                "Dust & Dust Mites",
                "Cold Air",
                "Smoke",
                "Strong Odors / Perfumes",
                "Pollen / Seasonal Allergies",
                "High Humidity / Dampness",
                "Air Pollution / Vehicle Exhaust",
                "Exercise",
                "Respiratory Infection"
            ]
        },
        emergency_contact_phone: {
    type: String,
    trim: true,
    match: /^\+[1-9]\d{9,14}$/,
    default: ""
},
    },
    
    {
        timestamps: true
    }
);

module.exports = mongoose.model("MedicalProfile", medicalProfileSchema);