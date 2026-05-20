const MedicalProfile = require("../models/MedicalProfile");
const SensorData = require("../models/SensorData");
const SymptomLog = require("../models/SymptomLog");
const sendEmergencySMS = require("../utils/sendEmergencySMS");

const triggerEmergencyAlert = async (req, res) => {
    try {
        const { userId, location } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "userId is required"
            });
        }

        const medicalProfile = await MedicalProfile.findOne({ userId });

        if (!medicalProfile?.emergency_contact_phone) {
            return res.status(400).json({
                success: false,
                message: "No emergency contact phone found"
            });
        }

        const latestSensor = await SensorData.findOne().sort({ timestamp: -1 });
        const latestSymptomLog = await SymptomLog.findOne({ userId }).sort({ loggedAt: -1 });

        const liveLocation =
            location?.latitude != null && location?.longitude != null
                ? {
                      latitude: location.latitude,
                      longitude: location.longitude
                  }
                : latestSensor?.location?.latitude != null &&
                  latestSensor?.location?.longitude != null
                ? {
                      latitude: latestSensor.location.latitude,
                      longitude: latestSensor.location.longitude
                  }
                : null;

        const patientName =
            medicalProfile.full_name ||
            medicalProfile.name ||
            medicalProfile.patient_name ||
            "The patient";

        const locationLink = liveLocation
            ? `https://maps.google.com/?q=${liveLocation.latitude},${liveLocation.longitude}`
            : null;

        const smsText = [
            "ASTHMA EMERGENCY ALERT",
            "",
            `${patientName} may be experiencing a severe asthma attack.`,
            "High asthma risk and breathing symptoms were detected.",
            latestSymptomLog?.loggedAt
                ? `Symptom time: ${new Date(latestSymptomLog.loggedAt).toLocaleString()}`
                : null,
            locationLink ? `Location: ${locationLink}` : "Location unavailable.",
            "",
            "Please contact them immediately or reach their location."
        ]
            .filter(Boolean)
            .join("\n");

        const smsResult = await sendEmergencySMS(
            medicalProfile.emergency_contact_phone,
            smsText
        );

        return res.status(200).json({
            success: true,
            message: "Emergency SMS sent successfully",
            smsResult,
            sentTo: medicalProfile.emergency_contact_phone,
            location: liveLocation || null
        });
    } catch (error) {
        console.error("Emergency alert error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to send emergency SMS",
            error: error.message
        });
    }
};

module.exports = {
    triggerEmergencyAlert
};


// const MedicalProfile = require("../models/MedicalProfile");
// const SensorData = require("../models/SensorData");
// const SymptomLog = require("../models/SymptomLog");
// const sendEmergencySMS = require("../utils/sendEmergencySMS");

// const triggerEmergencyAlert = async (req, res) => {
//     try {
//         const { userId, location } = req.body;

//         if (!userId) {
//             return res.status(400).json({
//                 success: false,
//                 message: "userId is required"
//             });
//         }

//         const medicalProfile = await MedicalProfile.findOne({ userId });

//         if (!medicalProfile?.emergency_contact_phone) {
//             return res.status(400).json({
//                 success: false,
//                 message: "No emergency contact phone found"
//             });
//         }

//         let phone = String(medicalProfile.emergency_contact_phone).replace(/\D/g, "");

// // convert 10 digit Indian number to 91xxxxxxxxxx
// if (phone.length === 10) {
//     phone = `91${phone}`;
// }

// if (!/^91\d{10}$/.test(phone)) {
//     return res.status(400).json({
//         success: false,
//         message: "Emergency contact must be a valid Indian mobile number"
//     });
// }

//         const latestSensor = await SensorData.findOne().sort({ timestamp: -1 });
//         const latestSymptomLog = await SymptomLog.findOne({ userId }).sort({ loggedAt: -1 });

//         const liveLocation =
//             location?.latitude != null && location?.longitude != null
//                 ? {
//                       latitude: location.latitude,
//                       longitude: location.longitude
//                   }
//                 : latestSensor?.location
//                 ? {
//                       latitude: latestSensor.location.latitude,
//                       longitude: latestSensor.location.longitude
//                   }
//                 : null;

//         const smsText = [
//             "Asthma Support Alert.",
//             "High asthma risk with breathing symptoms detected.",
//             "Please check on the patient immediately.",
//             latestSymptomLog?.loggedAt
//                 ? `Symptom time: ${new Date(latestSymptomLog.loggedAt).toLocaleString()}`
//                 : null,
//             liveLocation
//     ? `Location: https://maps.google.com/?q=${liveLocation.latitude},${liveLocation.longitude}`
//     : "Live location unavailable."
//         ]
//             .filter(Boolean)
//             .join(" ");

//         await sendEmergencySMS(phone, smsText);

//         return res.status(200).json({
//             success: true,
//             message: "Emergency SMS sent successfully"
//         });
//     } catch (error) {
//         console.error("Emergency alert error:", error);
//         return res.status(500).json({
//             success: false,
//             message: "Failed to send emergency SMS",
//             error: error.message
//         });
//     }
// };

// module.exports = {
//     triggerEmergencyAlert
// };



// const MedicalProfile = require("../models/MedicalProfile");
// const SensorData = require("../models/SensorData");
// const SymptomLog = require("../models/SymptomLog");
// const sendEmergencySMS = require("../utils/sendEmergencySMS");

// const triggerEmergencyAlert = async (req, res) => {
//     try {
//         const { userId } = req.body;

//         if (!userId) {
//             return res.status(400).json({
//                 success: false,
//                 message: "userId is required"
//             });
//         }

//         const medicalProfile = await MedicalProfile.findOne({ userId });
//         if (!medicalProfile?.emergency_contact_phone) {
//             return res.status(400).json({
//                 success: false,
//                 message: "No emergency contact phone found"
//             });
//         }

//         const phone = String(medicalProfile.emergency_contact_phone).replace(/[\s\-()]/g, "");

//         if (!/^\+[1-9]\d{9,14}$/.test(phone)) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Emergency contact phone must be in international format like +14155552671"
//             });
//         }

//         const latestSensor = await SensorData.findOne().sort({ timestamp: -1 });
//         const latestSymptomLog = await SymptomLog.findOne({ userId }).sort({ loggedAt: -1 });

//         const smsText = [
//             "Asthma Support Alert.",
//             "High asthma risk with breathing symptoms detected.",
//             latestSymptomLog?.loggedAt
//                 ? `Symptom time: ${new Date(latestSymptomLog.loggedAt).toLocaleString()}`
//                 : null,
//             latestSensor?.location
//                 ? `Location: ${latestSensor.location.latitude}, ${latestSensor.location.longitude}`
//                 : null
//         ]
//             .filter(Boolean)
//             .join(" ");

//         await sendEmergencySMS(phone, smsText);

//         return res.status(200).json({
//             success: true,
//             message: "Emergency SMS sent successfully"
//         });
//     } catch (error) {
//         console.error("Emergency alert error:", error);
//         return res.status(500).json({
//             success: false,
//             message: "Failed to send emergency SMS",
//             error: error.message
//         });
//     }
// };

// module.exports = {
//     triggerEmergencyAlert
// };