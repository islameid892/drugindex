// Environment variable validation and security
function validateEnv(key: string, value: string | undefined, isRequired: boolean = false): string {
  if (!value) {
    if (isRequired) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return "";
  }
  return value;
}

// Validate critical environment variables on startup
function validateEnvironment() {
  const requiredEnvs = [
    'VITE_APP_ID',
    'JWT_SECRET',
    'DATABASE_URL',
    'OAUTH_SERVER_URL',
    'BUILT_IN_FORGE_API_URL',
    'BUILT_IN_FORGE_API_KEY',
  ];

  const missingEnvs = requiredEnvs.filter(env => !process.env[env]);
  
  if (missingEnvs.length > 0) {
    console.warn(`Warning: Missing environment variables: ${missingEnvs.join(', ')}`);
  }

  // Validate JWT_SECRET strength
  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret && jwtSecret.length < 32) {
    console.warn('Warning: JWT_SECRET is too short. Use at least 32 characters for better security.');
  }

  // Validate DATABASE_URL format
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl && !dbUrl.startsWith('mysql://') && !dbUrl.startsWith('postgresql://')) {
    console.warn('Warning: DATABASE_URL format may be incorrect.');
  }
}

// Run validation on module load
if (process.env.NODE_ENV === 'production') {
  validateEnvironment();
}

export const ENV = {
  appId: validateEnv('VITE_APP_ID', process.env.VITE_APP_ID, true),
  cookieSecret: validateEnv('JWT_SECRET', process.env.JWT_SECRET, true),
  databaseUrl: validateEnv('DATABASE_URL', process.env.DATABASE_URL, true),
  oAuthServerUrl: validateEnv('OAUTH_SERVER_URL', process.env.OAUTH_SERVER_URL, true),
  ownerOpenId: validateEnv('OWNER_OPEN_ID', process.env.OWNER_OPEN_ID, false),
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: validateEnv('BUILT_IN_FORGE_API_URL', process.env.BUILT_IN_FORGE_API_URL, true),
  forgeApiKey: validateEnv('BUILT_IN_FORGE_API_KEY', process.env.BUILT_IN_FORGE_API_KEY, true),
};

// Prevent accidental exposure of sensitive data
Object.freeze(ENV);
