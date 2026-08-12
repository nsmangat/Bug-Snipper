import type { Request } from 'express';
import rateLimit from 'express-rate-limit'; // Middleware factory function

// 2 paths since domain and reports route use rate limiting but carry host name differently
//  Domain check route - has hostname as a query string (?hostname=...)
//  submit report route has it in the JSON body
function extractHostnameForRateLimit(req: Request): string {
  // For domain route
  if (typeof req.query.hostname === 'string') {
    return req.query.hostname;
  }

  // For report submission route
  if (typeof req.body?.pageUrl === 'string') {
    try {
      return new URL(req.body.pageUrl).hostname;
    } catch {
      return 'unknown';
    }
  }
  return 'unknown';
}

/** Keyed on IP+hostname, not just IP which is default behaviour
 * To override default behaviour, must use keyGenerator property which is a function
 * Doing this so one abusive site can't exhaust the limit for every
 * other allowlisted site sharing the same visitor's IP, since multiple users may share an IP address
 * i.e. 127.0.0.1:example1.com 50 requests, 127.0.0.1:example2.com 50 requests, will be tracked separately
 * */
export const publicApiRateLimiter = rateLimit({
  windowMs: 60_000, // Time frame for tracking requests, 1 min right now
  limit: 30, // Max number of connections allowed in the timeframe, so 30 reqs per min allowed for 1 ip:hostname
  standardHeaders: true, // Standard rate limit info headers
  legacyHeaders: false,
  keyGenerator: (req) => `${req.ip}:${extractHostnameForRateLimit(req)}`, // i.e. 127.0.0.1:example.com
});
