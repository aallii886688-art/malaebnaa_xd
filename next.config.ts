import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/facilities', destination: '/player/facilities', permanent: false },
      { source: '/academies', destination: '/player/academies', permanent: false },
      { source: '/tournaments', destination: '/player/tournaments', permanent: false },
      { source: '/facilities/:path*', destination: '/player/facilities/:path*', permanent: false },
      { source: '/academies/:path*', destination: '/player/academies/:path*', permanent: false },
      { source: '/tournaments/:path*', destination: '/player/tournaments/:path*', permanent: false },
    ]
  },
};

export default nextConfig;
