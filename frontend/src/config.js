/**
 * Frontend Configuration
 * 
 * Deployment: S3 + CloudFront
 * Framework: React (Vite)
 * Authentication: Cognito Hosted UI
 */

export const config = {
  // Cognito Configuration
  cognito: {
    region: 'us-east-1',
    userPoolId: 'us-east-1_NZCFuSv1l',
    userPoolWebClientId: '5g5qvrvd04h9suejmlie2rjncd',
    identityPoolId: 'us-east-1:1d234050-e204-4a70-b4af-5930556b6957',
    hostedUiDomain: 'YOUR_COGNITO_DOMAIN.auth.us-east-1.amazoncognito.com',
    redirectSignIn: 'https://YOUR_CLOUDFRONT_DOMAIN/callback',
    redirectSignOut: 'https://YOUR_CLOUDFRONT_DOMAIN/login'
  },
  
  // API Gateway
  api: {
    baseUrl: 'https://YOUR_API_GATEWAY_ID.execute-api.us-east-1.amazonaws.com/prod'
  },
  
  // S3 Configuration
  s3: {
    bucket: 'arevclear',
    region: 'us-east-1'
  }
};

// TODO: Replace YOUR_COGNITO_DOMAIN with actual Cognito domain
// TODO: Replace YOUR_CLOUDFRONT_DOMAIN with actual CloudFront distribution
// TODO: Replace YOUR_API_GATEWAY_ID with actual API Gateway ID
