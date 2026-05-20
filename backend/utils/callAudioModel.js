const { spawn } = require("child_process");
const path = require("path");

function callAudioModel(audioFilePath) {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(__dirname, "../../ml/scripts/predict_audio_risk.py");

        const py = spawn("python", [scriptPath, audioFilePath], {
            cwd: path.join(__dirname, ".."),
            shell: true
        });

        let stdout = "";
        let stderr = "";

        py.stdout.on("data", (data) => {
            stdout += data.toString();
        });

        py.stderr.on("data", (data) => {
            stderr += data.toString();
        });

        py.on("close", (code) => {
            console.log("Audio model stdout:", stdout);
            console.log("Audio model stderr:", stderr);
            console.log("Audio model exit code:", code);

            try {
                const parsed = JSON.parse(stdout.trim());

                if (parsed.error) {
                    return reject(new Error(parsed.error));
                }

                if (code !== 0) {
                    return reject(
                        new Error(`Audio model process failed. Code=${code}. stderr=${stderr}`)
                    );
                }

                resolve(parsed);
            } catch (err) {
                return reject(
                    new Error(`Failed to parse audio model output. Raw stdout: ${stdout}. stderr: ${stderr}`)
                );
            }
        });

        py.on("error", (err) => {
            reject(new Error(`Failed to start audio model process: ${err.message}`));
        });
    });
}

module.exports = callAudioModel;