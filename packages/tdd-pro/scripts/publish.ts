#!/usr/bin/env bun

// @ts-expect-error Bun global types
declare const Bun: any;

// @ts-ignore
import { $ } from "bun";
import pkg from "../package.json";

const dry = process.argv.includes("--dry");
const version = process.env.VERSION || pkg.version;
const npmToken = process.env.NPM_TOKEN || process.env.NODE_AUTH_TOKEN;

console.log(`publishing ${version}`);

await $`rm -rf dist`;
await $`mkdir -p dist/bin`;

// Build the MCP server binary
await $`bun build --compile --outfile=dist/bin/tdd-pro-mcp ../mcp-stdio-server.ts`;

// Copy package.json and update version
const packageJson = {
  ...pkg,
  version,
  bin: { "tdd-pro-mcp": "./bin/tdd-pro-mcp" },
  files: ["bin/"]
};
await Bun.file("dist/package.json").write(JSON.stringify(packageJson, null, 2));

// Copy postinstall.js if needed (not required for a single binary CLI)

if (!dry) {
  // Write .npmrc for auth
  if (npmToken) {
    await Bun.file("dist/.npmrc").write(`//registry.npmjs.org/:_authToken=${npmToken}\n`);
  }
  // Publish
  await $`cd dist && npm publish --access public`;
}