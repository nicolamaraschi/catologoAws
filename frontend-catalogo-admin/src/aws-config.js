/**
 * AWS Amplify Configuration
 * Configure Cognito and API Gateway endpoints
 *
 * Environment Variables (set in .env or Amplify Console):
 * - REACT_APP_COGNITO_REGION - AWS Region (e.g., eu-west-1)
 * - REACT_APP_COGNITO_USER_POOL_ID - Cognito User Pool ID
 * - REACT_APP_COGNITO_CLIENT_ID - Cognito Client ID
 * - REACT_APP_API_BASE_URL - API Gateway base URL
 */

const awsConfig = {
  Auth: {
    Cognito: {
      region: process.env.REACT_APP_COGNITO_REGION || 'eu-west-1',
      userPoolId: process.env.REACT_APP_COGNITO_USER_POOL_ID || '',
      userPoolClientId: process.env.REACT_APP_COGNITO_CLIENT_ID || '',
      loginWith: {
        email: true,
        username: false,
      },
      signUpVerificationMethod: 'code',
      passwordFormat: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireNumbers: true,
        requireSpecialCharacters: true,
      },
    },
  },
};

export default awsConfig;
