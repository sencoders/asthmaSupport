const express = require("express");
const router = express.Router();

const MedicalProfile = require("../models/MedicalProfile");
const authMiddleware = require("../middleware/authMiddleware");

/* =============================
   CREATE OR UPDATE MEDICAL PROFILE
============================= */
router.post("/", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;

        const profileData = {
            userId,
            age: req.body.age,
            gender: req.body.gender,
            height_cm: req.body.height_cm,
            weight_kg: req.body.weight_kg,
            smoking_status: req.body.smoking_status,
            asthma_severity: req.body.asthma_severity,
            rescue_inhaler_use: req.body.rescue_inhaler_use,
            last_hospitalization: req.body.last_hospitalization,
            known_triggers: req.body.known_triggers || [],
            emergency_contact_phone: req.body.emergency_contact_phone
                ? req.body.emergency_contact_phone.replace(/[\s\-()]/g, "")
                : ""
        };

        const profile = await MedicalProfile.findOneAndUpdate(
            { userId: userId },
            profileData,
            {
                new: true,
                upsert: true,
                runValidators: true
            }
        );

        res.status(200).json({
            message: "Medical profile saved successfully",
            profile
        });

    } catch (error) {
        console.error("Profile save error:", error);
        res.status(500).json({
            message: "Server error while saving medical profile",
            error: error.message
        });
    }
});

/* =============================
   GET LOGGED-IN USER MEDICAL PROFILE
============================= */
router.get("/", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;

        const profile = await MedicalProfile.findOne({ userId });

        if (!profile) {
            return res.status(404).json({
                message: "Medical profile not found"
            });
        }

        res.status(200).json(profile);

    } catch (error) {
        console.error("Profile fetch error:", error);
        res.status(500).json({
            message: "Server error while fetching medical profile"
        });
    }
});

module.exports = router;