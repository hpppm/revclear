# RevClear Frontend

React application with Vite for healthcare claims processing

## Technology Stack

- React 18
- Vite (build tool)
- React Router (navigation)
- Amazon Cognito (authentication)
- Axios (API requests)

## Setup

1. Install dependencies
   ```bash
   npm install
   ```

2. Configure environment
   - Edit src/config.js
   - Add Cognito domain
   - Add API Gateway URL
   - Add CloudFront URL

3. Run development server
   ```bash
   npm run dev
   ```

4. Build for production
   ```bash
   npm run build
   ```

## Deployment to S3 + CloudFront

1. Build application
   ```bash
   npm run build
   ```

2. Create S3 bucket
   ```bash
   aws s3 mb s3://revclear-frontend
   aws s3 website s3://revclear-frontend --index-document index.html
   ```

3. Upload files
   ```bash
   aws s3 sync dist/ s3://revclear-frontend/
   ```

4. Create CloudFront distribution pointing to S3 bucket

5. Update Cognito redirect URLs with CloudFront domain

## Authentication Flow

1. User visits CloudFront URL
2. Redirects to Cognito Hosted UI
3. User signs in with email/password
4. Cognito redirects back with JWT token
5. Frontend stores token
6. All API requests include JWT in Authorization header

## Required Configuration

Update src/config.js with:
- Cognito User Pool ID: us-east-1_NZCFuSv1l
- Cognito App Client ID: 5g5qvrvd04h9suejmlie2rjncd
- Cognito Identity Pool ID: us-east-1:1d234050-e204-4a70-b4af-5930556b6957
- Cognito Hosted UI domain
- API Gateway base URL
- CloudFront distribution URL

## Features to Implement

- Patient list and management
- Encounter creation
- Claims submission
- AI pipeline UI:
  - Audio upload and transcription
  - SOAP summary display
  - Code suggestions with human review
  - EDI preview and submission
- Risk scoring dashboard
