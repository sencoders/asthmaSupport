const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

console.log("riskRoutes loaded");

const riskController = require("../controllers/riskController");

console.log("Handlers:", {
    getEnvironmentalRisk: typeof riskController.getEnvironmentalRisk,
    getPersonalizedRisk: typeof riskController.getPersonalizedRisk,
    getFinalRiskWithAudio: typeof riskController.getFinalRiskWithAudio
});

const upload = multer({
    dest: path.join(__dirname, "../uploads/audio"),
    limits: {
        fileSize: 20 * 1024 * 1024 // 20 MB
    }
});

router.get("/environment", riskController.getEnvironmentalRisk);
router.get("/personalized/:userId", riskController.getPersonalizedRisk);
router.post("/final/:userId", upload.single("audio"), riskController.getFinalRiskWithAudio);

module.exports = router;




// const express = require("express");
// const router = express.Router();
// console.log("riskRoutes loaded");

// const {
//     getEnvironmentalRisk,
//     getPersonalizedRisk
// } = require("../controllers/riskController");

// const {
//     generateExplanation,
//     generateRecommendations
// } = require("../utils/explainability");

// router.get("/environment", getEnvironmentalRisk);
// router.get("/personalized/:userId", getPersonalizedRisk);

// module.exports = router;





// const express = require("express");
// const router = express.Router();
// const { getEnvironmentalRisk } = require("../controllers/riskController");

// router.get("/", getEnvironmentalRisk);

// module.exports = router;

