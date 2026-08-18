module.exports = {
  testEnvironment: "node",
  rootDir: ".",
  roots: ["<rootDir>/packages/aerolopa/seatmap/src"],
  moduleFileExtensions: ["ts", "js", "json"],
  testMatch: ["**/*.spec.ts"],
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: "tsconfig.json" }],
  },
};
