const SensorData = require("../models/SensorData");
const SymptomLog = require("../models/SymptomLog");
const MedicalProfile = require("../models/MedicalProfile");
const callPersonalizedRiskModel = require("../utils/callPersonalizedRiskModel");
const calculateSymptomOffset = require("../utils/calculateSymptomOffset");
const { clampRisk, getRiskLabel } = require("../utils/riskHelpers");

const logSymptoms = async (req, res) => {
    try {
        const {
            userId,
            cough = "",
            wheezing = "",
            shortnessOfBreath = "",
            chestTightness = "",
            nighttimeAwakening = ""
        } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "userId is required"
            });
        }

        // 1. get latest sensor data
        const latestSensor = await SensorData.findOne().sort({ timestamp: -1 });

        if (!latestSensor) {
            return res.status(404).json({
                success: false,
                message: "No sensor data found"
            });
        }

        // 2. build sensor snapshot
        const sensorSnapshot = {
            co_ppm: latestSensor.co_ppm,
            o3_ppb: latestSensor.o3_ppb,
            no2_ppb: latestSensor.no2_ppb,
            temperature: latestSensor.temperature,
            humidity: latestSensor.humidity,
            pm1: latestSensor.pm1,
            pm25: latestSensor.pm25,
            pm10: latestSensor.pm10,
            location: latestSensor.location || {
                latitude: null,
                longitude: null
            },
            recordedAt: latestSensor.timestamp
        };

        // 3. save symptom log
        const symptomLog = await SymptomLog.create({
            userId,
            cough,
            wheezing,
            shortnessOfBreath,
            chestTightness,
            nighttimeAwakening,
            sensorSnapshot
        });

        // 4. fetch user's medical profile
        const medicalProfile = await MedicalProfile.findOne({ userId }).sort({ updatedAt: -1 });

        if (!medicalProfile) {
            return res.status(404).json({
                success: false,
                message: "No medical profile found for this user"
            });
        }

        // 5. call personalized risk model using sensor snapshot + profile
        const modelInput = {
            co_ppm: sensorSnapshot.co_ppm,
            o3_ppb: sensorSnapshot.o3_ppb,
            no2_ppb: sensorSnapshot.no2_ppb,
            temperature: sensorSnapshot.temperature,
            humidity: sensorSnapshot.humidity,
            pm1: sensorSnapshot.pm1,
            pm25: sensorSnapshot.pm25,
            pm10: sensorSnapshot.pm10,

            age: medicalProfile.age,
            asthma_severity: medicalProfile.asthma_severity,
            known_triggers: medicalProfile.known_triggers || [],
            last_hospitalization: medicalProfile.last_hospitalization,
            rescue_inhaler_use: medicalProfile.rescue_inhaler_use,
            smoking_status: medicalProfile.smoking_status,
            height_cm: medicalProfile.height_cm,
            weight_kg: medicalProfile.weight_kg
        };

        const personalizedResult = await callPersonalizedRiskModel(modelInput);

        const baseRiskScore = personalizedResult.base_risk_score;
        const baseRiskLabel = personalizedResult.predicted_label_name;

        // 6. calculate symptom offset
        const symptomOffset = calculateSymptomOffset({
            cough,
            wheezing,
            shortnessOfBreath,
            chestTightness,
            nighttimeAwakening
        });

        // 7. final personalized risk
        const finalRiskScore = clampRisk(baseRiskScore + symptomOffset);
        const finalRiskLabel = getRiskLabel(finalRiskScore);

        // 8. return response
        return res.status(201).json({
            success: true,
            message: "Symptom log saved and personalized risk updated",
            symptomLog,
            baseRisk: {
                score: baseRiskScore,
                label: baseRiskLabel,
                probabilities: personalizedResult.probabilities
            },
            symptomOffset,
            finalRisk: {
                score: finalRiskScore,
                label: finalRiskLabel
            }
        });

    } catch (error) {
        console.error("Symptom logging error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to save symptom log and compute personalized risk",
            error: error.message
        });
    }
};

module.exports = {
    logSymptoms
};