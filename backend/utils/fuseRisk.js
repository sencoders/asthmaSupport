const { getActiveSymptomRisk, clampRisk, getRiskLabel } = require("./symptomRisk");

function getFinalRisk(baseRisk, latestLog, respiratoryResult) {
    const symptomAdjusted = getActiveSymptomRisk(baseRisk, latestLog);

    const audioScore = respiratoryResult?.audio_score ?? 0;

    let audioOffset = 0;
    const threshold = respiratoryResult?.threshold ?? 0.5;

    if (audioScore >= threshold) {
    audioOffset = Math.min(audioScore * 0.20, 0.20);
    }

    const baseScoreAfterSymptoms = symptomAdjusted?.score ?? baseRisk.score;
    const finalScore = clampRisk(baseScoreAfterSymptoms + audioOffset);

    return {
        score: Number(finalScore.toFixed(3)),
        label: getRiskLabel(finalScore),
        probabilities: baseRisk.probabilities,
        symptomOffset: symptomAdjusted?.symptomOffset ?? 0,
        audioOffset: Number(audioOffset.toFixed(3)),
        isSymptomAdjusted: symptomAdjusted?.isSymptomAdjusted ?? false,
        activeUntil: symptomAdjusted?.activeUntil ?? null,
        respiratoryLabel: respiratoryResult?.audio_label ?? "Not provided"
    };
}

module.exports = getFinalRisk;