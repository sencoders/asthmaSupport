const SYMPTOM_ACTIVE_MINUTES = 60;
const SYMPTOM_ACTIVE_MS = SYMPTOM_ACTIVE_MINUTES * 60 * 1000;

function symptomValue(level) {
    const map = {
        "": 0,
        "None": 0,
        "Mild": 0.25,
        "Moderate": 0.55,
        "Significant": 0.80,
        "Severe": 1.0
    };
    return map[level] ?? 0;
}

function calculateRawSymptomOffset(symptomLog) {
    if (!symptomLog) return 0;

    const cough = symptomValue(symptomLog.cough);
    const wheezing = symptomValue(symptomLog.wheezing);
    const shortnessOfBreath = symptomValue(symptomLog.shortnessOfBreath);
    const chestTightness = symptomValue(symptomLog.chestTightness);
    const nighttimeAwakening = symptomValue(symptomLog.nighttimeAwakening);

    const offset =
        0.15 * cough +
        0.28 * wheezing +
        0.35 * shortnessOfBreath +
        0.22 * chestTightness +
        0.20 * nighttimeAwakening;

    return Math.min(offset, 0.35);
}

function getDecayedSymptomOffset(rawOffset, loggedAtMs, nowMs) {
    const elapsed = nowMs - loggedAtMs;
    if (elapsed <= 0) return rawOffset;
    if (elapsed >= SYMPTOM_ACTIVE_MS) return 0;

    // Linear decay: full effect at logging time, gradually falls to 0
    const remainingFraction = 1 - (elapsed / SYMPTOM_ACTIVE_MS);
    return rawOffset * remainingFraction;
}

function clampRisk(score) {
    return Math.max(0, Math.min(1, score));
}

function getRiskLabel(score) {
    if (score <= 0.33) return "Low";
    if (score < 0.75) return "Moderate";
    return "High";
}

function getActiveSymptomRisk(baseRisk, latestLog) {
    if (!baseRisk) return null;

    if (!latestLog?.loggedAt) {
        return {
            ...baseRisk,
            symptomOffset: 0,
            rawSymptomOffset: 0,
            isSymptomAdjusted: false,
            activeUntil: null
        };
    }

    const loggedAtMs = new Date(latestLog.loggedAt).getTime();
    const activeUntilMs = loggedAtMs + SYMPTOM_ACTIVE_MS;
    const nowMs = Date.now();

    const rawSymptomOffset = calculateRawSymptomOffset(latestLog);
    const symptomOffset = getDecayedSymptomOffset(rawSymptomOffset, loggedAtMs, nowMs);

    if (symptomOffset <= 0) {
        return {
            ...baseRisk,
            symptomOffset: 0,
            rawSymptomOffset: Number(rawSymptomOffset.toFixed(3)),
            isSymptomAdjusted: false,
            activeUntil: new Date(activeUntilMs).toISOString()
        };
    }

    const finalScore = clampRisk(baseRisk.score + symptomOffset);

    return {
        score: Number(finalScore.toFixed(3)),
        label: getRiskLabel(finalScore),
        probabilities: baseRisk.probabilities,
        symptomOffset: Number(symptomOffset.toFixed(3)),
        rawSymptomOffset: Number(rawSymptomOffset.toFixed(3)),
        isSymptomAdjusted: true,
        activeUntil: new Date(activeUntilMs).toISOString()
    };
}

module.exports = {
    SYMPTOM_ACTIVE_MINUTES,
    SYMPTOM_ACTIVE_MS,
    symptomValue,
    calculateRawSymptomOffset,
    getDecayedSymptomOffset,
    clampRisk,
    getRiskLabel,
    getActiveSymptomRisk
};


// const SYMPTOM_ACTIVE_MINUTES = 30;
// const SYMPTOM_ACTIVE_MS = SYMPTOM_ACTIVE_MINUTES * 60 * 1000;

// function symptomValue(level) {
//     const map = {
//         "": 0,
//         "None": 0,
//         "Mild": 0.33,
//         "Moderate": 0.66,
//         "Significant": 0.85,
//         "Severe": 1.0
//     };
//     return map[level] ?? 0;
// }

// function calculateSymptomOffset(symptomLog) {
//     if (!symptomLog) return 0;

//     const cough = symptomValue(symptomLog.cough);
//     const wheezing = symptomValue(symptomLog.wheezing);
//     const shortnessOfBreath = symptomValue(symptomLog.shortnessOfBreath);
//     const chestTightness = symptomValue(symptomLog.chestTightness);
//     const nighttimeAwakening = symptomValue(symptomLog.nighttimeAwakening);

//     const offset =
//         0.20 * cough +
//         0.30 * wheezing +
//         0.35 * shortnessOfBreath +
//         0.25 * chestTightness +
//         0.20 * nighttimeAwakening;

//     return Math.min(offset, 0.35);
// }

// function clampRisk(score) {
//     return Math.max(0, Math.min(1, score));
// }

// function getRiskLabel(score) {
//     if (score <= 0.33) return "Low";
//     if (score < 7.5) return "Moderate";
//     return "High";
// }

// function getActiveSymptomRisk(baseRisk, latestLog) {
//     if (!baseRisk) return null;

//     if (!latestLog?.loggedAt) {
//         return {
//             ...baseRisk,
//             symptomOffset: 0,
//             isSymptomAdjusted: false,
//             activeUntil: null
//         };
//     }

//     const loggedAtMs = new Date(latestLog.loggedAt).getTime();
//     const activeUntilMs = loggedAtMs + SYMPTOM_ACTIVE_MS;
//     const now = Date.now();

//     if (now > activeUntilMs) {
//         return {
//             ...baseRisk,
//             symptomOffset: 0,
//             isSymptomAdjusted: false,
//             activeUntil: new Date(activeUntilMs).toISOString()
//         };
//     }

//     const symptomOffset = calculateSymptomOffset(latestLog);
//     const finalScore = clampRisk(baseRisk.score + symptomOffset);

//     return {
//         score: Number(finalScore.toFixed(3)),
//         label: getRiskLabel(finalScore),
//         probabilities: baseRisk.probabilities,
//         symptomOffset: Number(symptomOffset.toFixed(3)),
//         isSymptomAdjusted: true,
//         activeUntil: new Date(activeUntilMs).toISOString()
//     };
// }

// module.exports = {
//     SYMPTOM_ACTIVE_MINUTES,
//     SYMPTOM_ACTIVE_MS,
//     symptomValue,
//     calculateSymptomOffset,
//     clampRisk,
//     getRiskLabel,
//     getActiveSymptomRisk
// };