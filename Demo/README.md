# 🏥 RevClear Demo - HIPAA AI Medical Claims System

Interactive demonstration of RevClear, an AI-powered medical billing platform built on AWS with HIPAA compliance.

**Live Demo**: https://hpppm.github.io/revclear/

---

## 🎯 About RevClear

RevClear is a healthcare claims management platform for mental health, physical therapy, and speech-language pathology practices. It automates the billing workflow from clinical documentation to insurance claim submission.

**Current Status**: Phase 1 - Core infrastructure deployed on AWS

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

### Demo Pages

1. **Main Demo (index.html)**
   - 5 Interactive tabs with full system overview
   - Modern UI with gradient text and animated elements
   - **Integrated authentication modal** (Login/Signup)
   - Architecture diagrams and workflow simulation
   - Real-time API call tracker
   - Sticky header navigation
   - Modern footer with tech badges

### 5 Interactive Tabs (Main Demo)

1. **Architecture Diagram**
   - Full system architecture (Mermaid.js)
   - Color-coded GCP components
   - Visual data flow

2. **Interactive Demo**
   - Step-by-step workflow simulation
   - 3 Human-in-the-Loop (HITL) validation gates
   - Progress tracking (0% → 100%)
   - Realistic medical data examples
   - Real-time API call tracker

3. **API Routes**
   - Complete RESTful API documentation
   - 40+ endpoint specifications
   - Request/response examples
   - Authentication flow details

4. **Components & Security**
   - Detailed explanation of each GCP service
   - Service groupings by layer
   - HIPAA compliance checklist
   - Security controls overview

---

## 🏗️ Architecture Overview

### System Flow

```
Clinician Upload → Speech-to-Text → [HITL Gate 1: Transcription] 
→ Vertex AI (Diagnosis) → [HITL Gate 2: Medical Coding] 
→ Healthcare API (EDI) → [HITL Gate 3: Final Billing] 
→ Clearinghouse Submission
```

### AWS Services Used

#### Security Layer
- AWS WAF & Shield (DDoS protection)
- Amazon Cognito (SSO + MFA)
- AWS KMS (encryption keys)

#### Application Layer
- AWS Fargate (serverless containers)
- AWS Secrets Manager (credentials)
- Amazon VPC (isolation)

#### AI/ML Services
- Amazon Transcribe
- Amazon SageMaker (diagnosis extraction)
- AWS HealthLake (FHIR/EDI 837)

#### Data Layer
- Amazon S3 (encrypted audio/docs)
- Amazon RDS PostgreSQL (CPT/ICD database)
- Amazon Redshift (analytics)

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

✅ **Encryption at Rest**: AWS KMS with customer-managed keys  
✅ **Encryption in Transit**: TLS 1.3  
✅ **Access Control**: SSO with MFA, IAM roles, least privilege  
✅ **Network Security**: Amazon VPC isolation, private endpoints  
✅ **Audit Logging**: Comprehensive logs with 7-year retention  
✅ **Key Rotation**: Automatic every 90 days  
✅ **Business Associate Agreement**: AWS BAA

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
- **Cloud**: AWS (Amazon Web Services)
- **Backend**: Node.js + TypeScript (RevClear/backend/)
- **Frontend**: Next.js 16 + React 19 (RevClear/frontend/)
- **Database**: Amazon RDS PostgreSQL + SQLCipher
- **AI/ML**: Amazon SageMaker, Amazon Transcribe
- **Integration**: AWS HealthLake (FHIR/EDI)

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
- **Repository**: https://github.com/YOUR_USERNAME/YOUR_REPO

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

### AWS S3 (Alternative)
```bash
aws s3 mb s3://revclear-demo
aws s3 cp index.html s3://revclear-demo/
aws s3 website s3://revclear-demo/ --index-document index.html
```

### Netlify/Vercel (Alternative)
Simple drag-and-drop deployment

---

## 🎬 Demo Walkthrough

### Step-by-Step Guide

#### Option 1: Full User Journey (Recommended)
1. **Sign Up** (signup.html)
   - Navigate to signup page
   - Fill out clinician registration form
   - Experience password validation
   - Get redirected to login

2. **Log In** (login.html)
   - Use demo credentials (pre-filled)
   - Experience authentication flow
   - Get redirected to main demo

3. **Explore Main Demo** (index.html)
   - View Architecture diagram
   - Run interactive workflow
   - Track API calls in real-time
   - Review security features

#### Option 2: Direct Demo Access
1. **View Architecture** (Tab 1)
   - Review Mermaid diagram
   - Understand component relationships
   - See data flow

2. **Run Interactive Demo** (Tab 2)
   - Click "Start Demo"
   - Watch automated steps
   - Approve at each HITL gate
   - See realistic medical data
   - Monitor API calls (top-right tracker)

3. **Explore API Routes** (Tab 3)
   - Browse 40+ endpoints
   - See authentication flow
   - Review request/response formats

4. **Check Components & Security** (Tab 4)
   - Review GCP service details
   - See HIPAA safeguards
   - Understand security controls
   - Review audit capabilities

**Total Time**: 
- Quick demo: ~5 minutes (direct access)
- Full journey: ~10-15 minutes (with signup/login)

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
- [ ] Set up actual AWS account with billing
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

### Recent Enhancements ✅
- ✅ Added clinician signup page with validation
- ✅ Added secure login page with demo mode
- ✅ Integrated authentication flow
- ✅ Added navigation links between pages
- ✅ Password strength requirements
- ✅ Real-time form validation

### Future Enhancement Ideas
- [ ] Add more workflow steps (denial management, status tracking)
- [ ] Implement actual Firebase/Supabase authentication
- [ ] Add patient dashboard mockup
- [ ] Improve mobile responsiveness
- [ ] Add dark mode toggle
- [ ] Create video walkthrough
- [ ] Add accessibility features (ARIA labels)
- [ ] Translate to other languages
- [ ] Add forgot password flow
- [ ] Implement 2FA/MFA demo

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
- [AWS HealthLake](https://aws.amazon.com/healthlake/)
- [HIPAA Compliance on AWS](https://aws.amazon.com/compliance/hipaa-compliance/)
- [CPT Codes](https://www.ama-assn.org/practice-management/cpt)
- [ICD-10 Codes](https://www.cdc.gov/nchs/icd/icd-10-cm.htm)

### Contact
For questions about the RevClear project, contact the team via Gannon University.

---

## 🎉 Credits

- **Mermaid.js**: Beautiful diagram rendering
- **AWS (Amazon Web Services)**: Comprehensive healthcare documentation
- **Gannon University**: Project support
- **Dr. Davide Piovesan**: Academic supervision

---

**Built with ❤️ for healthcare technology and education**

*RevClear - AI-Powered Medical Billing MVP*  
*Gannon University, 2025*
