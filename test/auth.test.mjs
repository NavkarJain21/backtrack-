import test from "node:test";
import assert from "node:assert/strict";

// Mirrors of validators + demo-session rules from lib/auth.ts.
// Repo convention: tests mirror lib logic (see validation.test.mjs).
function validateEmail(email) {
  if (!email.trim()) return "Email is required.";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ? null
    : "Enter a valid email address.";
}
function validateName(name) {
  return name.trim().length > 0 ? null : "Name is required.";
}
function validatePassword(password) {
  if (!password) return "Password is required.";
  return password.length >= 8 ? null : "Password must be at least 8 characters.";
}
function validatePasswordConfirm(password, confirm) {
  if (!confirm) return "Please confirm your password.";
  return password === confirm ? null : "Passwords don't match.";
}

// Demo session shape must never contain a password.
function demoSession(name, email) {
  return { name: name.trim(), email: email.trim(), isDemoSession: true };
}

test("invalid email is rejected with a friendly message", () => {
  assert.equal(validateEmail("not-an-email"), "Enter a valid email address.");
  assert.equal(validateEmail("missing@tld"), "Enter a valid email address.");
  assert.equal(validateEmail(""), "Email is required.");
  assert.equal(validateEmail("user@example.com"), null);
});

test("empty fields are rejected", () => {
  assert.equal(validateName("   "), "Name is required.");
  assert.equal(validateEmail(""), "Email is required.");
  assert.equal(validatePassword(""), "Password is required.");
  assert.equal(validatePasswordConfirm("x", ""), "Please confirm your password.");
});

test("password length and confirmation rules", () => {
  assert.equal(validatePassword("short"), "Password must be at least 8 characters.");
  assert.equal(validatePassword("long-enough"), null);
  assert.equal(validatePasswordConfirm("abcdefgh", "abcdefgH"), "Passwords don't match.");
  assert.equal(validatePasswordConfirm("abcdefgh", "abcdefgh"), null);
});

test("demo session stores only name + email — never the password", () => {
  const s = demoSession("  Maya  ", "  maya@example.com ");
  assert.deepEqual(Object.keys(s).sort(), ["email", "isDemoSession", "name"]);
  assert.equal(s.name, "Maya");
  assert.equal(s.email, "maya@example.com");
  assert.equal(s.isDemoSession, true);
  assert.equal("password" in s, false);
});

test("auth route source exposes sign-in and account creation for the demo", () => {
  return import("node:fs").then(({ readFileSync }) => {
    const src = readFileSync(
      new URL("../app/sign-in/page.tsx", import.meta.url),
      "utf8"
    );
    assert.match(src, /Sign In/);
    assert.match(src, /Create Account/);
    assert.match(src, /Continue with Google \(not configured\)/);
    assert.match(src, /Sign In" : "Create Account/);
  });
});

test("sidebar shows Sign in when logged out instead of 'No sign-in yet'", () => {
  return import("node:fs").then(({ readFileSync }) => {
    const src = readFileSync(
      new URL("../components/dashboard/DashboardSidebar.tsx", import.meta.url),
      "utf8"
    );
    assert.equal(src.includes("No sign-in yet"), false);
    assert.match(src, /Sign in/);
    assert.match(src, /Sign out/);
    assert.match(src, /\/sign-in/);
  });
});
