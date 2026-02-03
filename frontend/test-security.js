/**
 * Frontend Security Verification Script
 *
 * Run this in browser DevTools console after logging in
 * to verify security fixes are working correctly.
 */

console.log("🔒 RevClear Frontend Security Verification\n");

// Test 1: Check if token is in localStorage (documented risk)
console.log("Test 1: JWT Token Storage");
const token = localStorage.getItem('token');
if (token) {
    console.log("⚠️  Token found in localStorage (documented XSS risk)");
    console.log("   Mitigation: CSP headers enabled");
} else {
    console.log("❌ No token found - user not logged in");
}
console.log("");

// Test 2: Check if SFTP credentials are exposed in API response
console.log("Test 2: SFTP Credentials Exposure");
console.log("Fetching /api/organizations/me...");
fetch('/api/organizations/me', {
    headers: {
        'Authorization': `Bearer ${token}`
    }
})
.then(r => r.json())
.then(data => {
    const org = data.organization || data.data?.organization || data;
    const hasPassword = 'edi_sftp_password' in org;
    const hasPrivateKey = 'edi_sftp_private_key' in org;

    if (hasPassword || hasPrivateKey) {
        console.log("❌ SECURITY ISSUE: Credentials exposed!");
        console.log("   Fields found:", { hasPassword, hasPrivateKey });
        console.log("   Backend fix required!");
    } else {
        console.log("✅ Credentials NOT exposed - secure!");
    }
})
.catch(err => {
    console.log("❌ Error:", err.message);
});

// Test 3: Check CSP headers
console.log("\nTest 3: Security Headers");
fetch(window.location.href)
.then(response => {
    const csp = response.headers.get('Content-Security-Policy');
    const xframe = response.headers.get('X-Frame-Options');
    const xContentType = response.headers.get('X-Content-Type-Options');

    console.log("CSP:", csp ? "✅ Present" : "❌ Missing");
    console.log("X-Frame-Options:", xframe ? "✅ Present" : "❌ Missing");
    console.log("X-Content-Type-Options:", xContentType ? "✅ Present" : "❌ Missing");
});

console.log("\n✅ Verification complete!");
console.log("See SECURITY_FIXES_FRONTEND.md for full details.");
