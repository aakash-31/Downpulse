const dns = require('dns');
const { promisify } = require('util');
const dnsLookup = promisify(dns.lookup);

/**
 * Checks if an IPv4 or IPv6 address is within a private, loopback, or reserved range.
 * @param {string} ip - The IP address to check.
 * @returns {boolean} True if the IP is private/reserved (untrusted for outbound checks).
 */
function isPrivateIP(ip) {
  if (!ip) return true;

  // Check IPv6 loopback and unspecified addresses
  if (ip === '::1' || ip === '::') return true;

  // Check IPv4 loopback & private ranges
  const ipv4Match = ip.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (ipv4Match) {
    const octet1 = parseInt(ipv4Match[1], 10);
    const octet2 = parseInt(ipv4Match[2], 10);

    // Loopback (127.0.0.0/8)
    if (octet1 === 127) return true;

    // Private network Class A (10.0.0.0/8)
    if (octet1 === 10) return true;

    // Private network Class B (172.16.0.0/12)
    if (octet1 === 172 && octet2 >= 16 && octet2 <= 31) return true;

    // Private network Class C (192.168.0.0/16)
    if (octet1 === 192 && octet2 === 168) return true;

    // Link-Local (169.254.0.0/16)
    if (octet1 === 169 && octet2 === 254) return true;

    // Shared Address Space (100.64.0.0/10)
    if (octet1 === 100 && octet2 >= 64 && octet2 <= 127) return true;

    // Broadcast/Reserved/Local/Multicast (0.0.0.0 or >= 224.0.0.0)
    if (octet1 === 0 || octet1 >= 224) return true;
  }

  // Check IPv6 Private/Local ranges (Link-local: fe80::, unique local: fc00:: or fd00::)
  if (ip.includes(':')) {
    const normalized = ip.toLowerCase();
    if (
      normalized.startsWith('fe8') ||
      normalized.startsWith('fe9') ||
      normalized.startsWith('fea') ||
      normalized.startsWith('feb') ||
      normalized.startsWith('fc') ||
      normalized.startsWith('fd')
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Validates a URL to protect the server from Server-Side Request Forgery (SSRF) attacks.
 * Resolves the URL host to an IP address and blocks private / loopback IP address ranges.
 * @param {string} urlString 
 * @returns {Promise<boolean>} True if the URL is a safe, public endpoint.
 */
async function validateUrlForSSRF(urlString) {
  try {
    const parsed = new URL(urlString);
    
    // Require standard HTTP or HTTPS protocols
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }

    const hostname = parsed.hostname;
    
    // If hostname is directly an IP or resolves via OS hosts, dns.lookup handles it
    const lookupResult = await dnsLookup(hostname);
    const ip = lookupResult.address;

    if (isPrivateIP(ip)) {
      console.warn(`🛡️ SSRF Blocked: URL [${urlString}] resolves to untrusted IP [${ip}]`);
      return false;
    }

    return true;
  } catch (error) {
    // If URL is invalid, parsing fails, or DNS cannot resolve, it is unsafe/invalid
    console.error(`❌ Security validation failed for [${urlString}]:`, error.message);
    return false;
  }
}

module.exports = {
  isPrivateIP,
  validateUrlForSSRF
};
