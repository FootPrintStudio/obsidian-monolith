import assert from "node:assert/strict";
import test from "node:test";

const { isPrivateOrLoopbackBaseUrl } = await import("../.test-build/xiewerBaseUrl.mjs");

test("accepts loopback defaults", () => {
	assert.equal(isPrivateOrLoopbackBaseUrl("http://127.0.0.1:47821"), true);
	assert.equal(isPrivateOrLoopbackBaseUrl("http://localhost:47821"), true);
	assert.equal(isPrivateOrLoopbackBaseUrl("http://[::1]:47821"), true);
});

test("accepts private LAN ranges", () => {
	assert.equal(isPrivateOrLoopbackBaseUrl("http://192.168.1.10:47821"), true);
	assert.equal(isPrivateOrLoopbackBaseUrl("http://10.0.0.2:47821"), true);
	assert.equal(isPrivateOrLoopbackBaseUrl("http://172.16.0.1:47821"), true);
});

test("rejects public hosts", () => {
	assert.equal(isPrivateOrLoopbackBaseUrl("https://example.com"), false);
	assert.equal(isPrivateOrLoopbackBaseUrl("http://8.8.8.8:47821"), false);
});

test("accepts loopback file URLs (path ignored)", () => {
	assert.equal(isPrivateOrLoopbackBaseUrl("http://127.0.0.1:47821/file/12"), true);
});

test("rejects garbage", () => {
	assert.equal(isPrivateOrLoopbackBaseUrl("not-a-url"), false);
	assert.equal(isPrivateOrLoopbackBaseUrl(""), false);
});
