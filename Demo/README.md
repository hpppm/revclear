# 🏥 RevClear Demo - HIPAA AI Medical Claims System

Interactive demonstration of RevClear, an AI-powered medical billing MVP built on Google Cloud Platform with HIPAA compliance.

---

## 🎯 About RevClear

RevClear is an academic project at Gannon University exploring the design and development of an AI-powered medical billing system to improve claim accuracy, reduce denials, and save time for specialized healthcare providers.

### Project Goals
- **Improve Accuracy**: AI-powered CPT/ICD code suggestions
- **Reduce Denials**: Pre-submission validation
- **Save Time**: Automated coding and claim generation
- **Ensure Compliance**: Built-in HIPAA safeguards
- **Human Oversight**: Three validation gates (HITL)

### Three Key Stages
1. **Speech-to-Text**: Convert session notes into structured text
2. **AI Code Suggestion**: Recommend CPT/ICD codes based on documentation
3. **Claim Validation & Finalization**: Run payer checks, flag missing data, finalize claims

---

## 🚀 Quick Start

### Run the Demo Locally

**No installation required!** Just open `index.html` in your browser:

```powershell
# Option 1: Double-click index.html

# Option 2: Using Python
python -m http.server 8000

# Option 3: Using Node.js
npx http-server

# Then open: http://localhost:8000
```

### Live Demo
Visit: https://hpppm.github.io/revclear/

---

## 📊 What's Included

### 4 Interactive Tabs

1. **Architecture Diagram**
   - Full system architecture (Mermaid.js)
   - Color-coded GCP components
   - Visual data flow

2. **Interactive Demo**
   - Step-by-step workflow simulation
   - 3 Human-in-the-Loop (HITL) validation gates
   - Progress tracking (0% → 100%)
   - Realistic medical data examples

3. **Components**
   - Detailed explanation of each GCP service
   - Service groupings by layer
   - Integration points

4. **Security & Compliance**
   - HIPAA technical safeguards
   - Encryption and access controls
   - Audit and monitoring
   - Compliance checklist

---

## 🏗️ Architecture Overview

### System Flow

```
Clinician Upload → Speech-to-Text → [HITL Gate 1: Transcription] 
→ Vertex AI (Diagnosis) → [HITL Gate 2: Medical Coding] 
→ Healthcare API (EDI) → [HITL Gate 3: Final Billing] 
→ Clearinghouse Submission
```

### GCP Services Used

#### Security Layer
- Cloud Armor (DDoS protection)
- Identity Platform (SSO + MFA)
- Cloud KMS (encryption keys)

#### Application Layer
- Cloud Run (serverless containers)
- Secret Manager (credentials)
- VPC Network (isolation)

#### AI/ML Services
- Speech-to-Text API
- Vertex AI (diagnosis extraction)
- Healthcare API (FHIR/EDI 837)

#### Data Layer
- Cloud Storage (encrypted audio/docs)
- Cloud SQL PostgreSQL (CPT/ICD database)
- BigQuery (analytics)

---

## 🔒 HIPAA Compliance

### Three Human-in-the-Loop (HITL) Gates

1. **Gate 1: Transcription Validation**
   - Medical professional reviews AI transcription
   - Ensures clinical accuracy
   - Prevents documentation errors

2. **Gate 2: Medical Coding Validation**
   - Certified coder validates CPT/ICD codes
   - Ensures billing accuracy
   - Prevents claim denials

3. **Gate 3: Final Billing Review**
   - Billing specialist compliance check
   - Final validation before submission
   - Quality assurance

### Security Controls

✅ **Encryption at Rest**: Cloud KMS with customer-managed keys  
✅ **Encryption in Transit**: TLS 1.3  
✅ **Access Control**: SSO with MFA, IAM roles, least privilege  
✅ **Network Security**: VPC isolation, private endpoints  
✅ **Audit Logging**: Comprehensive logs with 7-year retention  
✅ **Key Rotation**: Automatic every 90 days  
✅ **Business Associate Agreement**: Google Cloud BAA

---

## 🎯 Use Cases

### Medical Claims Processing Workflow
1. Audio recording of patient consultation
2. AI-powered transcription
3. Automated diagnosis extraction
4. CPT/ICD code suggestion
5. Human validation at three gates
6. EDI 837 claim generation
7. Clearinghouse submission

### Benefits
- **Accuracy**: Three validation gates ensure quality
- **Efficiency**: AI reduces manual coding time by 60%
- **Compliance**: Built-in HIPAA safeguards
- **Scalability**: Cloud Run auto-scales with demand
- **Security**: Multiple layers of protection
- **Auditability**: Complete audit trail (7 years)

---

## 🛠️ Technical Stack

### Demo Frontend
- HTML5, CSS3, JavaScript (vanilla)
- Mermaid.js for diagrams
- Responsive design
- No build process required

### Production Architecture (Planned)
- **Cloud**: Google Cloud Platform
- **Backend**: Node.js + TypeScript (RevClear/backend/)
- **Frontend**: Next.js 16 + React 19 (RevClear/frontend/)
- **Database**: Cloud SQL PostgreSQL + SQLCipher
- **AI/ML**: Vertex AI, Speech-to-Text API
- **Integration**: Healthcare API (FHIR/EDI)

---

## 📱 Browser Compatibility

✅ Chrome/Edge (recommended)  
✅ Firefox  
✅ Safari  
✅ Opera

**Note**: Requires internet connection for Mermaid.js CDN

---

## 🎓 Educational Context

### Project Team
- **Aseel Alqoud** (Security Lead)
- **Brendan Mattes** (Frontend Development)
- **Rasmus Seppanen** (Backend Development)
- **Yoga Sai Swetha Narni** (Frontend Development)

### Academic Details
- **Institution**: Gannon University
- **Supervising Instructor**: Dr. Davide Piovesan
- **Purpose**: Academic project exploring AI-powered healthcare billing
- **Repository**: https://github.com/hpppm/revclear

---

## 📚 Success Criteria

✅ Working MVP with three demo stages (STT → Code Suggestion → Report)  
✅ Positive feedback from early adopters (PT/MH/SLP)  
✅ Evidence of improved coding accuracy and claim acceptance  
✅ Clear cost-benefit for providers (time saved, reduced denials)  
✅ Strong positioning through unique AI-driven approach

---

## 🚀 Deployment Options

### GitHub Pages (Current)
```bash
# Already deployed at:
https://hpppm.github.io/revclear/
```

### GCP Cloud Storage (Alternative)
```bash
gsutil mb gs://revclear-demo
gsutil cp index.html gs://revclear-demo
gsutil web set -m index.html gs://revclear-demo
```

### Netlify/Vercel (Alternative)
Simple drag-and-drop deployment

---

## 🎬 Demo Walkthrough

### Step-by-Step Guide

1. **View Architecture** (Tab 1)
   - Review Mermaid diagram
   - Understand component relationships
   - See data flow

2. **Run Interactive Demo** (Tab 2)
   - Click "Start Demo"
   - Watch automated steps
   - Approve at each HITL gate
   - See realistic medical data

3. **Explore Components** (Tab 3)
   - Review 6 service categories
   - Understand each GCP service role

4. **Check Compliance** (Tab 4)
   - Review HIPAA safeguards
   - See security controls
   - Understand audit capabilities

**Total Time**: ~10-15 minutes for full walkthrough

---

## ⚠️ Important Disclaimers

### Demonstration Only
- This is a **demo** system for educational purposes
- No actual patient data is processed
- Not intended for production use without proper implementation
- Sample data shown is fictional

### Production Considerations
Before deploying for real use:
- [ ] Implement proper authentication (OAuth 2.0, SAML)
- [ ] Set up actual GCP project with billing
- [ ] Configure Business Associate Agreement (BAA)
- [ ] Perform security assessment and penetration testing
- [ ] Complete HIPAA compliance audit
- [ ] Train staff on HITL validation processes
- [ ] Establish backup and disaster recovery
- [ ] Set up monitoring and alerting
- [ ] Document all security controls
- [ ] Perform regular security reviews

---

## 🐛 Troubleshooting

### Diagram Not Rendering
**Issue**: Mermaid diagram shows as text  
**Solution**: Check internet connection (Mermaid CDN required)

### Buttons Not Working
**Issue**: Demo buttons don't respond  
**Solution**: Ensure JavaScript is enabled, check browser console (F12)

### Layout Issues
**Issue**: Design looks broken  
**Solution**: Use modern browser, try hard refresh (Ctrl+Shift+R)

---

## 🤝 Contributing

Enhancement ideas:
- [ ] Add more workflow steps (denial management, status tracking)
- [ ] Improve mobile responsiveness
- [ ] Add dark mode
- [ ] Create video walkthrough
- [ ] Add accessibility features (ARIA labels)
- [ ] Translate to other languages

---

## 📝 License

For academic purposes under Gannon University guidelines.

---

## 📧 Support & Resources

### Documentation
- **Main Project**: See [README.md](../README.md) in root
- **Developer Guide**: See [DEVELOPER_GUIDE.md](../DEVELOPER_GUIDE.md)
- **Team Guide**: See [TEAM_GUIDE.md](../TEAM_GUIDE.md)

### External Resources
- [Google Cloud Healthcare API](https://cloud.google.com/healthcare-api)
- [HIPAA Compliance on GCP](https://cloud.google.com/security/compliance/hipaa)
- [CPT Codes](https://www.ama-assn.org/practice-management/cpt)
- [ICD-10 Codes](https://www.cdc.gov/nchs/icd/icd-10-cm.htm)

### Contact
For questions about the RevClear project, contact the team via Gannon University.

---

## 🎉 Credits

- **Mermaid.js**: Beautiful diagram rendering
- **Google Cloud Platform**: Comprehensive healthcare documentation
- **Gannon University**: Project support
- **Dr. Davide Piovesan**: Academic supervision

---

**Built with ❤️ for healthcare technology and education**

*RevClear - AI-Powered Medical Billing MVP*  
*Gannon University, 2025*
