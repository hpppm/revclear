// Initialize Mermaid
        mermaid.initialize({
            startOnLoad: true,
            theme: 'base',
            themeVariables: {
                primaryColor: '#4285f4',
                primaryTextColor: '#fff',
                primaryBorderColor: '#1967d2',
                lineColor: '#5f6368',
                secondaryColor: '#34a853',
                tertiaryColor: '#fbbc04'
            }
        });

        // API Call Tracker
        let apiCallCounter = 0;

        function toggleApiTracker() {
            const tracker = document.getElementById('apiTracker');
            const btn = document.querySelector('.api-toggle-btn');
            tracker.classList.toggle('visible');
            btn.classList.toggle('active');
        }

        function logApiCall(method, endpoint, description, payload = null, responseData = null, status = 'success') {
            apiCallCounter++;
            document.getElementById('apiCallCount').textContent = apiCallCounter;

            const trackerBody = document.getElementById('apiTrackerBody');

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
                    if (!tracker.classList.contains('visible')) {
                        toggleApiTracker();
                    }
                }, 500);
            }
        }

        // Tab switching
        function showTab(tabName) {
            // Hide all tabs
            const tabs = document.querySelectorAll('.tab-content');
            tabs.forEach(tab => tab.classList.remove('active'));

            // Remove active from all tab buttons
            const tabButtons = document.querySelectorAll('.tab');
            tabButtons.forEach(btn => btn.classList.remove('active'));

            // Show selected tab
            document.getElementById(tabName).classList.add('active');
            event.target.classList.add('active');
        }

        // Demo workflow
        let currentStep = 0;
        const totalSteps = 8;

        function updateProgress() {
            const progress = (currentStep / totalSteps) * 100;
            const progressBar = document.getElementById('progressBar');
            progressBar.style.width = progress + '%';
            progressBar.textContent = Math.round(progress) + '%';
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
                    'Upload audio file to Amazon S3',
                    {
                        patient_id: 'PAT-2025-001',
                        file_name: 'consultation_20251030.mp3',
                        file_size: '2.4 MB',
                        session_type: 'initial_consultation'
                    },
                    {
                        upload_id: 'upl_789xyz',
                        s3_path: 's3://clinic-audio/2025/10/consultation_20251030.mp3',
                        status: 'uploaded'
                    }
                );

                updateStepStatus('step1', 'complete');
                currentStep = 2;
                updateProgress();

                // Step 2: Transcription - Call Speech-to-Text API
                updateStepStatus('step2', 'processing');

                logApiCall(
                    'POST',
                    '/api/v1/transcription/start',
                    'Trigger Amazon Transcribe',
                    {
                        upload_id: 'upl_789xyz',
                        language: 'en-US',
                        model: 'medical_conversation',
                        enable_word_confidence: true
                    },
                    {
                        job_id: 'trans_456abc',
                        status: 'processing'
                    }
                );

                document.getElementById('transcriptionResult').style.display = 'block';

                setTimeout(() => {
                    // Get transcription result
                    logApiCall(
                        'GET',
                        '/api/v1/transcription/trans_456abc',
                        'Retrieve transcription result',
                        null,
                        {
                            job_id: 'trans_456abc',
                            status: 'completed',
                            text: 'Patient presents with persistent cough...', 
                            confidence: 0.94,
                            word_count: 47
                        }
                    );

                    updateStepStatus('step2', 'complete');
                    currentStep = 3;
                    updateProgress();

                    // Step 3: HITL Gate 1
                    updateStepStatus('step3', 'review');
                    document.getElementById('hitl1').style.display = 'block';
                    document.getElementById('step3').scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 2000);
            }, 1500);
        }

        function approveGate(gateNumber) {
            if (gateNumber === 1) {
                // HITL Gate 1: Approve transcription
                logApiCall(
                    'POST',
                    '/api/v1/hitl/transcription/approve',
                    'Medical professional approves transcription',
                    {
                        job_id: 'trans_456abc',
                        reviewer_id: 'usr_12345',
                        approved: true,
                        corrections: null
                    },
                    {
                        status: 'approved',
                        next_stage: 'ai_analysis'
                    }
                );

                updateStepStatus('step3', 'complete');
                currentStep = 4;
                updateProgress();

                // Step 4: AI Analysis - Amazon SageMaker
                updateStepStatus('step4', 'processing');

                logApiCall(
                    'POST',
                    '/api/v1/ai/extract-codes',
                    'Amazon SageMaker analyzes transcription and extracts CPT/ICD codes',
                    {
                        transcription_id: 'trans_456abc',
                        model: 'medical-coder-v2',
                        patient_history_id: 'PAT-2025-001'
                    },
                    {
                        diagnosis: 'Acute Bronchitis',
                        icd10_code: 'J20.9',
                        cpt_code: '99213',
                        confidence_scores: {
                            icd10: 0.92,
                            cpt: 0.88
                        },
                        supporting_evidence: [
                            'persistent cough for 2 weeks',
                            'fever of 101°F',
                            'crackles in lower right lung'
                        ]
                    }
                );

                document.getElementById('aiResult').style.display = 'block';

                setTimeout(() => {
                    // Validate codes against database
                    logApiCall(
                        'GET',
                        '/api/v1/codes/validate?icd10=J20.9&cpt=99213',
                        'Validate codes against Amazon RDS PostgreSQL CPT/ICD database',
                        null,
                        {
                            icd10_valid: true,
                            cpt_valid: true,
                            compatible: true,
                            warnings: []
                        }
                    );

                    updateStepStatus('step4', 'complete');
                    currentStep = 5;
                    updateProgress();

                    // Step 5: HITL Gate 2
                    updateStepStatus('step5', 'review');
                    document.getElementById('hitl2').style.display = 'block';
                    document.getElementById('step5').scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 2000);

            } else if (gateNumber === 2) {
                // HITL Gate 2: Approve medical codes
                logApiCall(
                    'POST',
                    '/api/v1/hitl/codes/approve',
                    'Certified medical coder validates CPT/ICD codes',
                    {
                        claim_id: 'CLM-2025-10-30-001',
                        reviewer_id: 'coder_789',
                        icd10_approved: 'J20.9',
                        cpt_approved: '99213',
                        notes: 'Codes appropriate for documented diagnosis'
                    },
                    {
                        status: 'approved',
                        next_stage: 'edi_generation'
                    }
                );

                updateStepStatus('step5', 'complete');
                currentStep = 6;
                updateProgress();

                // Step 6: EDI Generation - Healthcare API
                updateStepStatus('step6', 'processing');

                logApiCall(
                    'POST',
                    '/api/v1/fhir/create-claim',
                    'AWS HealthLake creates FHIR Claim resource',
                    {
                        patient_id: 'PAT-2025-001',
                        provider_id: 'PRV-12345',
                        diagnosis_code: 'J20.9',
                        procedure_code: '99213',
                        service_date: '2025-10-30'
                    },
                    {
                        fhir_claim_id: 'Claim/clm-fhir-001',
                        resourceType: 'Claim',
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
                            format: '837P',
                            payer_id: 'PAYER-001'
                        },
                        {
                            edi_file_id: 'edi_837_20251030_001',
                            s3_path: 's3://clinic-claims/2025/10/837_001.txt',
                            segments_count: 42
                        }
                    );

                    document.getElementById('ediResult').style.display = 'block';

                    updateStepStatus('step6', 'complete');
                    currentStep = 7;
                    updateProgress();

                    // Step 7: HITL Gate 3
                    updateStepStatus('step7', 'review');
                    document.getElementById('hitl3').style.display = 'block';
                    document.getElementById('step7').scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 1500);

            } else if (gateNumber === 3) {
                // HITL Gate 3: Final billing approval
                logApiCall(
                    'POST',
                    '/api/v1/hitl/billing/approve',
                    'Billing specialist performs final compliance review',
                    {
                        claim_id: 'CLM-2025-10-30-001',
                        reviewer_id: 'billing_456',
                        compliance_check: 'passed',
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

                // Publish to Amazon SNS/SQS
                logApiCall(
                    'POST',
                    '/api/v1/pubsub/publish',
                    'Publish claim approved event to Amazon SNS/SQS',
                    {
                        topic: 'claims-approved',
                        message: {
                            claim_id: 'CLM-2025-10-30-001',
                            status: 'approved',
                            timestamp: new Date().toISOString()
                        }
                    },
                    {
                        message_id: 'msg_pub123',
                        published: true
                    }
                );

                setTimeout(() => {
                    // Submit to clearinghouse
                    logApiCall(
                        'POST',
                        '/api/v1/clearinghouse/submit',
                        'Submit EDI 837 to external clearinghouse',
                        {
                            edi_file_id: 'edi_837_20251030_001',
                            clearinghouse: 'Availity',
                            payer_id: 'PAYER-001'
                        },
                        {
                            submission_id: 'SUB-2025-10-30-001',
                            tracking_id: 'CLM-2025-10-30-001',
                            status: 'submitted',
                            estimated_response: '24-48 hours'
                        }
                    );

                    // Store in Amazon Redshift for analytics
                    logApiCall(
                        'POST',
                        '/api/v1/analytics/store',
                        'Store claim data in Amazon Redshift for analytics',
                        {
                            claim_id: 'CLM-2025-10-30-001',
                            dataset: 'claims_analytics',
                            table: 'processed_claims'
                        },
                        {
                            rows_inserted: 1,
                            job_id: 'redshift_job_789'
                        }
                    );

                    updateStepStatus('step8', 'complete');
                    document.getElementById('submissionResult').style.display = 'block';
                    document.getElementById('step8').scrollIntoView({ behavior: 'smooth', block: 'center' });

                    setTimeout(() => {
                        alert('🎉 Demo Complete!\n\nClaim successfully processed through all 3 HITL gates and submitted to clearinghouse.\n\nCheck the API Call Tracker to see all backend routes that were called!\n\nTotal API calls made: ' + apiCallCounter);
                    }, 500);
                }, 2000);
            }
        }

        function updateStepStatus(stepId, status) {
            const step = document.getElementById(stepId);
            const statusSpan = step.querySelector('.step-status');

            statusSpan.classList.remove('status-pending', 'status-processing', 'status-review', 'status-complete');

            if (status === 'processing') {
                statusSpan.classList.add('status-processing');
                statusSpan.textContent = statusSpan.textContent.replace(/Step \d+:/, 'Step ' + currentStep + ': ⏳');
            } else if (status === 'review') {
                statusSpan.classList.add('status-review');
                statusSpan.textContent = statusSpan.textContent.replace(/Step \d+:/, 'Step ' + currentStep + ': 👁️ REVIEW REQUIRED');
            } else if (status === 'complete') {
                statusSpan.classList.add('status-complete');
                statusSpan.textContent = statusSpan.textContent.replace(/Step \d+:.*/, 'Step ' + (currentStep - 1) + ': ✓ Complete');
            }
        }

        // Auth Modal Functions
        function openAuthModal(type) {
            const modal = document.getElementById('authModal');
            modal.style.display = 'block';
            switchAuthTab(type);
        }

        function closeAuthModal() {
            const modal = document.getElementById('authModal');
            modal.style.display = 'none';
        }

        function switchAuthTab(type) {
            const loginForm = document.getElementById('loginForm');
            const signupForm = document.getElementById('signupForm');
            const tabs = document.querySelectorAll('.auth-tab');
            const title = document.getElementById('authModalTitle');
            const subtitle = document.getElementById('authModalSubtitle');

            tabs.forEach(tab => tab.classList.remove('active'));

            if (type === 'login') {
                loginForm.style.display = 'block';
                signupForm.style.display = 'none';
                tabs[0].classList.add('active');
                title.textContent = '🔐 Sign In';
                subtitle.textContent = 'Access RevClear AI Medical Billing System';
            } else {
                loginForm.style.display = 'none';
                signupForm.style.display = 'block';
                tabs[1].classList.add('active');
                title.textContent = '✍️ Create Account';
                subtitle.textContent = 'Join RevClear AI Medical Billing System';
            }
        }

        // Close modal when clicking outside
        window.onclick = function(event) {
            const modal = document.getElementById('authModal');
            if (event.target === modal) {
                closeAuthModal();
            }
        }

        // Handle Login Form Submit
        document.getElementById('loginForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;

            // Simulate login (in real app, this would call backend API)
            const user = {
                email: email,
                name: email.split('@')[0],
                loginTime: new Date().toISOString()
            };

            // Store in session
            sessionStorage.setItem('user', JSON.stringify(user));

            // Close modal
            closeAuthModal();

            // Show welcome notification
            showNotification(`✅ Successfully logged in as ${user.email}`, 'success');

            // Update UI
            updateAuthUI(user);
        });

        // Handle Signup Form Submit
        document.getElementById('signupForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const name = document.getElementById('signupName').value;
            const email = document.getElementById('signupEmail').value;
            const specialty = document.getElementById('signupSpecialty').value;

            // Simulate signup (in real app, this would call backend API)
            const user = {
                email: email,
                name: name,
                specialty: specialty,
                signupTime: new Date().toISOString()
            };

            // Store in session
            sessionStorage.setItem('user', JSON.stringify(user));

            // Close modal
            closeAuthModal();

            // Show welcome notification
            showNotification(`🎉 Account created successfully! Welcome, ${name}!`, 'success');

            // Update UI
            updateAuthUI(user);
        });

        // Update auth nav when user logs in
        function updateAuthUI(user) {
            const authNav = document.getElementById('authNav');
            authNav.innerHTML = `
                <span style="color: white; margin: 0 10px; display: inline-block;">
                    👋 Welcome, <strong>${user.name}</strong>
                </span>
                <button onclick="handleLogout()" style="color: white; background: rgba(255,255,255,0.2); padding: 8px 20px; border-radius: 5px; border: none; cursor: pointer; transition: all 0.3s; font-size: 14px; font-weight: 600;" onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">
                    🚪 Logout
                </button>
            `;
        }

        // Handle logout
        function handleLogout() {
            if (confirm('Are you sure you want to logout?')) {
                sessionStorage.removeItem('user');
                showNotification('👋 Logged out successfully', 'info');
                
                // Restore auth buttons
                const authNav = document.getElementById('authNav');
                authNav.innerHTML = `
                    <button onclick="openAuthModal('login')" style="color: white; text-decoration: none; background: rgba(255,255,255,0.2); padding: 8px 20px; border-radius: 5px; margin: 0 5px; display: inline-block; transition: all 0.3s; border: none; cursor: pointer; font-size: 14px; font-weight: 600;" onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">🔐 Login</button>
                    <button onclick="openAuthModal('signup')" style="color: white; text-decoration: none; background: rgba(255,255,255,0.2); padding: 8px 20px; border-radius: 5px; margin: 0 5px; display: inline-block; transition: all 0.3s; border: none; cursor: pointer; font-size: 14px; font-weight: 600;" onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">✍️ Sign Up</button>
                `;
            }
        }

        // Show notification
        function showNotification(message, type = 'success') {
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: ${type === 'success' ? 'linear-gradient(135deg, #34a853, #0f9d58)' : '#5f6368'};
                color: white;
                padding: 15px 30px;
                border-radius: 10px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                z-index: 9999;
                font-weight: 600;
                animation: slideDown 0.5s ease;
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
                notification.style.animation = 'slideDown 0.5s ease reverse';
                setTimeout(() => notification.remove(), 500);
            }, 4000);
        }

        document.addEventListener('DOMContentLoaded', function() {
            // Hide loading screen after 3 seconds
            setTimeout(() => {
                const loadingOverlay = document.getElementById('loadingOverlay');
                if (loadingOverlay) {
                    loadingOverlay.style.opacity = '0';
                    setTimeout(() => {
                        loadingOverlay.style.display = 'none';
                    }, 500);
                }
            }, 3000);

            // Check for existing user session
            const userSession = sessionStorage.getItem('user');
            if (userSession) {
                try {
                    const user = JSON.parse(userSession);
                    updateAuthUI(user);
                } catch (e) {
                    sessionStorage.removeItem('user');
                }
            }

            // Show welcome notification
            setTimeout(() => {
                showNotification('🎯 Welcome to RevClear! Start by exploring the tabs or begin the interactive demo.', 'info');
            }, 3500);
        });
