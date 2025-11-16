module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      "@babel/plugin-transform-flow-strip-types",
      "react-native-reanimated/plugin",
      [
        "module-resolver",
        {
          root: ["./src"],
          extensions: [".ios.js", ".android.js", ".js", ".ts", ".tsx", ".json"],
          alias: {
            "@": "./src",
            "@/components": "./src/components",
            "@/screens": "./src/screens",
            "@/lib": "./src/lib",
            "@/hooks": "./src/hooks",
            "@/store": "./src/store",
            "@/types": "./src/types",
          },
        },
      ],
    ],
  };
};
