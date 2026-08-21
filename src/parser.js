const FIELD_WIDTH = 45;

const CDR_FIELDS = [
  "cdrRecordType",
  "globalCallID_callManagerId",
  "globalCallID_callId",
  "origLegcallIdentifier",
  "dateTimeOrigination",
  "origNodeId",
  "origSpan",
  "origIpAddr",
  "callingPartyNumber",
  "callingPartyUnicodeLoginUserID",
  "origCause_location",
  "origCause_value",
  "origPrecedenceLevel",
  "origMediaTransportAddress_IP",
  "origMediaTransportAddress_Port",
  "origMediaCap_payloadCapability",
  "origMediaCap_maxFramesPerPacket",
  "origMediaCap_g723BitRate",
  "origVideoCap_Codec",
  "origVideoCap_Bandwidth",
  "origVideoCap_Resolution",
  "origVideoTransportAddress_IP",
  "origVideoTransportAddress_Port",
  "origRSVPAudioStat",
  "origRSVPVideoStat",
  "destLegIdentifier",
  "destNodeId",
  "destSpan",
  "destIpAddr",
  "originalCalledPartyNumber",
  "finalCalledPartyNumber",
  "finalCalledPartyUnicodeLoginUserID",
  "destCause_location",
  "destCause_value",
  "destPrecedenceLevel",
  "destMediaTransportAddress_IP",
  "destMediaTransportAddress_Port",
  "destMediaCap_payloadCapability",
  "destMediaCap_maxFramesPerPacket",
  "destMediaCap_g723BitRate",
  "destVideoCap_Codec",
  "destVideoCap_Bandwidth",
  "destVideoCap_Resolution",
  "destVideoTransportAddress_IP",
  "destVideoTransportAddress_Port",
  "destRSVPAudioStat",
  "destRSVPVideoStat",
  "dateTimeConnect",
  "dateTimeDisconnect",
  "lastRedirectDn",
  "pkid",
  "originalCalledPartyNumberPartition",
  "callingPartyNumberPartition",
  "finalCalledPartyNumberPartition",
  "lastRedirectDnPartition",
  "duration",
  "origDeviceName",
  "destDeviceName",
  "origCallTerminationOnBehalfOf",
  "destCallTerminationOnBehalfOf",
  "origCalledPartyRedirectOnBehalfOf",
  "lastRedirectRedirectOnBehalfOf",
  "origCalledPartyRedirectReason",
  "lastRedirectRedirectReason",
  "destConversationId",
  "globalCallId_ClusterID",
  "joinOnBehalfOf",
  "comment",
  "clientMatterCode",
  "authCodeDescription",
  "authorizationLevel"
];

const CMR_FIELDS = [
  "cdrRecordType",
  "globalCallID_callManagerId",
  "globalCallID_callId",
  "origNodeId",
  "destNodeId",
  "callingPartyNumber",
  "finalCalledPartyNumber",
  "origCallIdentifier",
  "destCallIdentifier",
  "numberPacketsSent",
  "numberVideoPacketsSent",
  "numberOctetsSent",
  "numberVideoOctetsSent",
  "numberPacketsReceived",
  "numberVideoPacketsReceived",
  "numberOctetsReceived",
  "numberVideoOctetsReceived",
  "numberPacketsLost",
  "numberVideoPacketsLost",
  "jitter",
  "videoAverageJitter",
  "latency",
  "videoRoundTripTime",
  "pkid",
  "callingPartyNumberPartition",
  "finalCalledPartyNumberPartition",
  "globalCallId_ClusterID",
  "origDeviceName",
  "destDeviceName"
];

const CAUSE_CODES = {
  0: "No error",
  1: "Unallocated number",
  3: "No route to destination",
  16: "Normal call clearing",
  17: "User busy",
  18: "No user responding",
  19: "No answer from user",
  20: "Subscriber absent",
  21: "Call rejected",
  22: "Number changed",
  27: "Destination out of order",
  28: "Invalid number format",
  31: "Normal, unspecified",
  34: "No circuit or channel available",
  38: "Network out of order",
  41: "Temporary failure",
  42: "Switching equipment congestion",
  47: "Resource unavailable",
  49: "Quality of service unavailable",
  63: "Service or option unavailable",
  65: "Bearer capability not implemented",
  79: "Service or option not implemented",
  88: "Incompatible destination",
  102: "Recovery on timer expiry",
  111: "Protocol error"
};

const REDIRECT_REASONS = {
  0: "Unknown",
  1: "Call Forward Busy",
  2: "Call Forward No Answer",
  4: "Call Transfer",
  5: "Call Pickup",
  7: "Call Park",
  8: "Call Park Pickup",
  10: "Call Forward",
  11: "Call Park Reversion",
  15: "Call Forward All",
  18: "Call Deflection",
  34: "Blind Transfer",
  50: "Immediate Divert",
  66: "Call Forward Alternate Party",
  82: "Call Forward On Failure",
  98: "Conference",
  130: "Refer",
  162: "SIP redirection",
  177: "Forward busy greeting",
  178: "Call Forward Unregistered",
  207: "Follow Me",
  242: "Do Not Disturb",
  257: "Unavailable",
  274: "Away"
};

const ON_BEHALF_CODES = {
  0: "Unknown",
  1: "CCTI line",
  2: "Unicast shared resource",
  3: "Call park",
  4: "Conference",
  5: "Call forward",
  9: "Multicast shared resource",
  10: "Transfer",
  12: "Device",
  13: "Call control",
  14: "Immediate divert",
  16: "Pickup",
  17: "Refer",
  19: "Redirection",
  24: "Mobility",
  27: "Recording",
  28: "Monitoring",
  34: "Native call queueing"
};

const CODECS = {
  1: "Non-standard",
  2: "G.711 A-law 64k",
  3: "G.711 A-law 56k",
  4: "G.711 μ-law 64k",
  5: "G.711 μ-law 56k",
  6: "G.722 64k",
  7: "G.722 56k",
  8: "G.722 48k",
  9: "G.723.1",
  10: "G.728",
  11: "G.729",
  12: "G.729 Annex A",
  15: "G.729 Annex B",
  16: "G.729 Annex A/B",
  18: "GSM Full Rate",
  19: "GSM Half Rate",
  20: "GSM Enhanced Full Rate",
  40: "G.722.1 32k",
  41: "G.722.1 24k"
};

function clean(value) {
  const result = String(value ?? "").trim();
  return result === "null" || result === "_" ? "" : result;
}

function fixedWidthValues(line, count) {
  const normalized = String(line ?? "").replace(/\r$/, "");
  const values = [];
  for (let index = 0; index < count; index += 1) {
    values.push(clean(normalized.slice(index * FIELD_WIDTH, (index + 1) * FIELD_WIDTH)));
  }
  return values;
}

function valuesToObject(values, fields) {
  return Object.fromEntries(fields.map((field, index) => [field, clean(values[index])]));
}

function parseCdrLine(line) {
  return valuesToObject(fixedWidthValues(line, CDR_FIELDS.length), CDR_FIELDS);
}

function parseMetrics(line) {
  const metricStart = line.search(/(?:^|\s)(?:MLQK|CCR|ICR|CS|SCS|VoRxCodec)=/);
  if (metricStart < 0) return {};

  const fragment = line
    .slice(metricStart)
    .replace(/null\s+_?\s*$/, "")
    .trim();

  const metrics = {};
  for (const part of fragment.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 1) continue;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim().replace(/null$/, "");
    if (key && value) metrics[key] = value;
  }
  return metrics;
}

function parseCmrLine(line) {
  const cmr = valuesToObject(fixedWidthValues(line, CMR_FIELDS.length), CMR_FIELDS);
  cmr.varVQMetrics = parseMetrics(line);
  return cmr;
}

function numberValue(value) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function elapsedSeconds(start, end) {
  if (!start || !end || start === "0" || end === "0") return null;
  const startMs = Date.parse(start);
  const endMs = Date.parse(end);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return null;
  return Math.max(0, Math.round((endMs - startMs) / 1000));
}

function describeCause(cdr) {
  const origin = numberValue(cdr.origCause_value) ?? 0;
  const destination = numberValue(cdr.destCause_value) ?? 0;
  const selected = origin || destination;
  const clearedBy = origin && !destination
    ? "originating party"
    : destination && !origin
      ? "destination party"
      : "system or unspecified party";

  return {
    code: selected,
    label: CAUSE_CODES[selected] ?? `Cause code ${selected}`,
    normal: selected === 0 || selected === 16 || selected === 31,
    clearedBy
  };
}

function classifyDestination(cdr) {
  const haystack = `${cdr.destDeviceName} ${cdr.finalCalledPartyNumber}`.toUpperCase();
  if (/UCXN|UNITY|VOICEMAIL/.test(haystack)) return "voicemail";
  if (/ICAST|PAG(?:E|ING|-)/.test(haystack)) return "paging";
  if (/TRUNK|CUBE|GATEWAY|VG\d/.test(haystack)) return "gateway";
  return "endpoint";
}

function chooseCmr(originationCmr, destinationCmr) {
  const candidates = [originationCmr, destinationCmr].filter(Boolean);
  return candidates.find((cmr) => Object.keys(cmr.varVQMetrics ?? {}).length > 0)
    ?? candidates[0]
    ?? null;
}

function buildQuality(cdr, originationCmr, destinationCmr) {
  const cmr = chooseCmr(originationCmr, destinationCmr);
  const codecCode = numberValue(cdr.origMediaCap_payloadCapability)
    ?? numberValue(cdr.destMediaCap_payloadCapability);
  const hasEndpointStats = cmr && [
    cmr.numberPacketsSent,
    cmr.numberPacketsReceived,
    cmr.numberPacketsLost,
    cmr.jitter,
    cmr.latency
  ].some((value) => numberValue(value) !== null);

  if (!hasEndpointStats && !Object.keys(cmr?.varVQMetrics ?? {}).length) {
    return {
      available: false,
      label: "No endpoint metrics",
      status: "unknown",
      codec: CODECS[codecCode] ?? (codecCode ? `Codec ${codecCode}` : "Unknown"),
      notes: ["CUCM did not include endpoint CMR statistics for this call."]
    };
  }

  const packetsLost = numberValue(cmr.numberPacketsLost);
  const jitterMs = numberValue(cmr.jitter);
  const latencyMs = numberValue(cmr.latency);
  const metrics = cmr.varVQMetrics ?? {};
  const severelyConcealedSeconds = numberValue(metrics.SCS);
  const concealedSeconds = numberValue(metrics.CS);
  const maxJitterMs = numberValue(metrics.maxJitter);
  const notes = [];

  if (packetsLost === 0) notes.push("No RTP packet loss reported.");
  if (packetsLost > 0) notes.push(`${packetsLost} RTP packets were reported lost.`);
  if (jitterMs !== null && jitterMs > 30) notes.push(`Jitter of ${jitterMs} ms is elevated.`);
  if (latencyMs !== null && latencyMs > 150) notes.push(`Latency of ${latencyMs} ms is elevated.`);
  if (severelyConcealedSeconds > 0) {
    notes.push(`The endpoint reported ${severelyConcealedSeconds} severely concealed audio second${severelyConcealedSeconds === 1 ? "" : "s"}.`);
  } else if (concealedSeconds > 0) {
    notes.push(`The endpoint reported ${concealedSeconds} concealed audio second${concealedSeconds === 1 ? "" : "s"}, none severe.`);
  }

  const needsReview = (packetsLost ?? 0) > 0
    || (jitterMs ?? 0) > 30
    || (latencyMs ?? 0) > 150
    || (severelyConcealedSeconds ?? 0) > 0;

  return {
    available: true,
    label: needsReview ? "Review quality" : "Good",
    status: needsReview ? "warning" : "good",
    codec: metrics.VoRxCodec || CODECS[codecCode] || (codecCode ? `Codec ${codecCode}` : "Unknown"),
    packetSizeMs: numberValue(metrics.VoPktSizeMs) ?? numberValue(cdr.origMediaCap_maxFramesPerPacket),
    packetsSent: numberValue(cmr.numberPacketsSent),
    packetsReceived: numberValue(cmr.numberPacketsReceived),
    packetsLost,
    jitterMs,
    maxJitterMs,
    latencyMs,
    concealedSeconds,
    severelyConcealedSeconds,
    metrics,
    notes
  };
}

function buildNarrative(call) {
  const caller = call.caller.number || "An unknown caller";
  const original = call.route.originalCalled || call.route.finalCalled || "the destination";
  const final = call.route.finalCalled || original;
  const connectDelayText = call.timing.ringSeconds === null
    ? ""
    : ` after ${call.timing.ringSeconds} second${call.timing.ringSeconds === 1 ? "" : "s"}`;
  const ringDurationText = call.timing.ringSeconds === null
    ? ""
    : ` for ${call.timing.ringSeconds} second${call.timing.ringSeconds === 1 ? "" : "s"}`;
  const durationText = call.timing.durationSeconds === null
    ? ""
    : ` for ${call.timing.durationSeconds} second${call.timing.durationSeconds === 1 ? "" : "s"}`;

  if (call.forwarding.forwarded && call.route.destinationType === "voicemail") {
    return `${caller} called ${original}. The call rang${ringDurationText}, then forwarded to ${final} on ${call.destination.device || "the voicemail system"} because ${call.forwarding.reason.toLowerCase()}. It remained connected to voicemail${durationText}.`;
  }

  if (call.forwarding.forwarded) {
    return `${caller} called ${original}. The call rang${ringDurationText}, then forwarded to ${final} because ${call.forwarding.reason.toLowerCase()} and remained connected${durationText}.`;
  }

  if (call.route.destinationType === "paging") {
    return `${caller} placed a paging call from ${call.caller.device || "the originating device"} to ${call.destination.device || final}. It connected${connectDelayText} and lasted${durationText}.`;
  }

  return `${caller} called ${final}. The call connected${connectDelayText} and lasted${durationText}.`;
}

function normalizeCall(block, index) {
  const cdr = block.cdr;
  const duration = numberValue(cdr.duration);
  const ringSeconds = elapsedSeconds(cdr.dateTimeOrigination, cdr.dateTimeConnect);
  const connected = Boolean(cdr.dateTimeConnect && cdr.dateTimeConnect !== "0");
  const originalCalled = cdr.originalCalledPartyNumber;
  const finalCalled = cdr.finalCalledPartyNumber;
  const originalRedirect = numberValue(cdr.origCalledPartyRedirectReason) ?? 0;
  const lastRedirect = numberValue(cdr.lastRedirectRedirectReason) ?? 0;
  const redirectCode = lastRedirect || originalRedirect;
  const forwardActorCode = numberValue(cdr.lastRedirectRedirectOnBehalfOf)
    || numberValue(cdr.origCalledPartyRedirectOnBehalfOf)
    || 0;
  const forwarded = /^forward/i.test(block.callType)
    || Boolean(originalCalled && finalCalled && originalCalled !== finalCalled);
  const cause = describeCause(cdr);

  const call = {
    id: `${cdr.globalCallID_callManagerId || "0"}-${cdr.globalCallID_callId || index + 1}`,
    type: block.callType || "Unknown",
    caller: {
      number: cdr.callingPartyNumber,
      userId: cdr.callingPartyUnicodeLoginUserID,
      device: cdr.origDeviceName,
      ip: cdr.origIpAddr || cdr.origMediaTransportAddress_IP
    },
    destination: {
      number: finalCalled,
      userId: cdr.finalCalledPartyUnicodeLoginUserID,
      device: cdr.destDeviceName,
      ip: cdr.destIpAddr || cdr.destMediaTransportAddress_IP
    },
    route: {
      originalCalled,
      finalCalled,
      lastRedirect: cdr.lastRedirectDn,
      destinationType: classifyDestination(cdr),
      cluster: cdr.globalCallId_ClusterID
    },
    timing: {
      originatedAt: cdr.dateTimeOrigination,
      connectedAt: connected ? cdr.dateTimeConnect : "",
      disconnectedAt: cdr.dateTimeDisconnect,
      ringSeconds,
      durationSeconds: duration ?? elapsedSeconds(cdr.dateTimeConnect, cdr.dateTimeDisconnect)
    },
    forwarding: {
      forwarded,
      reasonCode: redirectCode,
      reason: forwarded ? (REDIRECT_REASONS[redirectCode] ?? `redirect reason ${redirectCode}`) : "Not forwarded",
      performedBy: ON_BEHALF_CODES[forwardActorCode] ?? `Feature code ${forwardActorCode}`
    },
    outcome: {
      connected,
      ...cause
    },
    quality: buildQuality(cdr, block.originationCmr, block.destinationCmr),
    raw: {
      cdr,
      originationCmr: block.originationCmr,
      destinationCmr: block.destinationCmr
    }
  };

  call.narrative = buildNarrative(call);
  return call;
}

function nextNonEmpty(lines, start) {
  for (let index = start; index < lines.length; index += 1) {
    if (lines[index].trim()) return index;
  }
  return -1;
}

function parseBlocks(text) {
  const lines = text.replace(/^\uFEFF/, "").split("\n");
  const blocks = [];
  let current = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].replace(/\r$/, "");
    const callTypeMatch = line.match(/^Call Type\s*:\s*(.+)$/i);
    if (callTypeMatch) {
      current = { callType: clean(callTypeMatch[1]), cdr: null, originationCmr: null, destinationCmr: null };
      blocks.push(current);
      continue;
    }
    if (!current) continue;

    const section = line.trim().toLowerCase();
    if (section === "cdr") {
      const headerIndex = nextNonEmpty(lines, index + 1);
      const dataIndex = nextNonEmpty(lines, headerIndex + 1);
      if (dataIndex >= 0) {
        current.cdr = parseCdrLine(lines[dataIndex]);
        index = dataIndex;
      }
    } else if (section === "origination cmr" || section === "destination cmr") {
      const headerIndex = nextNonEmpty(lines, index + 1);
      const dataIndex = nextNonEmpty(lines, headerIndex + 1);
      if (dataIndex >= 0) {
        const parsed = parseCmrLine(lines[dataIndex]);
        if (section === "origination cmr") current.originationCmr = parsed;
        else current.destinationCmr = parsed;
        index = dataIndex;
      }
    }
  }

  return blocks.filter((block) => block.cdr);
}

function summarize(calls) {
  const forwarded = calls.filter((call) => call.forwarding.forwarded).length;
  const voicemail = calls.filter((call) => call.route.destinationType === "voicemail").length;
  const connected = calls.filter((call) => call.outcome.connected).length;
  const normal = calls.filter((call) => call.outcome.normal).length;
  const qualityWarnings = calls.filter((call) => call.quality.status === "warning").length;
  const ringValues = calls.map((call) => call.timing.ringSeconds).filter((value) => value !== null);

  return {
    totalCalls: calls.length,
    connectedCalls: connected,
    forwardedCalls: forwarded,
    voicemailCalls: voicemail,
    normalClearingCalls: normal,
    qualityWarnings,
    averageRingSeconds: ringValues.length
      ? Math.round(ringValues.reduce((sum, value) => sum + value, 0) / ringValues.length)
      : null
  };
}

export function decodeCarReport(text, filename = "uploaded report") {
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("The uploaded report is empty.");
  }
  if (!/^Call Type\s*:/im.test(text) || !/^CDR\s*$/im.test(text)) {
    throw new Error("This does not look like a supported Cisco CAR/CDR MailToFile report.");
  }

  const blocks = parseBlocks(text);
  if (!blocks.length) {
    throw new Error("The report structure was recognized, but no call records could be decoded.");
  }

  const calls = blocks.map(normalizeCall);
  return {
    report: {
      filename,
      decodedAt: new Date().toISOString(),
      format: "Cisco CUCM CAR/CDR MailToFile",
      privacy: "Processed in memory and not retained by the application"
    },
    summary: summarize(calls),
    calls
  };
}

export const referenceData = {
  causeCodes: CAUSE_CODES,
  redirectReasons: REDIRECT_REASONS,
  onBehalfCodes: ON_BEHALF_CODES,
  codecs: CODECS
};
