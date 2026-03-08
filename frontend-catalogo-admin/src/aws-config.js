/**
 * AWS Amplify Configuration - HARDCODED VALUES
 */

const awsConfig = {
  Auth: {
    Cognito: {
      region: 'eu-west-1',
      userPoolId: 'eu-west-1_EUrLCzVDY',
      userPoolClientId: '4t90j2ijprchem651sn6imhlpc',
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