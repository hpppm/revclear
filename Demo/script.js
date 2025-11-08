// RevClear Demo Script - Properly structured JavaScript

// Global Variables
let apiCallCounter = 0;
let currentStep = 0;
const totalSteps = 8;

// Initialize Mermaid for diagrams
mermaid.initialize({
    startOnLoad: true,
    theme: 'base',
    themeVariables: {
        primaryColor: '#6366f1',
        primaryTextColor: '#ffffff',
        primaryBorderColor: '#4f46e5',
        lineColor: '#64748b',
        secondaryColor: '#10b981',
        tertiaryColor: '#f59e0b'
    }
});

// API Call Tracker Functions
function toggleApiTracker() {
    const tracker = document.getElementById('apiTracker');
    const btn = document.querySelector('.api-toggle-btn');
    if (tracker && btn) {
        tracker.classList.toggle('visible');
        btn.classList.toggle('active');
    }
}

function logApiCall(method, endpoint, description, payload = null, responseData = null, status = 'success') {
    apiCallCounter++;
    const apiCallCount = document.getElementById('apiCallCount');
    if (apiCallCount) {
        apiCallCount.textContent = apiCallCounter;
    }

    const trackerBody = document.getElementById('apiTrackerBody');
    if (!trackerBody) return;

    // Clear the "no calls" message on first call
    if (apiCallCounter === 1) {
        trackerBody.innerHTML = '';
    }

    const timestamp = new Date().toLocaleTimeString();

    let payloadHtml = '';
    if (payload) {
        payloadHtml = `
            <div class="api-call-details">
                <strong>Request Body:</strong>
                <div class="api-call-payload">${JSON.stringify(payload, null, 2)}</div>
            </div>
        `;
    }

    let responseHtml = '';
    if (responseData) {
        responseHtml = `
            <div class="api-call-details">
                <strong>Response:</strong>
                <div class="api-call-payload">${JSON.stringify(responseData, null, 2)}</div>
            </div>
        `;
    }

    const apiCallHtml = `
        <div class="api-call ${status}">
            <div>
                <span class="api-call-method method-${method.toLowerCase()}">${method}</span>
                <span class="api-call-endpoint">${endpoint}</span>
            </div>
            <div style="margin-top: 5px; color: #5f6368;">${description}</div>
            ${payloadHtml}
            ${responseHtml}
            <div class="api-call-time">⏱️ ${timestamp}</div>
        </div>
    `;

    trackerBody.insertAdjacentHTML('afterbegin', apiCallHtml);

    // Auto-show tracker on first call
    if (apiCallCounter === 1) {
        setTimeout(() => {
            const tracker = document.getElementById('apiTracker');
            if (tracker && !tracker.classList.contains('visible')) {
                toggleApiTracker();
            }
        }, 500);
    }
}

// Tab Switching
function showTab(tabName) {
    // Hide all tabs
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => tab.classList.remove('active'));

    // Remove active from all tab buttons
    const tabButtons = document.querySelectorAll('.tab');
    tabButtons.forEach(btn => btn.classList.remove('active'));

    // Show selected tab
    const targetTab = document.getElementById(tabName);
    const targetButton = event.target.closest('.tab');

    if (targetTab && targetButton) {
        targetTab.classList.add('active');
        targetButton.classList.add('active');
    }
}

// Demo Workflow Functions
function updateProgress() {
    const progress = (currentStep / totalSteps) * 100;
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
        progressBar.style.width = progress + '%';
        progressBar.textContent = Math.round(progress) + '%';
    }
}

function updateStepStatus(stepId, status) {
    const step = document.getElementById(stepId);
    if (!step) return;

    const statusSpan = step.querySelector('.step-status');
    if (!statusSpan) return;

    statusSpan.classList.remove('status-pending', 'status-processing', 'status-review', 'status-complete');

    if (status === 'processing') {
        statusSpan.classList.add('status-processing');
        statusSpan.textContent = `Step ${currentStep}: ⏳ Processing`;
    } else if (status === 'review') {
        statusSpan.classList.add('status-review');
        statusSpan.textContent = `Step ${currentStep}: 👁️ REVIEW REQUIRED`;
    } else if (status === 'complete') {
        statusSpan.classList.add('status-complete');
        statusSpan.textContent = `Step ${currentStep - 1}: ✓ Complete`;
    }
}

function startDemo() {
    currentStep = 1;
    updateProgress();

    // Step 1: Upload - Authenticate User
    logApiCall(
        'POST',
        '/api/v1/auth/login',
        'Authenticate clinician with SSO + MFA',
        {
            email: 'dr.smith@clinic.com',
            mfa_code: '123456'
        },
        {
            success: true,
            token: 'eyJhbGc...',
            user_id: 'usr_12345',
            role: 'clinician'
        }
    );

    updateStepStatus('step1', 'processing');

    setTimeout(() => {
        // Upload audio file
        logApiCall(
            'POST',
            '/api/v1/claims/upload',
            'Upload audio file to Amazon S3 with encryption',
            {
                patient_id: 'PAT-2025-001',
                file_name: 'consultation_20251030.mp3',
                file_size: '2.4 MB'
            },
            {
                upload_id: 'upl_789xyz',
                s3_path: 's3://arevclear-raw/2025/10/consultation_20251030.mp3',
                status: 'uploaded',
                encryption: 'AES-256-KMS'
            }
        );

        updateStepStatus('step1', 'complete');
        currentStep = 2;
        updateProgress();

        // Step 2: Transcription
        updateStepStatus('step2', 'processing');

        logApiCall(
            'POST',
            '/api/v1/transcription/start',
            'Trigger Amazon Transcribe for medical audio transcription',
            {
                upload_id: 'upl_789xyz',
                language: 'en-US',
                model: 'medical_conversation'
            },
            {
                job_id: 'trans_456abc',
                status: 'processing'
            }
        );

        const transcriptionResult = document.getElementById('transcriptionResult');
        if (transcriptionResult) {
            transcriptionResult.style.display = 'block';
        }

        setTimeout(() => {
            logApiCall(
                'GET',
                '/api/v1/transcription/trans_456abc',
                'Retrieve transcription result with medical terminology',
                null,
                {
                    job_id: 'trans_456abc',
                    status: 'completed',
                    text: 'Patient presents with persistent cough for 2 weeks, fever of 101°F, and chest congestion. Physical examination reveals crackles in lower right lung. Diagnosed with acute bronchitis.',
                    confidence: 0.94
                }
            );

            updateStepStatus('step2', 'complete');
            currentStep = 3;
            updateProgress();

            // Step 3: HITL Gate 1
            updateStepStatus('step3', 'review');
            const hitl1 = document.getElementById('hitl1');
            if (hitl1) {
                hitl1.style.display = 'block';
                hitl1.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 2000);
    }, 1500);
}

function approveGate(gateNumber) {
    if (gateNumber === 1) {
        // HITL Gate 1: Approve transcription
        logApiCall(
            'POST',
            '/api/v1/hitl/transcription/approve',
            'Medical professional approves transcription accuracy',
            {
                job_id: 'trans_456abc',
                reviewer_id: 'usr_12345',
                approved: true
            },
            {
                status: 'approved',
                next_stage: 'ai_analysis'
            }
        );

        updateStepStatus('step3', 'complete');
        currentStep = 4;
        updateProgress();

        // Step 4: AI Analysis
        updateStepStatus('step4', 'processing');

        logApiCall(
            'POST',
            '/api/v1/ai/extract-codes',
            'Amazon SageMaker analyzes transcription and extracts medical codes',
            {
                transcription_id: 'trans_456abc',
                model: 'medical-coder-v2'
            },
            {
                diagnosis: 'Acute Bronchitis',
                icd10_code: 'J20.9',
                cpt_code: '99213',
                confidence_scores: { icd10: 0.92, cpt: 0.88 }
            }
        );

        const aiResult = document.getElementById('aiResult');
        if (aiResult) {
            aiResult.style.display = 'block';
        }

        setTimeout(() => {
            updateStepStatus('step4', 'complete');
            currentStep = 5;
            updateProgress();

            // Step 5: HITL Gate 2
            updateStepStatus('step5', 'review');
            const hitl2 = document.getElementById('hitl2');
            if (hitl2) {
                hitl2.style.display = 'block';
                hitl2.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 2000);

    } else if (gateNumber === 2) {
        // HITL Gate 2: Approve codes
        logApiCall(
            'POST',
            '/api/v1/hitl/codes/approve',
            'Medical coder validates CPT/ICD codes',
            {
                claim_id: 'CLM-2025-10-30-001',
                reviewer_id: 'coder_789',
                approved_codes: ['J20.9', '99213']
            },
            {
                status: 'approved',
                next_stage: 'edi_generation'
            }
        );

        updateStepStatus('step5', 'complete');
        currentStep = 6;
        updateProgress();

        // Step 6: EDI Generation
        updateStepStatus('step6', 'processing');

        logApiCall(
            'POST',
            '/api/v1/fhir/create-claim',
            'AWS HealthLake creates FHIR Claim resource',
            {
                patient_id: 'PAT-2025-001',
                diagnosis_code: 'J20.9',
                procedure_code: '99213'
            },
            {
                fhir_claim_id: 'Claim/clm-fhir-001',
                status: 'active'
            }
        );

        setTimeout(() => {
            logApiCall(
                'POST',
                '/api/v1/edi/generate-837',
                'Generate EDI 837 Professional claim format',
                {
                    fhir_claim_id: 'Claim/clm-fhir-001',
                    format: '837P'
                },
                {
                    edi_file_id: 'edi_837_20251030_001',
                    s3_path: 's3://arevclear-exports/2025/10/837_001.txt'
                }
            );

            const ediResult = document.getElementById('ediResult');
            if (ediResult) {
                ediResult.style.display = 'block';
            }

            updateStepStatus('step6', 'complete');
            currentStep = 7;
            updateProgress();

            // Step 7: HITL Gate 3
            updateStepStatus('step7', 'review');
            const hitl3 = document.getElementById('hitl3');
            if (hitl3) {
                hitl3.style.display = 'block';
                hitl3.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 1500);

    } else if (gateNumber === 3) {
        // HITL Gate 3: Final approval
        logApiCall(
            'POST',
            '/api/v1/hitl/billing/approve',
            'Billing specialist performs final compliance review',
            {
                claim_id: 'CLM-2025-10-30-001',
                reviewer_id: 'billing_456',
                approved_for_submission: true
            },
            {
                status: 'approved',
                next_stage: 'external_submission'
            }
        );

        updateStepStatus('step7', 'complete');
        currentStep = 8;
        updateProgress();

        // Step 8: Submission
        updateStepStatus('step8', 'processing');

        setTimeout(() => {
            logApiCall(
                'POST',
                '/api/v1/clearinghouse/submit',
                'Submit EDI 837 to external clearinghouse',
                {
                    edi_file_id: 'edi_837_20251030_001',
                    clearinghouse: 'Availity'
                },
                {
                    submission_id: 'SUB-2025-10-30-001',
                    status: 'submitted'
                }
            );

            const submissionResult = document.getElementById('submissionResult');
            if (submissionResult) {
                submissionResult.style.display = 'block';
                submissionResult.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }

            updateStepStatus('step8', 'complete');

            setTimeout(() => {
                alert(`🎉 Demo Complete!\n\nClaim successfully processed through all 3 HITL gates!\n\nTotal API calls made: ${apiCallCounter}\n\nCheck the API Call Tracker for detailed backend interactions.`);
            }, 500);
        }, 2000);
    }
}

// Authentication Functions
function openAuthModal(type) {
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.style.display = 'block';
        switchAuthTab(type);
    }
}

function closeAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function switchAuthTab(type) {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const tabs = document.querySelectorAll('.auth-tab');
    const title = document.getElementById('authModalTitle');
    const subtitle = document.getElementById('authModalSubtitle');

    if (tabs.length > 0) {
        tabs.forEach(tab => tab.classList.remove('active'));
    }

    if (type === 'login') {
        if (loginForm) loginForm.style.display = 'block';
        if (signupForm) signupForm.style.display = 'none';
        if (tabs[0]) tabs[0].classList.add('active');
        if (title) title.textContent = '🔐 Sign In';
        if (subtitle) subtitle.textContent = 'Access RevClear AI Medical Billing System';
    } else {
        if (loginForm) loginForm.style.display = 'none';
        if (signupForm) signupForm.style.display = 'block';
        if (tabs[1]) tabs[1].classList.add('active');
        if (title) title.textContent = '✍️ Create Account';
        if (subtitle) subtitle.textContent = 'Join RevClear AI Medical Billing System';
    }
}

// Form Handlers
document.addEventListener('DOMContentLoaded', function() {
    // Handle login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const email = document.getElementById('loginEmail')?.value || '';
            const password = document.getElementById('loginPassword')?.value || '';

            const user = {
                email: email,
                name: email.split('@')[0],
                loginTime: new Date().toISOString()
            };

            sessionStorage.setItem('user', JSON.stringify(user));
            closeAuthModal();
            showNotification(`✅ Successfully logged in as ${user.email}`, 'success');
            updateAuthUI(user);
        });
    }

    // Handle signup form
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const name = document.getElementById('signupName')?.value || '';
            const email = document.getElementById('signupEmail')?.value || '';
            const specialty = document.getElementById('signupSpecialty')?.value || '';

            const user = {
                email: email,
                name: name,
                specialty: specialty,
                signupTime: new Date().toISOString()
            };

            sessionStorage.setItem('user', JSON.stringify(user));
            closeAuthModal();
            showNotification(`🎉 Account created successfully! Welcome, ${name}!`, 'success');
            updateAuthUI(user);
        });
    }

    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('authModal');
        if (event.target === modal) {
            closeAuthModal();
        }
    });
});

// UI Update Functions
function updateAuthUI(user) {
    const authNav = document.getElementById('authNav');
    if (!authNav) return;

    authNav.innerHTML = `
        <span style="color: white; margin: 0 10px; display: inline-block;">
            👋 Welcome, <strong>${user.name}</strong>
        </span>
        <button onclick="handleLogout()" style="color: white; background: rgba(255,255,255,0.2); padding: 8px 20px; border-radius: 5px; border: none; cursor: pointer; transition: all 0.3s; font-size: 14px; font-weight: 600;" onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">
            🚪 Logout
        </button>
    `;
}

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        sessionStorage.removeItem('user');
        showNotification('👋 Logged out successfully', 'info');

        const authNav = document.getElementById('authNav');
        if (authNav) {
            authNav.innerHTML = `
                <button onclick="openAuthModal('login')" style="color: white; text-decoration: none; background: rgba(255,255,255,0.2); padding: 8px 20px; border-radius: 5px; margin: 0 5px; display: inline-block; transition: all 0.3s; border: none; cursor: pointer; font-size: 14px; font-weight: 600;" onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">🔐 Login</button>
                <button onclick="openAuthModal('signup')" style="color: white; text-decoration: none; background: rgba(255,255,255,0.2); padding: 8px 20px; border-radius: 5px; margin: 0 5px; display: inline-block; transition: all 0.3s; border: none; cursor: pointer; font-size: 14px; font-weight: 600;" onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">✍️ Sign Up</button>
            `;
        }
    }
}

// Notification System
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'success' ? 'linear-gradient(135deg, #34a853, #0f9d58)' : type === 'error' ? 'linear-gradient(135deg, #ea4335, #d33b2c)' : 'linear-gradient(135deg, #4285f4, #1a73e8)'};
        color: white;
        padding: 15px 30px;
        border-radius: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 9999;
        font-weight: 600;
        animation: slideDown 0.5s ease;
        max-width: 500px;
        word-wrap: break-word;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    // Add CSS animation
    if (!document.getElementById('notificationStyles')) {
        const style = document.createElement('style');
        style.id = 'notificationStyles';
        style.textContent = `
            @keyframes slideDown {
                from { transform: translate(-50%, -50px); opacity: 0; }
                to { transform: translate(-50%, 0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }

    // Remove notification after 4 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideDown 0.5s ease reverse';
            setTimeout(() => notification.remove(), 500);
        }
    }, 4000);
}

// Main Initialization - This MUST run when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('RevClear Demo: DOM Content Loaded');

    // Hide loading screen after 3 seconds
    setTimeout(() => {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            console.log('RevClear Demo: Hiding loading overlay');
            loadingOverlay.style.opacity = '0';
            setTimeout(() => {
                loadingOverlay.style.display = 'none';
                console.log('RevClear Demo: Loading overlay hidden');
            }, 500);
        } else {
            console.error('RevClear Demo: Loading overlay not found');
        }
    }, 3000);

    // Check for existing user session
    const userSession = sessionStorage.getItem('user');
    if (userSession) {
        try {
            const user = JSON.parse(userSession);
            updateAuthUI(user);
            console.log('RevClear Demo: User session restored');
        } catch (e) {
            sessionStorage.removeItem('user');
            console.log('RevClear Demo: Invalid user session removed');
        }
    }

    // Show welcome notification
    setTimeout(() => {
        showNotification('🎯 Welcome to RevClear! Start by exploring the tabs or begin the interactive demo.', 'info');
        console.log('RevClear Demo: Welcome notification shown');
    }, 3500);

    console.log('RevClear Demo: Initialization complete');
});

// Export for debugging
window.RevClearDemo = {
    startDemo,
    toggleApiTracker,
    showTab,
    openAuthModal,
    closeAuthModal,
    showNotification,
    getApiCallCount: () => apiCallCounter,
    getCurrentStep: () => currentStep
};
