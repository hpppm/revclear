# 🏥 HIPAA AI Medical Claims System - Google Cloud Architecture Demo

An interactive demo of a HIPAA-compliant medical claims processing system built on Google Cloud Platform, featuring AI/ML components and Human-in-the-Loop (HITL) validation gates.

## 🚀 Quick Start

### Run Locally (No Installation Required!)

1. **Open the demo in your browser:**
   - Simply double-click `index.html`, or
   - Right-click `index.html` → Open with → Your Browser
   - Or drag `index.html` into your browser window

2. **That's it!** No installation, no dependencies, no build process required.

### Alternative: Using a Local Server

If you prefer to run a local web server:

```powershell
# Using Python 3
python -m http.server 8000

# Using Node.js (if you have http-server installed)
npx http-server

# Using PHP
php -S localhost:8000
```

Then open: `http://localhost:8000`

## 📊 What's Included

### Interactive Features

1. **Architecture Diagram Tab** 
   - Full system architecture using Mermaid.js
   - Color-coded components by function
   - Visual representation of all GCP services

2. **Interactive Demo Tab**
   - Step-by-step workflow simulation
   - 3 Human-in-the-Loop (HITL) validation gates
   - Progress tracking and status updates
   - Realistic data examples

3. **Components Tab**
   - Detailed explanation of each GCP service
   - Service groupings by layer
   - Integration points and data flow

4. **Security & Compliance Tab**
   - HIPAA technical safeguards
   - Encryption and access controls
   - Audit and monitoring capabilities
   - Compliance checklist

## 🏗️ Architecture Overview

### System Flow

```
Clinician Upload → Speech-to-Text → [HITL Gate 1: Transcription Review] 
→ Vertex AI (Code Extraction) → [HITL Gate 2: Medical Coding Review] 
→ Healthcare API (EDI Generation) → [HITL Gate 3: Final Billing Review] 
→ External Clearinghouse Submission
```

### Key Components

#### Frontend & Security
- **Load Balancer**: HTTPS/SSL termination
- **Cloud Armor WAF**: DDoS and threat protection
- **Identity Platform**: SSO + MFA authentication

#### Application Layer
- **Cloud Run**: Serverless auto-scaling containers
- **Secret Manager**: Secure credential storage
- **VPC Network**: Private connectivity and isolation

#### AI/ML Services
- **Speech-to-Text API**: Medical transcription
- **Vertex AI**: Diagnosis extraction and code suggestion
- **Healthcare API**: FHIR resources and EDI 837 generation

#### Data Layer
- **Cloud Storage**: Audio files and documents (encrypted)
- **Cloud SQL PostgreSQL**: CPT/ICD reference database
- **BigQuery**: Analytics warehouse

#### Security & Monitoring
- **Cloud KMS**: Three encryption keys (GCS, SQL, BigQuery)
- **Cloud Audit Logs**: 7-year retention
- **App Hub**: Service health monitoring

## 🔒 HIPAA Compliance Features

### Three-Gate HITL System

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

- ✅ **Encryption at Rest**: Cloud KMS with customer-managed keys
- ✅ **Encryption in Transit**: TLS 1.3 for all communications
- ✅ **Access Control**: SSO with MFA, IAM roles, least privilege
- ✅ **Network Security**: VPC isolation, private endpoints
- ✅ **Audit Logging**: Comprehensive logs with 7-year retention
- ✅ **Key Rotation**: Automatic every 90 days
- ✅ **Business Associate Agreement**: Google Cloud BAA in place

## 🎯 Use Cases

### Medical Claims Processing
- Audio recording of patient consultation
- AI-powered transcription and diagnosis extraction
- Automated CPT/ICD code suggestion
- Human validation at critical points
- EDI 837 claim generation
- Clearinghouse submission

### Benefits
- **Accuracy**: Three validation gates ensure quality
- **Efficiency**: AI reduces manual coding time
- **Compliance**: Built-in HIPAA safeguards
- **Scalability**: Cloud Run auto-scales with demand
- **Security**: Multiple layers of protection
- **Auditability**: Complete audit trail

## 🛠️ Technical Stack

### Frontend
- **HTML5**: Semantic markup
- **CSS3**: Modern responsive design
- **JavaScript**: Vanilla JS (no frameworks)
- **Mermaid.js**: Diagram rendering (CDN)

### Cloud Services (Production Architecture)
- Google Cloud Platform (GCP)
- Cloud Run (serverless containers)
- Vertex AI (ML models)
- Healthcare API (FHIR/EDI)
- Cloud SQL PostgreSQL
- BigQuery
- Cloud Storage
- Cloud KMS
- Cloud Armor
- Pub/Sub
- Secret Manager
- App Hub

## 📱 Browser Compatibility

The demo works in all modern browsers:
- ✅ Chrome/Edge (recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Opera

**Note**: Requires internet connection to load Mermaid.js CDN for diagram rendering.

## 🎨 Demo Features

### Interactive Workflow
- **Start Demo Button**: Initiates the workflow
- **Progress Bar**: Visual progress tracking (0% → 100%)
- **Step-by-Step**: Each stage shown separately
- **HITL Gates**: Interactive approval buttons
- **Realistic Data**: Sample transcripts and medical codes
- **Status Updates**: Real-time status changes (Pending → Processing → Review → Complete)
- **Smooth Animations**: Fade-in effects and auto-scrolling

### Navigation
- **Tab System**: Easy navigation between 4 sections
- **Smooth Scrolling**: Auto-scroll to active steps
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Color-Coded**: Blue (main), Yellow (HITL gates), Purple (AI), Green (data), Red (security)

## 📚 Learning Resources

### Google Cloud Documentation
- [Healthcare API](https://cloud.google.com/healthcare-api)
- [Vertex AI](https://cloud.google.com/vertex-ai)
- [Cloud Run](https://cloud.google.com/run)
- [HIPAA Compliance](https://cloud.google.com/security/compliance/hipaa)

### Medical Coding
- [CPT Codes](https://www.ama-assn.org/practice-management/cpt)
- [ICD-10 Codes](https://www.cdc.gov/nchs/icd/icd-10-cm.htm)
- [EDI 837 Format](https://www.cms.gov/medicare/regulations-guidance/administrative-simplification/hipaa-edi)

## 🔧 Customization

### Modify the Diagram
Edit the Mermaid code in `index.html` around line 340:
```html
<pre class="mermaid">
---
config:
  theme: base
  look: neo
---
flowchart TB
    // Your custom diagram here
</pre>
```

### Change Color Scheme
Modify CSS variables in `<style>` section (around line 10):
```css
/* Main colors */
--primary: #4285f4;  /* Google Blue */
--secondary: #34a853; /* Google Green */
--accent: #fbbc04;    /* Google Yellow */
--danger: #ea4335;    /* Google Red */
```

### Add Custom Workflow Steps
Add steps in the Interactive Demo section:
```html
<div class="workflow-step" id="stepX">
    <span class="step-status status-pending">Step X: Title</span>
    <h3>🎯 Your Step Title</h3>
    <p>Description of what happens in this step</p>
</div>
```

## 🚀 Deployment Options

### GitHub Pages (Free)
1. Push this repo to GitHub
2. Go to Settings > Pages
3. Select main branch
4. Your demo will be live at `https://username.github.io/repo-name`

### Netlify (Free)
1. Sign up at [netlify.com](https://netlify.com)
2. Drag and drop the folder to Netlify
3. Instant deployment with HTTPS
4. Custom domain support available

### Vercel (Free)
```bash
npm i -g vercel
vercel
```

### Google Cloud Storage (Static Website)
```bash
# Create bucket
gsutil mb gs://your-demo-bucket-name

# Copy file
gsutil cp index.html gs://your-demo-bucket-name

# Make public
gsutil iam ch allUsers:objectViewer gs://your-demo-bucket-name

# Configure as website
gsutil web set -m index.html gs://your-demo-bucket-name
```

## 📊 Demo Walkthrough

### Step 1: Architecture Overview
1. Click the **Architecture** tab (default view)
2. View the complete Mermaid diagram
3. Scroll down to see component cards
4. Understand the data flow and connections

### Step 2: Interactive Demo
1. Click the **Interactive Demo** tab
2. Click **Start Demo** button
3. Watch automated steps:
   - Step 1: Upload (1.5s)
   - Step 2: Transcription (2s)
4. Click **✓ Approve Transcription** at HITL Gate 1
5. Watch AI analysis (2s)
6. Click **✓ Approve Codes** at HITL Gate 2
7. Watch EDI generation (1.5s)
8. Click **✓ Approve for Submission** at HITL Gate 3
9. Watch final submission (2s)
10. See completion message

### Step 3: Component Details
1. Click the **Components** tab
2. Review 6 component categories:
   - Frontend & Security
   - Application Layer
   - AI/ML Services
   - Data Layer
   - Security & Compliance
   - Event & Integration

### Step 4: Security & Compliance
1. Click the **Security & Compliance** tab
2. Review HIPAA safeguards:
   - Encryption strategy
   - Access controls
   - Audit & monitoring
   - HITL gates
   - Threat protection
3. Check the 4 compliance cards at bottom

## 🎓 Educational Use

This demo is perfect for:
- **Architecture Presentations**: Show stakeholders the system design
- **Training Sessions**: Teach medical coding workflow with HITL gates
- **Compliance Reviews**: Demonstrate HIPAA controls to auditors
- **Technical Interviews**: Discuss cloud architecture patterns
- **Sales Demos**: Show AI/ML healthcare capabilities
- **Academic Projects**: Learn healthcare IT systems (RevClear project)
- **Conference Talks**: Visual aid for healthcare technology presentations

## 💡 Project Context: RevClear

This demo was created to visualize the architecture for **RevClear**, an AI-powered medical billing MVP academic project at Gannon University. The demo shows how the system could be implemented on Google Cloud Platform with:

- Speech-to-Text for session notes
- AI code suggestion (CPT/ICD)
- Claim validation & finalization
- HIPAA compliance built-in
- Human validation at critical points

### RevClear Team
- Aseel Alqoud
- Brendan Mattes
- Rasmus Seppanen
- Yoga Sai Swetha Narni

**Supervising Instructor**: Dr. Davide Piovesan, Gannon University

## ⚠️ Important Notes

### Disclaimer
- This is a **demonstration** system only
- No actual patient data is processed
- Not intended for production use without proper implementation
- Sample data shown for educational purposes only
- Consult healthcare IT and legal professionals before deploying

### Production Considerations
If building this for real:
- [ ] Implement proper authentication (OAuth 2.0, SAML)
- [ ] Set up actual GCP project with billing
- [ ] Configure Business Associate Agreement (BAA) with Google Cloud
- [ ] Perform security assessment and penetration testing
- [ ] Complete HIPAA compliance audit
- [ ] Train staff on HITL validation processes
- [ ] Establish backup and disaster recovery procedures
- [ ] Set up monitoring and alerting
- [ ] Implement rate limiting and API quotas
- [ ] Create runbooks for incident response
- [ ] Document all security controls
- [ ] Perform regular security reviews

## 🐛 Troubleshooting

### Diagram Not Rendering
- **Issue**: Mermaid diagram shows as text
- **Solution**: Check internet connection (Mermaid CDN required)
- **Alternative**: Download Mermaid.js locally and update the script tag

### Buttons Not Working
- **Issue**: Demo buttons don't respond
- **Solution**: Ensure JavaScript is enabled in your browser
- **Check**: Browser console for errors (F12)

### Layout Issues
- **Issue**: Design looks broken
- **Solution**: Use a modern browser (Chrome, Edge, Firefox, Safari)
- **Try**: Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

### Slow Performance
- **Issue**: Demo is laggy
- **Solution**: Close other browser tabs
- **Check**: Browser extensions might interfere

## 🤝 Contributing

Want to enhance this demo? Ideas:

- [ ] Add more workflow steps (claim status tracking, denial management)
- [ ] Improve mobile responsiveness
- [ ] Add dark mode toggle
- [ ] Create printable version
- [ ] Add export to PDF functionality
- [ ] Include cost estimation for GCP services
- [ ] Add more realistic sample data
- [ ] Create video walkthrough
- [ ] Add accessibility features (ARIA labels, keyboard navigation)
- [ ] Translate to other languages

## 📝 License

This demo is provided as-is for educational and demonstration purposes under Gannon University academic guidelines.

## 📧 Support & Contact

For questions about:
- **GCP Services**: [Google Cloud Support](https://cloud.google.com/support)
- **HIPAA Compliance**: Consult healthcare IT compliance experts
- **Medical Coding**: Work with certified medical coders (CPC, CCS)
- **This Demo**: Review the code and comments in `index.html`
- **RevClear Project**: Contact the team via Gannon University

## 🎉 Credits & Acknowledgments

- **Mermaid.js**: For beautiful diagram rendering
- **Google Cloud Platform**: For comprehensive documentation
- **Healthcare Industry**: For standards (HIPAA, HL7 FHIR, EDI 837)
- **Gannon University**: For project support
- **Dr. Davide Piovesan**: For academic supervision

## 🔗 Additional Resources

### Architecture Patterns
- [Google Cloud Architecture Framework](https://cloud.google.com/architecture/framework)
- [HIPAA on GCP](https://cloud.google.com/security/compliance/hipaa)
- [Healthcare & Life Sciences Solutions](https://cloud.google.com/solutions/healthcare-life-sciences)

### Similar Projects
- [Google Cloud Healthcare API Samples](https://github.com/GoogleCloudPlatform/healthcare)
- [FHIR Server Examples](https://github.com/google/fhir)
- [Medical Coding Tools](https://github.com/topics/medical-coding)

### Standards & Specifications
- [HL7 FHIR R4](https://www.hl7.org/fhir/)
- [X12 EDI 837](https://x12.org/)
- [HIPAA Security Rule](https://www.hhs.gov/hipaa/for-professionals/security/index.html)

---

**Built with ❤️ for healthcare technology and education**

*Project: RevClear - AI-Powered Medical Billing MVP*  
*Institution: Gannon University*  
*Last Updated: October 30, 2025*

---

## 🎬 Quick Demo Checklist

Before presenting:
- [ ] Open `index.html` in browser
- [ ] Test internet connection (for Mermaid CDN)
- [ ] Navigate through all 4 tabs
- [ ] Run the interactive demo once
- [ ] Check that all animations work
- [ ] Prepare talking points for HITL gates
- [ ] Be ready to explain GCP services
- [ ] Have HIPAA compliance points ready
- [ ] Test on presentation screen/projector
- [ ] Bookmark for quick access

**Presentation Time: ~10-15 minutes for full walkthrough**

Enjoy exploring the HIPAA AI Medical Claims System! 🏥✨
