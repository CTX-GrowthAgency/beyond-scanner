/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  poweredByHeader: false,
  compress: true,
  
  // Optimize for production
  // experimental: {
  //   optimizeCss: true,
  //   optimizePackageImports: ['html5-qrcode']
  // },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          }
        ]
      }
    ]
  },
  
  // Prevents html5-qrcode from being bundled server-side
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), "html5-qrcode"];
    }
    return config;
  },
};

module.exports = nextConfig;
