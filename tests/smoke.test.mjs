import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const indexHtml = path.join(root, "web-app", "index.html");

const requiredIds = [
  "apiNavItem",
  "entryNavItem",
  "setupSection",
  "resumeResult",
  "matchResult",
  "jobResult",
  "optimizeResult",
  "interviewArea",
  "trackerSection",
];

const requiredAssets = [
  "assets/state.js",
  "assets/api.js",
  "assets/view.js",
  "assets/actions.js",
];

test("web-app index exists and is a Chinese single-page app", () => {
  assert.equal(existsSync(indexHtml), true, "web-app/index.html should exist");
  const html = readFileSync(indexHtml, "utf8");
  assert.match(html, /<html lang="zh-CN">/);
  assert.match(html, /AI/);
  assert.match(html, /&#27714;&#32844;&#20840;&#27969;&#31243;&#21161;&#25163;/);
});

test("main workflow sections are present", () => {
  const html = readFileSync(indexHtml, "utf8");
  for (const id of requiredIds) {
    assert.match(html, new RegExp(`id="${id}"`), `missing #${id}`);
  }
});

test("all local JavaScript assets exist", () => {
  for (const asset of requiredAssets) {
    assert.equal(
      existsSync(path.join(root, "web-app", asset)),
      true,
      `missing web-app/${asset}`,
    );
  }
});

test("no obvious TODO/FIXME marker remains in web app", () => {
  const html = readFileSync(indexHtml, "utf8");
  assert.doesNotMatch(html, /TODO|FIXME/i);
});
