import type { NextConfig } from 'next';

const config: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        {key: 'X-Content-Type-Options', value: 'nosniff'},
        {key: 'Referrer-Policy', value: 'no-referrer'},
        {key: 'X-Frame-Options', value: 'DENY'},
        {key: 'Cross-Origin-Opener-Policy', value: 'same-origin'},
        {key: 'Cross-Origin-Resource-Policy', value: 'same-origin'},
        {key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()'},
        {key: 'Cache-Control', value: 'no-store'},
        {key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive'},
        {key: 'Content-Security-Policy', value:
          "default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none'; upgrade-insecure-requests"},
      ],
    }];
  },
};
export default config;
