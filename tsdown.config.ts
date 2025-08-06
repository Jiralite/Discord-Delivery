import { defineConfig } from "tsdown";

export default defineConfig({
	entry: ["source/index.ts"],
	platform: "node",
	target: "esnext",
	skipNodeModulesBundle: true,
	sourcemap: true,
	outDir: "distribution",
});
