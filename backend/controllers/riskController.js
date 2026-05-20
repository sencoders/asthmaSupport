const path = require("path");
const fs = require("fs");

const SensorData = require("../models/SensorData");
const MedicalProfile = require("../models/MedicalProfile");
const SymptomLog = require("../models/SymptomLog");

const callEnvironmentModel = require("../utils/callEnvironmentModel");
const callPersonalizedRiskModel = require("../utils/callPersonalizedRiskModel");
const callAudioModel = require("../utils/callAudioModel");

const {
    generateExplanation,
    generateRecommendations
} = require("../utils/explainability");

const { getActiveSymptomRisk } = require("../utils/symptomRisk");
const getFinalRisk = require("../utils/fuseRisk");

const getEnvironmentalRisk = async (req, res) => {
    try {
        const latestSensor = await SensorData.findOne().sort({ timestamp: -1 });

        if (!latestSensor) {
            return res.status(404).json({
                success: false,
                message: "No sensor data found"
            });
        }

        const environmentalResult = await callEnvironmentModel(latestSensor);

        return res.status(200).json({
            success: true,
            sensorData: latestSensor,
            environmentalRisk: {
                score: environmentalResult.risk_score,
                label: environmentalResult.predicted_label_name,
                probabilities: environmentalResult.probabilities
            }
        });
    } catch (error) {
        console.error("Environmental risk error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to compute environmental risk",
            error: error.message
        });
    }
};

const getPersonalizedRisk = async (req, res) => {
    try {
        const { userId } = req.params;

        const latestSensor = await SensorData.findOne().sort({ timestamp: -1 });
        if (!latestSensor) {
            return res.status(404).json({
                success: false,
                message: "No sensor data found"
            });
        }

        const medicalProfile = await MedicalProfile.findOne({ userId }).sort({ updatedAt: -1 });
        if (!medicalProfile) {
            return res.status(404).json({
                success: false,
                message: "No medical profile found for this user"
            });
        }

        const latestSymptomLog = await SymptomLog.findOne({ userId }).sort({ loggedAt: -1 });

        const modelInput = {
            co_ppm: latestSensor.co_ppm,
            o3_ppb: latestSensor.o3_ppb,
            no2_ppb: latestSensor.no2_ppb,
            temperature: latestSensor.temperature,
            humidity: latestSensor.humidity,
            pm1: latestSensor.pm1,
            pm25: latestSensor.pm25,
            pm10: latestSensor.pm10,

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

        const baseRisk = {
            score: personalizedResult.base_risk_score,
            label: personalizedResult.predicted_label_name,
            probabilities: personalizedResult.probabilities
        };

        const displayedRisk = getActiveSymptomRisk(baseRisk, latestSymptomLog);

        const explanation = generateExplanation({
            sensorData: latestSensor,
            profile: medicalProfile,
            symptomLog: latestSymptomLog,
            finalLabel: displayedRisk?.label || baseRisk.label,
            isSymptomAdjusted: displayedRisk?.isSymptomAdjusted || false
        });

        const recommendations = generateRecommendations({
            sensorData: latestSensor,
            profile: medicalProfile,
            symptomLog: latestSymptomLog,
            finalLabel: displayedRisk?.label || baseRisk.label
        });

        return res.status(200).json({
            success: true,
            sensorData: latestSensor,
            medicalProfile,
            latestSymptomLog,
            personalizedRisk: baseRisk,
            displayedRisk,
            explanation,
            recommendations
        });
    } catch (error) {
        console.error("Personalized risk error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to compute personalized risk",
            error: error.message
        });
    }
};

const getFinalRiskWithAudio = async (req, res) => {
    try {
        const { userId } = req.params;

        console.log("=== FINAL RISK WITH AUDIO ===");
        console.log("userId =", userId);
        console.log("req.file =", req.file);
        console.log("req.body =", req.body);

        const latestSensor = await SensorData.findOne().sort({ timestamp: -1 });
        if (!latestSensor) {
            return res.status(404).json({
                success: false,
                message: "No sensor data found"
            });
        }

        const medicalProfile = await MedicalProfile.findOne({ userId }).sort({ updatedAt: -1 });
        if (!medicalProfile) {
            return res.status(404).json({
                success: false,
                message: "No medical profile found for this user"
            });
        }

        const latestSymptomLog = await SymptomLog.findOne({ userId }).sort({ loggedAt: -1 });

        const modelInput = {
            co_ppm: latestSensor.co_ppm,
            o3_ppb: latestSensor.o3_ppb,
            no2_ppb: latestSensor.no2_ppb,
            temperature: latestSensor.temperature,
            humidity: latestSensor.humidity,
            pm1: latestSensor.pm1,
            pm25: latestSensor.pm25,
            pm10: latestSensor.pm10,

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

        const baseRisk = {
            score: personalizedResult.base_risk_score,
            label: personalizedResult.predicted_label_name,
            probabilities: personalizedResult.probabilities
        };

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "No audio file uploaded"
            });
        }

        const absoluteAudioPath = path.resolve(req.file.path);
        console.log("absoluteAudioPath =", absoluteAudioPath);
        console.log("file exists =", fs.existsSync(absoluteAudioPath));
        console.log("mime type =", req.file.mimetype);
        console.log("original name =", req.file.originalname);

        if (!fs.existsSync(absoluteAudioPath)) {
            return res.status(500).json({
                success: false,
                message: "Uploaded audio file not found on server",
                error: absoluteAudioPath
            });
        }

        const respiratoryResult = await callAudioModel(absoluteAudioPath);
        console.log("respiratoryResult =", respiratoryResult);

        const finalRisk = getFinalRisk(baseRisk, latestSymptomLog, respiratoryResult);

        const explanation = generateExplanation({
            sensorData: latestSensor,
            profile: medicalProfile,
            symptomLog: latestSymptomLog,
            finalLabel: finalRisk?.label || baseRisk.label,
            isSymptomAdjusted: finalRisk?.isSymptomAdjusted || false
        });

        const recommendations = generateRecommendations({
            sensorData: latestSensor,
            profile: medicalProfile,
            symptomLog: latestSymptomLog,
            finalLabel: finalRisk?.label || baseRisk.label
        });

        return res.status(200).json({
            success: true,
            sensorData: latestSensor,
            medicalProfile,
            latestSymptomLog,
            personalizedRisk: baseRisk,
            respiratoryResult,
            finalRisk,
            explanation,
            recommendations
        });
    } catch (error) {
        console.error("Final risk with audio error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to compute final risk with audio",
            error: error.message
        });
    }
};

module.exports = {
    getEnvironmentalRisk,
    getPersonalizedRisk,
    getFinalRiskWithAudio
};


// const SensorData = require("../models/SensorData");
// const MedicalProfile = require("../models/MedicalProfile");
// const SymptomLog = require("../models/SymptomLog");

// const callEnvironmentModel = require("../utils/callEnvironmentModel");
// const callPersonalizedRiskModel = require("../utils/callPersonalizedRiskModel");
// const callAudioModel = require("../utils/callAudioModel");

// const {
//     generateExplanation,
//     generateRecommendations
// } = require("../utils/explainability");

// const { getActiveSymptomRisk } = require("../utils/symptomRisk");
// const getFinalRisk = require("../utils/fuseRisk");

// const getEnvironmentalRisk = async (req, res) => {
//     try {
//         const latestSensor = await SensorData.findOne().sort({ timestamp: -1 });

//         if (!latestSensor) {
//             return res.status(404).json({
//                 success: false,
//                 message: "No sensor data found"
//             });
//         }

//         const environmentalResult = await callEnvironmentModel(latestSensor);

//         return res.status(200).json({
//             success: true,
//             sensorData: latestSensor,
//             environmentalRisk: {
//                 score: environmentalResult.risk_score,
//                 label: environmentalResult.predicted_label_name,
//                 probabilities: environmentalResult.probabilities
//             }
//         });
//     } catch (error) {
//         console.error("Environmental risk error:", error);
//         return res.status(500).json({
//             success: false,
//             message: "Failed to compute environmental risk",
//             error: error.message
//         });
//     }
// };

// const getPersonalizedRisk = async (req, res) => {
//     try {
//         const { userId } = req.params;

//         const latestSensor = await SensorData.findOne().sort({ timestamp: -1 });
//         if (!latestSensor) {
//             return res.status(404).json({
//                 success: false,
//                 message: "No sensor data found"
//             });
//         }

//         const medicalProfile = await MedicalProfile.findOne({ userId }).sort({ updatedAt: -1 });
//         if (!medicalProfile) {
//             return res.status(404).json({
//                 success: false,
//                 message: "No medical profile found for this user"
//             });
//         }

//         const latestSymptomLog = await SymptomLog.findOne({ userId }).sort({ loggedAt: -1 });

//         const modelInput = {
//             co_ppm: latestSensor.co_ppm,
//             o3_ppb: latestSensor.o3_ppb,
//             no2_ppb: latestSensor.no2_ppb,
//             temperature: latestSensor.temperature,
//             humidity: latestSensor.humidity,
//             pm1: latestSensor.pm1,
//             pm25: latestSensor.pm25,
//             pm10: latestSensor.pm10,

//             age: medicalProfile.age,
//             asthma_severity: medicalProfile.asthma_severity,
//             known_triggers: medicalProfile.known_triggers || [],
//             last_hospitalization: medicalProfile.last_hospitalization,
//             rescue_inhaler_use: medicalProfile.rescue_inhaler_use,
//             smoking_status: medicalProfile.smoking_status,
//             height_cm: medicalProfile.height_cm,
//             weight_kg: medicalProfile.weight_kg
//         };

//         const personalizedResult = await callPersonalizedRiskModel(modelInput);

//         const baseRisk = {
//             score: personalizedResult.base_risk_score,
//             label: personalizedResult.predicted_label_name,
//             probabilities: personalizedResult.probabilities
//         };

//         const displayedRisk = getActiveSymptomRisk(baseRisk, latestSymptomLog);

//         const explanation = generateExplanation({
//             sensorData: latestSensor,
//             profile: medicalProfile,
//             symptomLog: latestSymptomLog,
//             finalLabel: displayedRisk?.label || baseRisk.label,
//             isSymptomAdjusted: displayedRisk?.isSymptomAdjusted || false
//         });

//         const recommendations = generateRecommendations({
//             sensorData: latestSensor,
//             profile: medicalProfile,
//             symptomLog: latestSymptomLog,
//             finalLabel: displayedRisk?.label || baseRisk.label
//         });

//         return res.status(200).json({
//             success: true,
//             sensorData: latestSensor,
//             medicalProfile,
//             latestSymptomLog,
//             personalizedRisk: baseRisk,
//             displayedRisk,
//             explanation,
//             recommendations
//         });
//     } catch (error) {
//         console.error("Personalized risk error:", error);
//         return res.status(500).json({
//             success: false,
//             message: "Failed to compute personalized risk",
//             error: error.message
//         });
//     }
// };

// const getFinalRiskWithAudio = async (req, res) => {
//     try {
//         const { userId } = req.params;

//         const latestSensor = await SensorData.findOne().sort({ timestamp: -1 });
//         if (!latestSensor) {
//             return res.status(404).json({
//                 success: false,
//                 message: "No sensor data found"
//             });
//         }

//         const medicalProfile = await MedicalProfile.findOne({ userId }).sort({ updatedAt: -1 });
//         if (!medicalProfile) {
//             return res.status(404).json({
//                 success: false,
//                 message: "No medical profile found for this user"
//             });
//         }

//         const latestSymptomLog = await SymptomLog.findOne({ userId }).sort({ loggedAt: -1 });

//         const modelInput = {
//             co_ppm: latestSensor.co_ppm,
//             o3_ppb: latestSensor.o3_ppb,
//             no2_ppb: latestSensor.no2_ppb,
//             temperature: latestSensor.temperature,
//             humidity: latestSensor.humidity,
//             pm1: latestSensor.pm1,
//             pm25: latestSensor.pm25,
//             pm10: latestSensor.pm10,

//             age: medicalProfile.age,
//             asthma_severity: medicalProfile.asthma_severity,
//             known_triggers: medicalProfile.known_triggers || [],
//             last_hospitalization: medicalProfile.last_hospitalization,
//             rescue_inhaler_use: medicalProfile.rescue_inhaler_use,
//             smoking_status: medicalProfile.smoking_status,
//             height_cm: medicalProfile.height_cm,
//             weight_kg: medicalProfile.weight_kg
//         };

//         const personalizedResult = await callPersonalizedRiskModel(modelInput);

//         const baseRisk = {
//             score: personalizedResult.base_risk_score,
//             label: personalizedResult.predicted_label_name,
//             probabilities: personalizedResult.probabilities
//         };

//         let respiratoryResult = null;
//         if (req.file?.path) {
//             respiratoryResult = await callAudioModel(req.file.path);
//         }

//         const finalRisk = getFinalRisk(baseRisk, latestSymptomLog, respiratoryResult);

//         const explanation = generateExplanation({
//             sensorData: latestSensor,
//             profile: medicalProfile,
//             symptomLog: latestSymptomLog,
//             finalLabel: finalRisk?.label || baseRisk.label,
//             isSymptomAdjusted: finalRisk?.isSymptomAdjusted || false
//         });

//         const recommendations = generateRecommendations({
//             sensorData: latestSensor,
//             profile: medicalProfile,
//             symptomLog: latestSymptomLog,
//             finalLabel: finalRisk?.label || baseRisk.label
//         });

//         return res.status(200).json({
//             success: true,
//             sensorData: latestSensor,
//             medicalProfile,
//             latestSymptomLog,
//             personalizedRisk: baseRisk,
//             respiratoryResult,
//             finalRisk,
//             explanation,
//             recommendations
//         });
//     } catch (error) {
//         console.error("Final risk with audio error:", error);
//         return res.status(500).json({
//             success: false,
//             message: "Failed to compute final risk with audio",
//             error: error.message
//         });
//     }
// };

// module.exports = {
//     getEnvironmentalRisk,
//     getPersonalizedRisk,
//     getFinalRiskWithAudio
// };



// const SensorData = require("../models/SensorData");
// const MedicalProfile = require("../models/MedicalProfile");
// const SymptomLog = require("../models/SymptomLog");

// const callEnvironmentModel = require("../utils/callEnvironmentModel");
// const callPersonalizedRiskModel = require("../utils/callPersonalizedRiskModel");

// const {
//     generateExplanation,
//     generateRecommendations
// } = require("../utils/explainability");

// const { getActiveSymptomRisk } = require("../utils/symptomRisk");

// const getEnvironmentalRisk = async (req, res) => {
//     try {
//         const latestSensor = await SensorData.findOne().sort({ timestamp: -1 });

//         if (!latestSensor) {
//             return res.status(404).json({
//                 success: false,
//                 message: "No sensor data found"
//             });
//         }

//         const environmentalResult = await callEnvironmentModel(latestSensor);

//         return res.status(200).json({
//             success: true,
//             sensorData: latestSensor,
//             environmentalRisk: {
//                 score: environmentalResult.risk_score,
//                 label: environmentalResult.predicted_label_name,
//                 probabilities: environmentalResult.probabilities
//             }
//         });
//     } catch (error) {
//         console.error("Environmental risk error:", error);
//         return res.status(500).json({
//             success: false,
//             message: "Failed to compute environmental risk",
//             error: error.message
//         });
//     }
// };

// const getPersonalizedRisk = async (req, res) => {
//     try {
//         const { userId } = req.params;

//         const latestSensor = await SensorData.findOne().sort({ timestamp: -1 });
//         if (!latestSensor) {
//             return res.status(404).json({
//                 success: false,
//                 message: "No sensor data found"
//             });
//         }

//         const medicalProfile = await MedicalProfile.findOne({ userId }).sort({ updatedAt: -1 });
//         if (!medicalProfile) {
//             return res.status(404).json({
//                 success: false,
//                 message: "No medical profile found for this user"
//             });
//         }

//         const latestSymptomLog = await SymptomLog.findOne({ userId }).sort({ loggedAt: -1 });

//         const modelInput = {
//             co_ppm: latestSensor.co_ppm,
//             o3_ppb: latestSensor.o3_ppb,
//             no2_ppb: latestSensor.no2_ppb,
//             temperature: latestSensor.temperature,
//             humidity: latestSensor.humidity,
//             pm1: latestSensor.pm1,
//             pm25: latestSensor.pm25,
//             pm10: latestSensor.pm10,

//             age: medicalProfile.age,
//             asthma_severity: medicalProfile.asthma_severity,
//             known_triggers: medicalProfile.known_triggers || [],
//             last_hospitalization: medicalProfile.last_hospitalization,
//             rescue_inhaler_use: medicalProfile.rescue_inhaler_use,
//             smoking_status: medicalProfile.smoking_status,
//             height_cm: medicalProfile.height_cm,
//             weight_kg: medicalProfile.weight_kg
//         };

//         const personalizedResult = await callPersonalizedRiskModel(modelInput);

//         const baseRisk = {
//             score: personalizedResult.base_risk_score,
//             label: personalizedResult.predicted_label_name,
//             probabilities: personalizedResult.probabilities
//         };

//         const displayedRisk = getActiveSymptomRisk(baseRisk, latestSymptomLog);

//         const explanation = generateExplanation({
//             sensorData: latestSensor,
//             profile: medicalProfile,
//             symptomLog: latestSymptomLog,
//             finalLabel: displayedRisk?.label || baseRisk.label,
//             isSymptomAdjusted: displayedRisk?.isSymptomAdjusted || false
//         });

//         const recommendations = generateRecommendations({
//             sensorData: latestSensor,
//             profile: medicalProfile,
//             symptomLog: latestSymptomLog,
//             finalLabel: displayedRisk?.label || baseRisk.label
//         });

//         return res.status(200).json({
//             success: true,
//             sensorData: latestSensor,
//             medicalProfile,
//             latestSymptomLog,
//             personalizedRisk: baseRisk,
//             displayedRisk,
//             explanation,
//             recommendations
//         });
//     } catch (error) {
//         console.error("Personalized risk error:", error);
//         return res.status(500).json({
//             success: false,
//             message: "Failed to compute personalized risk",
//             error: error.message
//         });
//     }
// };

// module.exports = {
//     getEnvironmentalRisk,
//     getPersonalizedRisk
// };





// const SensorData = require("../models/SensorData");
// const MedicalProfile = require("../models/MedicalProfile");
// const callEnvironmentModel = require("../utils/callEnvironmentModel");
// const callPersonalizedRiskModel = require("../utils/callPersonalizedRiskModel");
// const {
//     generateExplanation,
//     generateRecommendations
// } = require("../utils/explainability");

// const getEnvironmentalRisk = async (req, res) => {
//     try {
//         const latestSensor = await SensorData.findOne().sort({ timestamp: -1 });

//         if (!latestSensor) {
//             return res.status(404).json({
//                 success: false,
//                 message: "No sensor data found"
//             });
//         }

//         const environmentalResult = await callEnvironmentModel(latestSensor);

//         return res.status(200).json({
//             success: true,
//             sensorData: latestSensor,
//             environmentalRisk: {
//                 score: environmentalResult.risk_score,
//                 label: environmentalResult.predicted_label_name,
//                 probabilities: environmentalResult.probabilities
//             }
//         });
//     } catch (error) {
//         console.error("Environmental risk error:", error);
//         return res.status(500).json({
//             success: false,
//             message: "Failed to compute environmental risk",
//             error: error.message
//         });
//     }
// };

// const getPersonalizedRisk = async (req, res) => {
//     try {
//         const { userId } = req.params;

//         const latestSensor = await SensorData.findOne().sort({ timestamp: -1 });
//         if (!latestSensor) {
//             return res.status(404).json({
//                 success: false,
//                 message: "No sensor data found"
//             });
//         }

//         const medicalProfile = await MedicalProfile.findOne({ userId }).sort({ updatedAt: -1 });
//         if (!medicalProfile) {
//             return res.status(404).json({
//                 success: false,
//                 message: "No medical profile found for this user"
//             });
//         }

//         const modelInput = {
//             co_ppm: latestSensor.co_ppm,
//             o3_ppb: latestSensor.o3_ppb,
//             no2_ppb: latestSensor.no2_ppb,
//             temperature: latestSensor.temperature,
//             humidity: latestSensor.humidity,
//             pm1: latestSensor.pm1,
//             pm25: latestSensor.pm25,
//             pm10: latestSensor.pm10,

//             age: medicalProfile.age,
//             asthma_severity: medicalProfile.asthma_severity,
//             known_triggers: medicalProfile.known_triggers || [],
//             last_hospitalization: medicalProfile.last_hospitalization,
//             rescue_inhaler_use: medicalProfile.rescue_inhaler_use,
//             smoking_status: medicalProfile.smoking_status,
//             height_cm: medicalProfile.height_cm,
//             weight_kg: medicalProfile.weight_kg
//         };

//         const personalizedResult = await callPersonalizedRiskModel(modelInput);

//         return res.status(200).json({
//             success: true,
//             sensorData: latestSensor,
//             medicalProfile,
//             personalizedRisk: {
//                 score: personalizedResult.base_risk_score,
//                 label: personalizedResult.predicted_label_name,
//                 probabilities: personalizedResult.probabilities
//             }
//         });
//     } catch (error) {
//         console.error("Personalized risk error:", error);
//         return res.status(500).json({
//             success: false,
//             message: "Failed to compute personalized risk",
//             error: error.message
//         });
//     }
// };

// module.exports = {
//     getEnvironmentalRisk,
//     getPersonalizedRisk
// };





