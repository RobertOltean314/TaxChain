const NodePolyfillPlugin = require("node-polyfill-webpack-plugin");

module.exports = {
  plugins: [
    new NodePolyfillPlugin({
      excludeAliases: ["console"],
    }),
  ],
  resolve: {
    fallback: {
      crypto: require.resolve("crypto-browserify"),
      stream: require.resolve("stream-browserify"),
      util: require.resolve("util/"),
      buffer: require.resolve("buffer/"),
      process: require.resolve("process/browser"),
    },
  },
};
