function severityText(level) {
    if (!level) return null;
    return String(level).trim().toLowerCase();
}

function hasSymptom(symptomValue) {
    if (!symptomValue) return false;
    const v = String(symptomValue).trim().toLowerCase();
    return v !== "" && v !== "none" && v !== "n/a";
}

function symptomLevelText(symptomValue) {
    if (!symptomValue) return "";
    return String(symptomValue).trim();
}

function symptomImpactText(symptomValue) {
    const v = String(symptomValue || "").trim().toLowerCase();

    if (v.includes("severe") || v.includes("significant")) {
        return "strongly increases short-term risk";
    }
    if (v.includes("moderate")) {
        return "noticeably increases short-term risk";
    }
    if (v.includes("mild")) {
        return "slightly increases short-term risk";
    }

    return "increases short-term risk";
}

function generateExplanation({ sensorData, profile, symptomLog, finalLabel, isSymptomAdjusted = false }) {
    const environmentFactors = [];
    const profileFactors = [];
    const symptomFactors = [];
    const dominantReasons = [];

    if (sensorData) {
        if (sensorData.pm25 > 35) {
            environmentFactors.push(`PM2.5 is high at ${sensorData.pm25}.`);
            dominantReasons.push("High PM2.5");
        } else if (sensorData.pm25 >= 16) {
            environmentFactors.push(`PM2.5 is moderately elevated at ${sensorData.pm25}.`);
        }

        if (sensorData.pm10 > 100) {
            environmentFactors.push(`PM10 is high at ${sensorData.pm10}.`);
            dominantReasons.push("High PM10");
        } else if (sensorData.pm10 >= 46) {
            environmentFactors.push(`PM10 is moderately elevated at ${sensorData.pm10}.`);
        }

        if (sensorData.pm1 > 35) {
            environmentFactors.push(`PM1 is high at ${sensorData.pm1}.`);
        } else if (sensorData.pm1 >= 10) {
            environmentFactors.push(`PM1 is moderately elevated at ${sensorData.pm1}.`);
        }

        if (sensorData.no2_ppb > 51) {
            environmentFactors.push(`NO₂ is high at ${sensorData.no2_ppb} ppb.`);
            dominantReasons.push("High NO₂");
        } else if (sensorData.no2_ppb >= 21) {
            environmentFactors.push(`NO₂ is elevated at ${sensorData.no2_ppb} ppb.`);
        }

        if (sensorData.o3_ppb > 61) {
            environmentFactors.push(`Ozone is high at ${sensorData.o3_ppb} ppb.`);
            dominantReasons.push("High ozone");
        } else if (sensorData.o3_ppb >= 36) {
            environmentFactors.push(`Ozone is elevated at ${sensorData.o3_ppb} ppb.`);
        }

        if (sensorData.co_ppm > 6) {
            environmentFactors.push(`CO is high at ${sensorData.co_ppm} ppm.`);
        } else if (sensorData.co_ppm >= 2.1) {
            environmentFactors.push(`CO is moderately elevated at ${sensorData.co_ppm} ppm.`);
        }

        if (sensorData.temperature <= 15 || sensorData.temperature >= 35) {
            environmentFactors.push(`Temperature is uncomfortable at ${sensorData.temperature}°C.`);
        } else if (
            (sensorData.temperature > 15 && sensorData.temperature < 20) ||
            (sensorData.temperature > 30 && sensorData.temperature < 35)
        ) {
            environmentFactors.push(`Temperature may be mildly uncomfortable at ${sensorData.temperature}°C.`);
        }

        if (sensorData.humidity > 60) {
            environmentFactors.push(`Humidity is high at ${sensorData.humidity}%.`);
        } else if (sensorData.humidity < 30 || (sensorData.humidity > 50 && sensorData.humidity <= 60)) {
            environmentFactors.push(`Humidity is outside the ideal comfort range at ${sensorData.humidity}%.`);
        }
    }

    if (profile) {
        const sev = severityText(profile.asthma_severity);

        if (sev?.includes("severe")) {
            profileFactors.push("Your asthma severity increases baseline vulnerability.");
            dominantReasons.push("Severe asthma profile");
        } else if (sev?.includes("moderate")) {
            profileFactors.push("Your asthma profile suggests moderate baseline sensitivity.");
        } else if (sev?.includes("mild")) {
            profileFactors.push("Your asthma profile suggests some baseline sensitivity.");
        } else if (sev?.includes("intermittent")) {
            profileFactors.push("Your asthma profile suggests lower baseline sensitivity than persistent asthma.");
        }

        const hosp = String(profile.last_hospitalization || "").toLowerCase();
        if (hosp.includes("3 months") || hosp.includes("last year")) {
            profileFactors.push("Recent hospitalization history increases caution.");
        }

        const inhaler = String(profile.rescue_inhaler_use || "").toLowerCase();
        if (inhaler.includes("daily") || inhaler.includes("often")) {
            profileFactors.push("Frequent rescue inhaler use suggests higher asthma vulnerability.");
            dominantReasons.push("Higher inhaler-use history");
        } else if (inhaler.includes("sometimes")) {
            profileFactors.push("Past rescue inhaler use suggests some ongoing sensitivity.");
        }

        const smoking = String(profile.smoking_status || "").toLowerCase();
        if (smoking.includes("current")) {
            profileFactors.push("Current smoking status increases respiratory risk.");
            dominantReasons.push("Smoking-related vulnerability");
        } else if (smoking.includes("passive")) {
            profileFactors.push("Passive smoke exposure may worsen asthma sensitivity.");
        } else if (smoking.includes("former")) {
            profileFactors.push("Past smoking history may still affect respiratory sensitivity.");
        }

        const triggers = Array.isArray(profile.known_triggers)
            ? profile.known_triggers.map(t => String(t).toLowerCase())
            : [];

        if (triggers.some(t => t.includes("dust"))) {
            profileFactors.push("Dust is a known trigger for you.");
        }
        if (triggers.some(t => t.includes("pollen") || t.includes("seasonal"))) {
            profileFactors.push("Pollen or seasonal exposure is a known trigger for you.");
        }
        if (triggers.some(t => t.includes("smoke"))) {
            profileFactors.push("Smoke is a known trigger for you.");
            dominantReasons.push("Smoke trigger sensitivity");
        }
        if (triggers.some(t => t.includes("humidity") || t.includes("damp"))) {
            profileFactors.push("Humidity-related conditions can trigger your symptoms.");
        }
        if (triggers.some(t => t.includes("cold"))) {
            profileFactors.push("Cold air is a known trigger for you.");
        }
        if (triggers.some(t => t.includes("pollution") || t.includes("traffic"))) {
            profileFactors.push("Pollution exposure is a known trigger for you.");
            dominantReasons.push("Pollution trigger sensitivity");
        }
    }

    if (symptomLog) {
        if (hasSymptom(symptomLog.cough)) {
            symptomFactors.push(`Recent ${symptomLevelText(symptomLog.cough).toLowerCase()} cough ${symptomImpactText(symptomLog.cough)}.`);
            dominantReasons.push("Recent cough");
        }

        if (hasSymptom(symptomLog.wheezing)) {
            symptomFactors.push(`Recent ${symptomLevelText(symptomLog.wheezing).toLowerCase()} wheezing ${symptomImpactText(symptomLog.wheezing)}.`);
            dominantReasons.push("Recent wheezing");
        }

        if (hasSymptom(symptomLog.shortnessOfBreath)) {
            symptomFactors.push(`Recent ${symptomLevelText(symptomLog.shortnessOfBreath).toLowerCase()} shortness of breath ${symptomImpactText(symptomLog.shortnessOfBreath)}.`);
            dominantReasons.push("Recent breathlessness");
        }

        if (hasSymptom(symptomLog.chestTightness)) {
            symptomFactors.push(`Recent ${symptomLevelText(symptomLog.chestTightness).toLowerCase()} chest tightness ${symptomImpactText(symptomLog.chestTightness)}.`);
        }

        if (hasSymptom(symptomLog.nighttimeAwakening)) {
            symptomFactors.push("Recent nighttime awakening suggests active symptom burden.");
            dominantReasons.push("Nighttime symptoms");
        }

        if (isSymptomAdjusted) {
            symptomFactors.unshift("Recent symptoms are actively increasing your current displayed risk.");
        }
    }

    return {
        summary: `Your current asthma risk is ${finalLabel}.`,
        environmentFactors,
        profileFactors,
        symptomFactors,
        dominantReasons: [...new Set(dominantReasons)].slice(0, 4)
    };
}

function generateRecommendations({ sensorData, profile, symptomLog, finalLabel }) {
    const immediate = [];
    const exposure = [];
    const comfort = [];
    const medical = [];

    if (finalLabel === "High") {
        immediate.push("Keep your rescue inhaler nearby.");
        immediate.push("Avoid strenuous activity until your breathing feels comfortable.");
        medical.push("Seek medical help promptly if symptoms worsen or do not improve.");
    } else if (finalLabel === "Moderate") {
        immediate.push("Monitor your breathing and reduce unnecessary trigger exposure.");
        medical.push("Be alert for worsening symptoms over the next few hours.");
    } else {
        immediate.push("Current risk is relatively low, but continue regular monitoring.");
    }

    if (sensorData) {
        if (sensorData.pm25 > 35 || sensorData.pm10 > 100 || sensorData.pm1 > 35) {
            exposure.push("Reduce outdoor exposure because particulate levels are elevated.");
            exposure.push("Keep windows closed if outdoor air feels dusty or polluted.");
        }

        if (sensorData.no2_ppb > 21) {
            exposure.push("Avoid traffic-heavy roads and combustion-related fumes due to elevated NO₂.");
        }

        if (sensorData.o3_ppb > 36) {
            exposure.push("Avoid outdoor exercise when ozone levels are elevated.");
        }

        if (sensorData.co_ppm > 2.1) {
            comfort.push("Move to a better-ventilated and cleaner-air environment if possible.");
        }

        if (sensorData.temperature <= 15 || sensorData.temperature >= 35) {
            comfort.push("Stay in a more temperature-stable environment to reduce breathing discomfort.");
        }

        if (sensorData.humidity > 60) {
            comfort.push("Try to stay in a less humid indoor environment if possible.");
        } else if (sensorData.humidity < 30) {
            comfort.push("Dry air may irritate airways, so avoid overly dry environments if possible.");
        }
    }

    if (profile) {
        const triggers = Array.isArray(profile.known_triggers)
            ? profile.known_triggers.map(t => String(t).toLowerCase())
            : [];

        if (triggers.some(t => t.includes("dust"))) {
            exposure.push("Avoid dusty rooms or activities that stir dust.");
        }
        if (triggers.some(t => t.includes("pollen") || t.includes("seasonal"))) {
            exposure.push("Limit exposure to pollen if you are going outside.");
        }
        if (triggers.some(t => t.includes("smoke"))) {
            exposure.push("Stay away from cigarette smoke, smoke sources, or burning fumes.");
        }
        if (triggers.some(t => t.includes("pollution") || t.includes("traffic"))) {
            exposure.push("Reduce time near roads, traffic, and other pollution-heavy areas.");
        }
        if (triggers.some(t => t.includes("cold"))) {
            comfort.push("Avoid sudden exposure to cold air.");
        }
        if (triggers.some(t => t.includes("humidity") || t.includes("damp"))) {
            comfort.push("Avoid damp or highly humid places when possible.");
        }
    }

    if (symptomLog) {
        const hasAnySymptoms =
            hasSymptom(symptomLog.cough) ||
            hasSymptom(symptomLog.wheezing) ||
            hasSymptom(symptomLog.shortnessOfBreath) ||
            hasSymptom(symptomLog.chestTightness) ||
            hasSymptom(symptomLog.nighttimeAwakening);

        if (hasAnySymptoms) {
            immediate.push("Because you recently logged symptoms, monitor yourself closely for the next few hours.");
            medical.push("Use your prescribed relief plan if symptoms become stronger.");
        }

        if (hasSymptom(symptomLog.shortnessOfBreath) || hasSymptom(symptomLog.wheezing)) {
            medical.push("If wheezing or breathlessness increases, seek medical attention urgently.");
        }
    }

    return {
        immediate: [...new Set(immediate)],
        exposure: [...new Set(exposure)],
        comfort: [...new Set(comfort)],
        medical: [...new Set(medical)]
    };
}

module.exports = {
    generateExplanation,
    generateRecommendations
};