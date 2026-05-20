const express = require("express");
const router = express.Router();

const SymptomLog = require("../models/SymptomLog");
const SensorData = require("../models/SensorData");
const MedicalProfile = require("../models/MedicalProfile");

const callPersonalizedRiskModel = require("../utils/callPersonalizedRiskModel");
const { calculateSymptomOffset } = require("../utils/calculateSymptomOffset");
const { clampRisk, getRiskLabel } = require("../utils/riskHelpers");



router.get("/", (req, res) => {
    res.json({ message: "Symptom routes working" });
});

/* =============================
   CREATE SYMPTOM LOG + FINAL PERSONALIZED RISK
============================= */
router.post("/", async (req, res) => {
    try {
        const {
            userId,
            cough,
            wheezing,
            shortnessOfBreath,
            chestTightness,
            nighttimeAwakening
        } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "userId required"
            });
        }

        const latestSensor = await SensorData.findOne().sort({ timestamp: -1 });

        if (!latestSensor) {
            return res.status(404).json({
                success: false,
                message: "No sensor data found"
            });
        }

        const sensorSnapshot = {
            co_ppm: latestSensor.co_ppm,
            o3_ppb: latestSensor.o3_ppb,
            no2_ppb: latestSensor.no2_ppb,
            temperature: latestSensor.temperature,
            humidity: latestSensor.humidity,
            pm1: latestSensor.pm1,
            pm25: latestSensor.pm25,
            pm10: latestSensor.pm10,
            location: latestSensor.location,
            recordedAt: latestSensor.timestamp
        };

        const log = new SymptomLog({
            userId,
            cough: cough || "",
            wheezing: wheezing || "",
            shortnessOfBreath: shortnessOfBreath || "",
            chestTightness: chestTightness || "",
            nighttimeAwakening: nighttimeAwakening || "",
            sensorSnapshot
        });

        await log.save();

        const medicalProfile = await MedicalProfile.findOne({ userId }).sort({ updatedAt: -1 });

        if (!medicalProfile) {
            return res.status(404).json({
                success: false,
                message: "Symptom log saved, but no medical profile found for this user",
                log
            });
        }

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

        const symptomOffset = calculateSymptomOffset({
            cough: cough || "",
            wheezing: wheezing || "",
            shortnessOfBreath: shortnessOfBreath || "",
            chestTightness: chestTightness || "",
            nighttimeAwakening: nighttimeAwakening || ""
        });

        const finalRiskScore = clampRisk(baseRiskScore + symptomOffset);
        const finalRiskLabel = getRiskLabel(finalRiskScore);

        res.status(201).json({
            success: true,
            message: "Symptom log saved and personalized risk updated",
            log,
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
        console.error("Symptom Log Error:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/* =============================
   GET LATEST LOG FOR USER
   IMPORTANT: keep this ABOVE /:userId
============================= */
router.get("/latest/:userId", async (req, res) => {
    try {
        const latest = await SymptomLog.findOne({
            userId: req.params.userId
        }).sort({ loggedAt: -1 });

        res.json(latest);
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});

/* =============================
   GET ALL LOGS FOR USER
============================= */
router.get("/:userId", async (req, res) => {
    try {
        const logs = await SymptomLog.find({
            userId: req.params.userId
        }).sort({ loggedAt: -1 });

        res.json(logs);
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});

module.exports = router;


// const express = require("express");
// const router = express.Router();

// const SymptomLog = require("../models/SymptomLog");
// const SensorData = require("../models/SensorData");


// router.get("/", (req, res) => {
//     res.json({ message: "Symptom routes working" });
// });

// /* =============================
//    CREATE SYMPTOM LOG
// ============================= */
// router.post("/", async (req, res) => {
//     try {
//         const {
//             userId,
//             cough,
//             wheezing,
//             shortnessOfBreath,
//             chestTightness,
//             nighttimeAwakening
//         } = req.body;

//         if (!userId) {
//             return res.status(400).json({
//                 message: "userId required"
//             });
//         }

//         const latestSensor = await SensorData.findOne().sort({ timestamp: -1 });

//         let sensorSnapshot = undefined;

//         if (latestSensor) {
//             sensorSnapshot = {
//                 co_ppm: latestSensor.co_ppm,
//                 o3_ppb: latestSensor.o3_ppb,
//                 no2_ppb: latestSensor.no2_ppb,
//                 temperature: latestSensor.temperature,
//                 humidity: latestSensor.humidity,
//                 pm1: latestSensor.pm1,
//                 pm25: latestSensor.pm25,
//                 pm10: latestSensor.pm10,
//                 location: latestSensor.location,
//                 recordedAt: latestSensor.timestamp
//             };
//         }

//         const log = new SymptomLog({
//             userId,
//             cough: cough || "",
//             wheezing: wheezing || "",
//             shortnessOfBreath: shortnessOfBreath || "",
//             chestTightness: chestTightness || "",
//             nighttimeAwakening: nighttimeAwakening || "",
//             sensorSnapshot
//         });

//         await log.save();

//         res.status(201).json({
//             message: "Symptom log saved successfully",
//             log
//         });
//     } catch (error) {
//         console.error("Symptom Log Error:", error);
//         res.status(500).json({
//     message: error.message
// });
//     }
// });

// /* =============================
//    GET LATEST LOG FOR USER
//    IMPORTANT: keep this ABOVE /:userId
// ============================= */
// router.get("/latest/:userId", async (req, res) => {
//     try {
//         const latest = await SymptomLog.findOne({
//             userId: req.params.userId
//         }).sort({ loggedAt: -1 });

//         res.json(latest);
//     } catch (error) {
//         res.status(500).json({
//             message: error.message
//         });
//     }
// });

// /* =============================
//    GET ALL LOGS FOR USER
// ============================= */
// router.get("/:userId", async (req, res) => {
//     try {
//         const logs = await SymptomLog.find({
//             userId: req.params.userId
//         }).sort({ loggedAt: -1 });

//         res.json(logs);
//     } catch (error) {
//         res.status(500).json({
//             message: error.message
//         });
//     }
// });

// module.exports = router;