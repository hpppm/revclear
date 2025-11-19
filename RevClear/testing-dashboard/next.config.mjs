const API_ORIGIN = (process.env.REVCLEAR_API_ORIGIN || "http://localhost:3005").replace(
  /\/$/,
  ""
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_ORIGIN}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
