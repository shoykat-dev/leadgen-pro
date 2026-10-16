import assert from "node:assert/strict";
import {
  validatePhone,
  validateEmail,
  classifyWebsite,
  calculateLeadScore,
  assessDataQuality,
  deduplicateLeads,
} from "../src/lib/data-integrity.ts";
import { splitRectangleIntoQuadrants, calculateScanEstimate } from "../src/lib/area-scan.ts";
import { getAuthErrorMessage } from "../src/lib/auth-errors.ts";
import { ALL_BUSINESS_SERVICES } from "../src/lib/directory-data.ts";

console.log("▶ Running LeadGen Pro Core Data Integrity & System Unit Tests...\n");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

// 1. Phone validation tests
test("Phone: Valid Bangladesh Mobile (01711998877) -> Valid E.164 and canWhatsApp true", () => {
  const res = validatePhone("01711998877", "BD");
  assert.equal(res.phoneStatus, "Valid");
  assert.equal(res.canWhatsApp, true);
  assert.equal(res.phoneE164, "+8801711998877");
});

test("Phone: Junk pattern rejection (sequential 123456) -> Phone format unverified", () => {
  const res = validatePhone("+880 1712-345678", "BD");
  assert.equal(res.phoneStatus, "Phone format unverified");
  assert.equal(res.canWhatsApp, false);
});

test("Phone: Junk pattern rejection (trailing 000000) -> Phone format unverified", () => {
  const res = validatePhone("+880 1713-000000", "BD");
  assert.equal(res.phoneStatus, "Phone format unverified");
  assert.equal(res.canWhatsApp, false);
});

test("Phone: Empty or N/A -> Missing status", () => {
  const res = validatePhone("N/A", "BD");
  assert.equal(res.phoneStatus, "Missing");
  assert.equal(res.phone, null);
  assert.equal(res.canWhatsApp, false);
});

// 2. Email validation tests
test("Email: Valid corporate email -> Found on website", () => {
  const res = validateEmail("contact@restaurant.com", "https://restaurant.com");
  assert.equal(res.emailStatus, "Found on website");
  assert.equal(res.email, "contact@restaurant.com");
});

test("Email: Different domain from website -> Different domain", () => {
  const res = validateEmail("business@gmail.com", "https://mybusiness.com");
  assert.equal(res.emailStatus, "Different domain");
  assert.equal(res.email, "business@gmail.com");
});

test("Email: Junk domain rejection (example.com) -> Invalid format", () => {
  const res = validateEmail("user@example.com");
  assert.equal(res.emailStatus, "Invalid format");
  assert.equal(res.email, null);
});

test("Email: Image false positive rejection (logo.png@2x) -> Invalid format", () => {
  const res = validateEmail("logo.png@2x");
  assert.equal(res.emailStatus, "Invalid format");
  assert.equal(res.email, null);
});

test("Email: No-reply prefix rejection -> Invalid format", () => {
  const res = validateEmail("noreply@company.com");
  assert.equal(res.emailStatus, "Invalid format");
  assert.equal(res.email, null);
});

// 3. Website status tests
test("Website: Valid URL -> Has Website", () => {
  const res = classifyWebsite("https://whitecanary.com");
  assert.equal(res.websiteStatus, "Has Website");
  assert.equal(res.website, "https://whitecanary.com");
});

test("Website: Facebook page -> Social Only", () => {
  const res = classifyWebsite("https://facebook.com/mycafebangladesh");
  assert.equal(res.websiteStatus, "Social Only");
});

test("Website: Instagram page -> Social Only", () => {
  const res = classifyWebsite("https://instagram.com/dhakagym");
  assert.equal(res.websiteStatus, "Social Only");
});

test("Website: Empty or null -> No Website", () => {
  const res = classifyWebsite(null);
  assert.equal(res.websiteStatus, "No Website");
  assert.equal(res.website, null);
});

// 4. Lead Score Formula (Section 8)
test("Lead Score: No Website (+40) + Valid Phone (+15) + Valid Email (+10) + Rating >= 4 (+10) + Reviews >= 50 (+10) = 85 (High)", () => {
  const res = calculateLeadScore({
    websiteStatus: "No Website",
    phoneStatus: "Valid",
    email: "test@domain.com",
    emailStatus: "Found on website",
    rating: 4.5,
    userRatingCount: 65,
  });
  assert.equal(res.score, 85);
  assert.equal(res.tier, "High");
});

test("Lead Score: Has Website (0) + Unverified Phone (0) + No Email (0) = 0 (Low)", () => {
  const res = calculateLeadScore({
    websiteStatus: "Has Website",
    phoneStatus: "Phone format unverified",
    email: null,
    rating: 3.5,
    userRatingCount: 5,
  });
  assert.equal(res.score, 0);
  assert.equal(res.tier, "Low");
});

// 5. Contactable Count Logic (Section 7: never add phones and emails together)
test("Contactable Count: Lead with both phone and email counts as 1 unique contactable business", () => {
  const sampleLeads = [
    { id: "1", phone: "01711111111", phoneStatus: "Valid", email: "a@b.com", emailStatus: "Found on website" },
    { id: "2", phone: "01822222222", phoneStatus: "Valid", email: null, emailStatus: "Missing" },
    { id: "3", phone: null, phoneStatus: "Missing", email: "c@d.com", emailStatus: "Found on website" },
    { id: "4", phone: null, phoneStatus: "Missing", email: null, emailStatus: "Missing" },
  ];

  const contactable = sampleLeads.filter(
    (l) => (l.phone && l.phoneStatus !== "Missing") || (l.email && l.emailStatus !== "Missing")
  ).length;

  assert.equal(contactable, 3); // Leads 1, 2, 3 (Lead 1 is not counted twice!)
});

// 6. Deduplication logic
test("Deduplicate: Filters duplicates by placeId, phoneE164, and name+address", () => {
  const duplicateList = [
    { id: "1", placeId: "p123", name: "Alpha", address: "Dhaka", phoneE164: "+8801700000001" },
    { id: "2", placeId: "p123", name: "Alpha Duplicate", address: "Dhaka", phoneE164: "+8801700000002" },
    { id: "3", placeId: "p456", name: "Beta", address: "Chittagong", phoneE164: "+8801700000003" },
    { id: "4", placeId: "p789", name: "Beta", address: "Chittagong", phoneE164: "+8801700000003" }, // duplicate phone
  ];

  const unique = deduplicateLeads(duplicateList);
  assert.equal(unique.length, 2);
  assert.equal(unique[0].id, "1");
  assert.equal(unique[1].id, "3");
});

// 7. Adaptive Tiling Rectangle Split
test("Adaptive Tiling: Subdivides rectangle into 4 valid quadrants", () => {
  const rect = {
    low: { latitude: 23.70, longitude: 90.30 },
    high: { latitude: 23.80, longitude: 90.40 },
  };

  const quads = splitRectangleIntoQuadrants(rect);
  assert.equal(quads.length, 4);
  assert.equal(quads[0].low.latitude, 23.70);
  assert.equal(quads[0].high.latitude, 23.75);
  assert.equal(quads[3].high.latitude, 23.80);
});

// 8. Auth Error Friendly Message
test("Auth Errors: Map no account error to friendly action message", () => {
  const err = getAuthErrorMessage("user_not_found");
  assert.ok(err.message.includes("No account found") || err.message.includes("create an account"));
});

// 9. Category mapping coverage
test("Category Mapping: Directory services exist in ALL_BUSINESS_SERVICES", () => {
  assert.ok(ALL_BUSINESS_SERVICES.length >= 80);
  const rest = ALL_BUSINESS_SERVICES.find((s) => s.id === "restaurant");
  assert.ok(rest);
  assert.equal(rest.label, "Restaurant & Fine Dining");
});

console.log(`\n========================================`);
console.log(`Summary: ${passed} passed, ${failed} failed`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
}
