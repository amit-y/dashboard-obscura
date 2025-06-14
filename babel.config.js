module.exports = {
  presets: [
    ["@babel/preset-env", { targets: { node: "current" } }],
    ["@babel/preset-react", { runtime: "automatic" }] // Good to have for Next.js projects, even for API routes
  ],
  plugins: [
    "@babel/plugin-transform-runtime"
  ]
};
