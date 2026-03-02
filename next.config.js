/** @type {import('next').NextConfig} */
const nextConfig = {
  // Turbopack configuration for Next.js 16
  turbopack: {
    resolveAlias: {
      'sharp': 'sharp',
      'onnxruntime-node': 'onnxruntime-node',
      '@xenova/transformers': '@xenova/transformers',
    },
  },
  
  // Move serverComponentsExternalPackages to the correct location
  serverExternalPackages: ['sharp', '@xenova/transformers', 'onnxruntime-node'],
}

module.exports = nextConfig