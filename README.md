# asthmaSupport-Real-Time IoT-Based Personalised Asthma Risk Prediction System Using Machine Learning

AsthmaSupport is a real-time multi-modal asthma risk prediction and monitoring system that combines IoT environmental sensing, clinical personalization, symptom tracking, and respiratory audio analysis into a unified intelligent healthcare platform.

The project integrates:
- Environmental air-quality monitoring
- Personalized asthma risk prediction
- Temporal symptom decay modeling
- Audio-based wheeze detection
- Explainable risk attribution
- Full-stack web dashboard
- ESP32 IoT hardware integration

---

# Features

## Real-Time Environmental Monitoring
- PM1, PM2.5, PM10
- CO monitoring
- O₃ monitoring
- NO₂ monitoring
- Temperature & humidity sensing

## Personalized Asthma Risk Prediction
- Clinical profile integration
- Smoking history
- Asthma severity
- Hospitalization history
- Trigger sensitivity
- Medication usage

## Audio-Based Wheeze Detection
- Dual-scale SE-ResNet CNN
- Respiratory sound analysis
- Wheeze probability prediction
- Real-time audio upload support

## Temporal Symptom Tracking
- 60-minute linear symptom decay model
- Dynamic symptom influence adjustment
- Acute exacerbation handling

## Explainable Risk
- Risk factor attribution
- Environmental contribution analysis
- Symptom contribution analysis
- Clinical contribution analysis

## IoT Hardware Integration
- ESP32 DevKit V1
- PMS5003
- MQ-7
- MQ-131
- MiCS-2714
- DHT11
- Custom DOAS NO₂ sensor

---

# System Architecture

The system consists of six layers:

1. IoT Sensor Layer
2. Communication Layer
3. Backend API Layer
4. Machine Learning Layer
5. Database Layer
6. Frontend Dashboard Layer

---

# Tech Stack

## Frontend
- React.js
- Tailwind CSS
- Axios
- Recharts

## Backend
- Node.js
- Express.js
- JWT Authentication
- Multer
- REST APIs

## Machine Learning
- Python
- Random Forest
- CNN
- PyTorch
- Scikit-learn
- Librosa

## Database
- MongoDB / Supabase

## IoT Hardware
- ESP32 DevKit V1
- Embedded C / Arduino

---

# Machine Learning Models

## Environment Risk Model
- Model: Random Forest
- Accuracy: 96.34%
- F1 Score: 0.980 ± 0.005

## Personalized Risk Model
- Model: Random Forest
- Accuracy: 98.17%
- Sensitivity: 98.2%

## Wheeze Detection Model
- Model: Dual-scale SE-ResNet CNN
- AUC-ROC: 0.9078
- F1 Macro: 0.8377

---

# Hardware Components

| Sensor | Purpose |
|---|---|
| PMS5003 | PM1 / PM2.5 / PM10 |
| MQ-7 | CO detection |
| MQ-131 | O₃ detection |
| MiCS-2714 | NO₂ detection |
| DHT11 | Temperature & Humidity |
| Custom DOAS | Optical NO₂ sensing |

---

# Environment Variables

Create a `.env` file inside the `backend/` folder.

```env
PORT=3000

MONGO_URI=your_mongodb_connection

JWT_SECRET=your_secret_key
```

---

# Setup

## Clone Repository

```bash
git clone https://github.com/sencoders/asthmaSupport.git

cd asthmaSupport
```

---

## Backend Setup

```bash
cd backend

npm install

npm run dev
```

---

## Frontend Setup

```bash
cd frontend

npm install

npm run dev
```

---

## ML Environment Setup

```bash
cd ml

pip install -r requirements.txt
```

---


## ESP32 Firmware
Upload firmware using Arduino IDE.

---

# API Endpoints

## Authentication
- POST `/auth/register`
- POST `/auth/login`

## Risk Prediction
- POST `/risk/environment`
- POST `/risk/personalized`
- POST `/risk/final`

## Audio
- POST `/audio/predict`

## Sensor Data
- POST `/sensor/upload`

---

# Research Contributions

- Multi-modal asthma risk prediction framework
- Temporal symptom decay modeling
- Low-cost DOAS optical NO₂ sensing
- Integrated wheeze detection pipeline
- Explainable healthcare framework

---

# Performance

| Component | Performance |
|---|---|
| System Latency | < 800 ms |
| Audio Inference | ~3.2 s |
| Dataset Size | 1,912 self-collected observations |
| Wheeze Dataset | ICBHI 2017 |

---


# Future Work

- Multi-site clinical validation
- SHAP explainability
- Emergency support integration
- Improved wheeze sensitivity
- Full DOAS firmware optimization

---



