function symptomValue(level) {
    const map = {
        "": 0,
        "None": 0,
        "Mild": 0.33,
        "Moderate": 0.66,
        "Significant": 0.85,
        "Severe": 1.0
    };

    return map[level] ?? 0;
}

function calculateSymptomOffset(symptomLog) {
    const cough = symptomValue(symptomLog.cough);
    const wheezing = symptomValue(symptomLog.wheezing);
    const shortnessOfBreath = symptomValue(symptomLog.shortnessOfBreath);
    const chestTightness = symptomValue(symptomLog.chestTightness);
    const nighttimeAwakening = symptomValue(symptomLog.nighttimeAwakening);

    const offset =
        0.20 * cough +
        0.30 * wheezing +
        0.35 * shortnessOfBreath +
        0.25 * chestTightness +
        0.20 * nighttimeAwakening;

    return Math.min(offset, 0.35);
}

module.exports = { calculateSymptomOffset };