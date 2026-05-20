const { spawn } = require("child_process");
const path = require("path");

function callPersonalizedRiskModel(inputData) {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(__dirname, "../../ml/scripts/predict_personalized_risk.py");

        const inputJson = JSON.stringify({
            co_ppm: inputData.co_ppm,
            o3_ppb: inputData.o3_ppb,
            no2_ppb: inputData.no2_ppb,
            temperature: inputData.temperature,
            humidity: inputData.humidity,
            pm1: inputData.pm1,
            pm25: inputData.pm25,
            pm10: inputData.pm10,

            age: inputData.age,
            asthma_severity: inputData.asthma_severity,
            known_triggers: inputData.known_triggers,
            last_hospitalization: inputData.last_hospitalization,
            rescue_inhaler_use: inputData.rescue_inhaler_use,
            smoking_status: inputData.smoking_status,
            height_cm: inputData.height_cm,
            weight_kg: inputData.weight_kg
        });

        const pythonProcess = spawn("python", [scriptPath, inputJson]);

        let output = "";
        let errorOutput = "";

        pythonProcess.stdout.on("data", (data) => {
            output += data.toString();
        });

        pythonProcess.stderr.on("data", (data) => {
            errorOutput += data.toString();
        });

        pythonProcess.on("close", (code) => {
            if (code !== 0 && !output) {
                return reject(new Error(errorOutput || `Python process exited with code ${code}`));
            }

            try {
                const parsed = JSON.parse(output.trim());

                if (!parsed.success) {
                    return reject(new Error(parsed.error || "Personalized ML prediction failed"));
                }

                resolve(parsed);
            } catch (err) {
                reject(new Error(`Failed to parse Python output: ${output}`));
            }
        });
    });
}

module.exports = callPersonalizedRiskModel;