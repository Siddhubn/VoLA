/** @type {import('next').NextConfig} */
const nextConfig = {
  // Externalize native modules to prevent webpack from trying to bundle them
  webpack: (config, { isServer }) => {
    // Externalize sharp and onnxruntime-node for server-side
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'sharp': 'commonjs sharp',
        'onnxruntime-node': 'commonjs onnxruntime-node',
        '@xenova/transformers': 'commonjs @xenova/transformers',
      });
    }

    // Ignore node-specific modules in client bundle
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };

    // Add rule to handle .node files (native binaries)
    config.module.rules.push({
      test: /\.node$/,
      loader: 'node-loader',
    });

    return config;
  },
  
  // Move serverComponentsExternalPackages to the correct location
  serverExternalPackages: ['sharp', '@xenova/transformers', 'onnxruntime-node'],
}

module.exports = nextConfig