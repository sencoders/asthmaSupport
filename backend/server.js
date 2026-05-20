const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

console.log("Env file path:", path.join(__dirname, ".env"));
console.log("PORT loaded:", process.env.PORT);
console.log("JWT loaded:", !!process.env.JWT_SECRET);

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");

const SensorData = require("./models/SensorData");
const authRoutes = require("./routes/authRoutes");
const profileRoutes = require("./routes/profileRoutes");
const symptomRoutes = require("./routes/symptomRoutes");
const riskRoutes = require("./routes/riskRoutes");


const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.log("DB Error:", err));

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/symptoms", symptomRoutes);
app.use("/api/risk", riskRoutes);


app.get("/api/testsymptoms", (req, res) => {
    res.json({ message: "direct server route works" });
});

/* =============================
   STORE LATEST BROWSER LOCATION
============================= */
let latestBrowserLocation = null;

/* =============================
   RECEIVE SENSOR DATA FROM ESP32 OVER WIFI
============================= */
app.post("/api/sensordata", async (req, res) => {
    try {
        console.log("Incoming sensor data:", req.body);

        const newData = new SensorData({
            ...req.body,
            location: latestBrowserLocation
                ? {
                    latitude: latestBrowserLocation.latitude,
                    longitude: latestBrowserLocation.longitude
                }
                : undefined
        });

        await newData.save();

        console.log("Stored in MongoDB with location:", newData.location);

        res.status(201).json({
            success: true,
            message: "Sensor data stored successfully",
            data: newData
        });
    } catch (error) {
        console.error("Sensor data save error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to store sensor data",
            error: error.message
        });
    }
});

/* =============================
   RECEIVE LIVE LOCATION
============================= */
app.post("/api/location", async (req, res) => {
    try {
        const { latitude, longitude } = req.body;

        console.log("Incoming location:", req.body);

        if (latitude == null || longitude == null) {
            return res.status(400).json({ error: "Invalid location data" });
        }

        latestBrowserLocation = { latitude, longitude };

        console.log("Latest browser location updated:", latestBrowserLocation);

        res.json({ message: "Location received successfully" });
    } catch (error) {
        console.error("Location error:", error);
        res.status(500).json({ error: "Server error" });
    }
});

app.get("/api/latest", async (req, res) => {
    try {
        const latest = await SensorData.findOne().sort({ timestamp: -1 });
        res.json(latest);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/api/history", async (req, res) => {
    try {
        const history = await SensorData.find()
            .sort({ timestamp: -1 })
            .limit(30);

        res.json(history.reverse());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/", (req, res) => {
    res.send("Asthma Monitoring API Running");
});

/* =============================
   ERROR HANDLER
============================= */
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({
            success: false,
            message: "Audio upload failed",
            error: err.message
        });
    }

    if (err) {
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message
        });
    }

    next();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});




