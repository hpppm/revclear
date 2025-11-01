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
                    'Upload audio file to Cloud Storage',
                    {
                        patient_id: 'PAT-2025-001',
                        file_name: 'consultation_20251030.mp3',
                        file_size: '2.4 MB',
                        session_type: 'initial_consultation'
                    },
                    {
                        upload_id: 'upl_789xyz',
                        gcs_path: 'gs://clinic-audio/2025/10/consultation_20251030.mp3',
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
                    'Trigger Google Speech-to-Text API',
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
                    // Removed auto-scroll - let user review at their own pace
                }, 3000);
            }, 2500);
        }

        function approveGate(gateNumber) {
            if (gateNumber === 1) {
                // Show learning feedback
                const hitl1 = document.getElementById('hitl1');
                const button = event.target;
                button.innerHTML = '✓ Approved! AI Learning...';
                button.style.background = 'var(--success)';
                button.disabled = true;
                
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
                
                setTimeout(() => {
                    // Send feedback to ML training pipeline
                    logApiCall(
                        'POST',
                        '/api/v1/ml/feedback/transcription',
                        'Send validation feedback to Vertex AI training pipeline',
                        {
                            job_id: 'trans_456abc',
                            audio_file: 'gs://clinic-audio/2025/10/consultation_20251030.mp3',
                            transcription: 'Patient presents with persistent cough for two weeks...',
                            validation: {
                                approved: true,
                                accuracy_score: 0.98,
                                corrections_made: 0,
                                reviewer_confidence: 'high'
                            },
                            training_label: 'positive'
                        },
                        {
                            feedback_id: 'fb_trans_001',
                            stored_in_bigquery: 'ml_training.transcription_feedback',
                            model_retrain_triggered: false,
                            training_queue_position: 47
                        }
                    );
                    
                    hitl1.innerHTML = '<div style="background: var(--success-light); padding: 1rem; border-radius: 0.5rem; border-left: 4px solid var(--success);"><strong style="color: var(--success);">✓ Approved</strong><p style="color: var(--slate-600); margin: 0.5rem 0 0 0; font-size: 0.9rem;">🧠 System learning from your approval to improve future transcriptions</p></div>';
                }, 500);

                updateStepStatus('step3', 'complete');
                currentStep = 4;
                updateProgress();

                // Step 4: AI Analysis - Call Vertex AI
                updateStepStatus('step4', 'processing');

                logApiCall(
                    'POST',
                    '/api/v1/ai/extract-codes',
                    'Vertex AI analyzes transcription and extracts CPT/ICD codes',
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
                        'Validate codes against Cloud SQL CPT/ICD database',
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
                    // Removed auto-scroll - let user review at their own pace
                }, 3000);

            } else if (gateNumber === 2) {
                // Show learning feedback
                const hitl2 = document.getElementById('hitl2');
                const button = event.target;
                button.innerHTML = '✓ Approved! AI Learning...';
                button.style.background = 'var(--success)';
                button.disabled = true;
                
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
                
                setTimeout(() => {
                    // Send code validation feedback to ML training
                    logApiCall(
                        'POST',
                        '/api/v1/ml/feedback/coding',
                        'Send code validation feedback to Vertex AI for model improvement',
                        {
                            claim_id: 'CLM-2025-10-30-001',
                            transcription_text: 'Patient presents with persistent cough...',
                            ai_suggested_codes: {
                                icd10: 'J20.9',
                                cpt: '99213',
                                confidence_icd10: 0.92,
                                confidence_cpt: 0.88
                            },
                            coder_approved_codes: {
                                icd10: 'J20.9',
                                cpt: '99213',
                                modifications: []
                            },
                            validation: {
                                icd10_match: true,
                                cpt_match: true,
                                training_label: 'correct',
                                coder_confidence: 'high'
                            }
                        },
                        {
                            feedback_id: 'fb_code_001',
                            stored_in_bigquery: 'ml_training.coding_feedback',
                            model_accuracy_updated: true,
                            current_model_accuracy: 0.89,
                            training_queue_position: 23
                        }
                    );
                    
                    hitl2.innerHTML = '<div style="background: var(--success-light); padding: 1rem; border-radius: 0.5rem; border-left: 4px solid var(--success);"><strong style="color: var(--success);">✓ Codes Validated</strong><p style="color: var(--slate-600); margin: 0.5rem 0 0 0; font-size: 0.9rem;">🧠 AI model updated with your validation to improve future code suggestions</p></div>';
                }, 500);

                updateStepStatus('step5', 'complete');
                currentStep = 6;
                updateProgress();

                // Step 6: EDI Generation - Healthcare API
                updateStepStatus('step6', 'processing');

                logApiCall(
                    'POST',
                    '/api/v1/fhir/create-claim',
                    'Healthcare API creates FHIR Claim resource',
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
                            gcs_path: 'gs://clinic-claims/2025/10/837_001.txt',
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
                    // Removed auto-scroll - let user review at their own pace
                }, 2500);

            } else if (gateNumber === 3) {
                // Show learning feedback
                const hitl3 = document.getElementById('hitl3');
                const button = event.target;
                button.innerHTML = '✓ Approved! AI Learning...';
                button.style.background = 'var(--success)';
                button.disabled = true;
                
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
                
                setTimeout(() => {
                    // Send approval analytics to improve submission success prediction
                    logApiCall(
                        'POST',
                        '/api/v1/ml/feedback/submission-analytics',
                        'Update ML model with approval patterns for denial prediction',
                        {
                            claim_id: 'CLM-2025-10-30-001',
                            claim_metadata: {
                                diagnosis: 'J20.9',
                                procedure: '99213',
                                payer_id: 'PAYER-001',
                                patient_age: 45,
                                service_date: '2025-10-30'
                            },
                            approval_metrics: {
                                transcription_accuracy: 0.98,
                                coding_confidence: 0.92,
                                compliance_score: 1.0,
                                time_to_approve: '4.5 minutes'
                            },
                            training_features: {
                                expected_approval_rate: 0.95,
                                historical_payer_approval: 0.93,
                                similar_claims_approved: 127
                            }
                        },
                        {
                            feedback_id: 'fb_approval_001',
                            stored_in_bigquery: 'ml_training.approval_analytics',
                            denial_prediction_model_updated: true,
                            predicted_approval_probability: 0.96
                        }
                    );
                    
                    hitl3.innerHTML = '<div style="background: var(--success-light); padding: 1rem; border-radius: 0.5rem; border-left: 4px solid var(--success);"><strong style="color: var(--success);">✓ Ready for Submission</strong><p style="color: var(--slate-600); margin: 0.5rem 0 0 0; font-size: 0.9rem;">🧠 Final approval recorded. System optimizing submission process based on historical success rates</p></div>';
                }, 500);

                updateStepStatus('step7', 'complete');
                currentStep = 8;
                updateProgress();

                // Step 8: Submission
                updateStepStatus('step8', 'processing');

                // Publish to Pub/Sub
                logApiCall(
                    'POST',
                    '/api/v1/pubsub/publish',
                    'Publish claim approved event to Pub/Sub topic',
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

                    // Store in BigQuery for analytics
                    logApiCall(
                        'POST',
                        '/api/v1/analytics/store',
                        'Store claim data in BigQuery for analytics',
                        {
                            claim_id: 'CLM-2025-10-30-001',
                            dataset: 'claims_analytics',
                            table: 'processed_claims'
                        },
                        {
                            rows_inserted: 1,
                            job_id: 'bq_job_789'
                        }
                    );

                    updateStepStatus('step8', 'complete');
                    document.getElementById('submissionResult').style.display = 'block';
                    // Removed auto-scroll - let user review results at their own pace

                    setTimeout(() => {
                        document.getElementById('metricsCard').style.display = 'block';
                        // Removed auto-scroll for metrics card
                    }, 1500);

                    setTimeout(() => {
                        alert('🎉 Demo Complete!\n\nClaim successfully processed through all 3 HITL gates and submitted to clearinghouse.\n\nCheck the API Call Tracker to see all backend routes that were called!\n\nTotal API calls made: ' + apiCallCounter);
                    }, 3000);
                }, 3000);
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
