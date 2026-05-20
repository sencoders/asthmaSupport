const { spawn } = require("child_process");
const path = require("path");

function callEnvironmentModel(sensorData) {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(__dirname, "../../ml/scripts/predict_environment.py");

        const inputJson = JSON.stringify({
            co_ppm: sensorData.co_ppm,
            o3_ppb: sensorData.o3_ppb,
            no2_ppb: sensorData.no2_ppb,
            temperature: sensorData.temperature,
            humidity: sensorData.humidity,
            pm1: sensorData.pm1,
            pm25: sensorData.pm25,
            pm10: sensorData.pm10
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
                    return reject(new Error(parsed.error || "ML prediction failed"));
                }

                resolve(parsed);
            } catch (err) {
                reject(new Error(`Failed to parse Python output: ${output}`));
            }
        });
    });
}

module.exports = callEnvironmentModel;