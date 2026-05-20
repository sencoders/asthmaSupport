function clampRisk(score) {
    return Math.max(0, Math.min(1, score));
}

function getRiskLabel(score) {
    if (score <= 0.33) return "Low";
    // if (score <= 0.66) return "Moderate";
    if (score <= 0.8) return "Moderate";
    return "High";
}

module.exports = {
    clampRisk,
    getRiskLabel
};