/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // As rotas de setup (bootstrap do M1) aplicam as migrations SQL no Supabase —
  // os arquivos .sql precisam viajar junto no bundle serverless.
  outputFileTracingIncludes: {
    "/api/setup/provisionar": ["./supabase/migrations/*.sql"],
    "/api/setup/migrar": ["./supabase/migrations/*.sql"],
    "/api/setup/status": ["./supabase/migrations/*.sql"],
  },
};

export default nextConfig;
