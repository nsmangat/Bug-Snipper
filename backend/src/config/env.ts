function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 3000),
  supabaseUrl: requireEnv('SUPABASE_URL'),
  supabaseSecretKey: requireEnv('SUPABASE_SECRET_KEY'),
};
