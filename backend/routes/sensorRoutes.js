const express = require("express");
const router = express.Router();
const SensorData = require("../models/SensorData");

// ESP / device will hit this (NO AUTH)
router.post("/", async (req, res) => {

    const data = req.body;

    const saved = await SensorData.create(data);

    res.json(saved);
});

// get latest sensor data
router.get("/latest", async (req, res) => {
    const latest = await SensorData.findOne().sort({ timestamp: -1 });
    res.json(latest);
});

module.exports = router;