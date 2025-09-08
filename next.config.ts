import type { NextConfig } from "next";
import withBundleAnalyzer from '@next/bundle-analyzer'; // Import as ES module

const nextConfig: NextConfig = {
  output: 'export',
  /* config options here */
};

// Apply the bundle analyzer
const analyzedConfig = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})(nextConfig); // Apply it as a function call

module.exports = analyzedConfig;
