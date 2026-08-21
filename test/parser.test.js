import assert from "node:assert/strict";
import test from "node:test";
import { decodeCarReport } from "../src/parser.js";

const width = 45;
const row = (values) => values.map((value) => String(value ?? "").padEnd(width)).join("");

function cdr(overrides = {}) {
  const values = Array(71).fill(0);
  const indexes = {
    cdrRecordType: 0,
    globalCallID_callManagerId: 1,
    globalCallID_callId: 2,
    dateTimeOrigination: 4,
    origIpAddr: 7,
    callingPartyNumber: 8,
    callingPartyUnicodeLoginUserID: 9,
    origCause_value: 11,
    origMediaCap_payloadCapability: 15,
    origMediaCap_maxFramesPerPacket: 16,
    destIpAddr: 28,
    originalCalledPartyNumber: 29,
    finalCalledPartyNumber: 30,
    dateTimeConnect: 47,
    dateTimeDisconnect: 48,
    lastRedirectDn: 49,
    duration: 55,
    origDeviceName: 56,
    destDeviceName: 57,
    origCalledPartyRedirectOnBehalfOf: 60,
    lastRedirectRedirectOnBehalfOf: 61,
    origCalledPartyRedirectReason: 62,
    lastRedirectRedirectReason: 63,
    globalCallId_ClusterID: 65
  };
  Object.entries({
    cdrRecordType: 1,
    globalCallID_callManagerId: 2,
    globalCallID_callId: 12345,
    dateTimeOrigination: "Aug 21, 2026 11:05:37 AM",
    origIpAddr: "10.10.128.5",
    callingPartyNumber: "+19795550100",
    origCause_value: 16,
    origMediaCap_payloadCapability: 4,
    origMediaCap_maxFramesPerPacket: 20,
    destIpAddr: "10.10.128.15",
    originalCalledPartyNumber: "+19795550200",
    finalCalledPartyNumber: "+19795550999",
    dateTimeConnect: "Aug 21, 2026 11:06:01 AM",
    dateTimeDisconnect: "Aug 21, 2026 11:06:22 AM",
    lastRedirectDn: "+19795550200",
    duration: 21,
    origDeviceName: "TSC-TEST-SRST",
    destDeviceName: "UCXN-Primary",
    origCalledPartyRedirectOnBehalfOf: 5,
    lastRedirectRedirectOnBehalfOf: 5,
    origCalledPartyRedirectReason: 2,
    lastRedirectRedirectReason: 2,
    globalCallId_ClusterID: "TestCluster.local",
    ...overrides
  }).forEach(([key, value]) => { values[indexes[key]] = value; });
  return row(values);
}

function cmr(overrides = {}) {
  const values = Array(29).fill("null");
  const defaults = [1, 2, 12345, 2, 2, "+19795550100", "+19795550999", 100, 101, 1063, "null", 170080, "null", 515, "null", 85546, "null", 0, "null", 1, "null", 1, "null", "test-pkid", "On Cluster", "On Cluster", "TestCluster.local", "SEPTEST", "UCXN-Primary"];
  defaults.forEach((value, index) => { values[index] = value; });
  Object.entries(overrides).forEach(([index, value]) => { values[Number(index)] = value; });
  return `${row(values)}CCR=0.0012;ICR=0.0000;CS=1;SCS=0;VoRxCodec=G.711 u-la;VoPktLost=0;maxJitter=3null      _`;
}

function report(cdrLine = cdr(), cmrLine = cmr()) {
  return [
    "Call Type :Forward",
    "CDR",
    "cdrRecordType header omitted in test",
    cdrLine,
    "Origination CMR",
    "cmr header omitted in test",
    cmrLine,
    "Destination CMR",
    "cmr header omitted in test",
    cmrLine,
    ""
  ].join("\r\n");
}

test("decodes a no-answer forward to Unity voicemail", () => {
  const decoded = decodeCarReport(report(), "test.txt");
  assert.equal(decoded.summary.totalCalls, 1);
  assert.equal(decoded.summary.forwardedCalls, 1);
  assert.equal(decoded.summary.voicemailCalls, 1);

  const call = decoded.calls[0];
  assert.equal(call.forwarding.reason, "Call Forward No Answer");
  assert.equal(call.forwarding.performedBy, "Call forward");
  assert.equal(call.timing.ringSeconds, 24);
  assert.equal(call.timing.durationSeconds, 21);
  assert.equal(call.outcome.label, "Normal call clearing");
  assert.equal(call.route.destinationType, "voicemail");
  assert.match(call.narrative, /forwarded.*because call forward no answer/i);
});

test("decodes CMR codec and quality values", () => {
  const quality = decodeCarReport(report()).calls[0].quality;
  assert.equal(quality.available, true);
  assert.equal(quality.status, "good");
  assert.equal(quality.packetsLost, 0);
  assert.equal(quality.jitterMs, 1);
  assert.equal(quality.latencyMs, 1);
  assert.equal(quality.maxJitterMs, 3);
  assert.equal(quality.codec, "G.711 u-la");
});

test("flags severely concealed audio for review", () => {
  const line = cmr().replace("CS=1;SCS=0", "CS=11;SCS=11");
  const quality = decodeCarReport(report(cdr(), line)).calls[0].quality;
  assert.equal(quality.status, "warning");
  assert.match(quality.notes.join(" "), /11 severely concealed/);
});

test("labels an all-null CMR as unavailable instead of good", () => {
  const values = Array(29).fill("null");
  values[0] = 1;
  values[1] = 2;
  values[2] = 12345;
  values[27] = "TSC-TEST-SRST";
  values[28] = "UCXN-Primary";
  const quality = decodeCarReport(report(cdr(), `${row(values)}null      _`)).calls[0].quality;
  assert.equal(quality.available, false);
  assert.equal(quality.status, "unknown");
  assert.equal(quality.label, "No endpoint metrics");
});

test("rejects unrelated or empty files", () => {
  assert.throws(() => decodeCarReport(""), /empty/i);
  assert.throws(() => decodeCarReport("ordinary text file"), /supported Cisco/i);
});
