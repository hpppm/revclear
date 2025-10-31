# RevClear AI Medical System

**AI-Powered Medical Billing That Learns to Reduce Claim Denials**

RevClear is an automated medical billing platform designed for Physical Therapy, Mental Health, and Speech-Language Pathology practices. It uses AI to transform patient consultations into compliant insurance claims through a human-in-the-loop workflow.

## 🎯 Key Features

- **🎤 Voice Transcription**: Convert patient consultations to text using Google Cloud Speech-to-Text with medical vocabulary
- **🤖 AI Code Extraction**: Automatically extract ICD-10 and CPT codes using Vertex AI
- **📊 Analytics & Learning**: Store claim data in BigQuery for ML model training and continuous improvement
- **🔒 HIPAA Compliant**: End-to-end encryption with Google Cloud KMS
- **👥 Human-in-the-Loop**: Three validation gates ensure accuracy and compliance

## 🏗️ Architecture

Built on Google Cloud Platform with a focus on security and scalability:

- **Frontend**: Interactive demo showcasing the full workflow
- **Authentication**: SSO + MFA for clinician access
- **Storage**: Cloud Storage for audio files, Cloud SQL for claim data
- **AI/ML**: Vertex AI for medical code extraction, BigQuery ML for predictive analytics
- **Integration**: EDI 837 generation and clearinghouse submission

## 🚀 Interactive Demo

Explore the complete workflow with our interactive demo:

1. **Upload & Authentication**: Secure clinician login and audio upload
2. **Speech-to-Text**: Google Cloud transcription with medical terminology
3. **HITL Gate 1**: Clinical review of transcription accuracy
4. **AI Analysis**: Vertex AI extracts diagnosis and billing codes
5. **HITL Gate 2**: Medical coder validates CPT/ICD codes
6. **EDI Generation**: Create EDI 837 Professional claim format
7. **HITL Gate 3**: Final billing approval
8. **Submission**: Submit to clearinghouse and store analytics

[View Live Demo](Demo/index.html) (Open locally)

## 📋 Specialties Supported

- 🧠 **Mental Health**: Therapy sessions, psychiatric consultations
- 🏃 **Physical Therapy**: Treatment sessions, evaluations
- 💬 **Speech-Language Pathology**: Therapy sessions, assessments

## 🔐 Security & Compliance

- ✅ **HIPAA Compliant**: BAA with Google Cloud
- ✅ **Data Encryption**: At-rest and in-transit encryption
- ✅ **Access Controls**: Role-based access with audit logging
- ✅ **PHI Protection**: Secure handling of protected health information

## 📖 Documentation

- [API Routes](API_ROUTES.md) - Complete API documentation
- [Workflow](WORKFLOW.md) - Detailed process flow

## 🛠️ Technology Stack

- **Cloud Provider**: Google Cloud Platform
- **AI/ML**: Vertex AI, BigQuery ML
- **Storage**: Cloud Storage, Cloud SQL, BigQuery
- **Security**: Cloud KMS, IAM, VPC
- **Frontend**: HTML5, CSS3, JavaScript (vanilla)

## 🎨 Design Inspiration

Modern medical UI inspired by leading healthcare platforms:
- WebPT (therapy management)
- Suki AI (medical assistant)
- Relume.io (modern components)

## 📊 Project Status

🚧 **In Development** - This is a demonstration/prototype project showcasing an AI-powered medical billing workflow.

## 🤝 Contributing

This project is currently in development. Contributions, issues, and feature requests are welcome!

## 📝 License

© 2025 RevClear. All rights reserved.

---

**Note**: This is a demonstration project. No actual patient data is processed. All examples use simulated data for illustration purposes.
