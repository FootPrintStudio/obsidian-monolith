import assert from "node:assert/strict";
import test from "node:test";

const {
	parseRemoteHostAllowlist,
	hostnameFromUrl,
	isRemoteHostAllowed,
} = await import("../.test-build/remoteAllowlist.mjs");

test("empty allowlist allows any host", () => {
	assert.equal(parseRemoteHostAllowlist("").length, 0);
	assert.equal(isRemoteHostAllowed("https://cdn.example.com/a.png", ""), true);
	assert.equal(isRemoteHostAllowed("https://evil.test/x", "  \n  "), true);
});

test("exact host match", () => {
	assert.equal(isRemoteHostAllowed("https://cdn.example.com/a.png", "cdn.example.com"), true);
	assert.equal(isRemoteHostAllowed("https://other.example.com/a.png", "cdn.example.com"), false);
});

test("wildcard subdomain match", () => {
	const list = "*.github.io, cdn.example.com";
	assert.equal(isRemoteHostAllowed("https://user.github.io/pic.jpg", list), true);
	assert.equal(isRemoteHostAllowed("https://github.io/pic.jpg", list), true);
	assert.equal(isRemoteHostAllowed("https://cdn.example.com/x", list), true);
	assert.equal(isRemoteHostAllowed("https://evil.com/x", list), false);
});

test("hostnameFromUrl", () => {
	assert.equal(hostnameFromUrl("https://Example.COM:8443/path"), "example.com");
	assert.equal(hostnameFromUrl("not a url"), null);
});
