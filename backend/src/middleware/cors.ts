import cors from 'cors';
import { isHostnameAllowlisted } from '../services/domains.service.js';

// Using URL object to parse an incoming URL instead of doing it manually,
// can extract protocol, host, hostname, port, pathname, searchParams, hash, ect.
// Try Catch to validate for a valid URL string or return null if not valid
function extractHostname(origin: string): string | null {
  try {
    return new URL(origin).hostname; //i.e. whatever.com
  } catch {
    return null;
  }
}

/** Checking to see valid hostnames i.e. ones in the db can get access - those web browsers will get responses
 * Remember with CORS, stuff like curls or Postman will still get responses, CORS is for browsers to block their access or not
 * i.e. allowing browser pages' JS to read server responses or not
 */
export const publicCors = cors({
  origin: (origin, callback) => {
    if (!origin) {
      // No origin header ie. curl, server-to-server, same origin, ect.
      // callback takes (error, allow) - null for no error, and true for allowing the request
      callback(null, true);
      return;
    }

    // Not a valid hostname so disallow right away (disallow meaning browser give the page's JS the response data)
    const hostname = extractHostname(origin);
    if (!hostname) {
      callback(null, false);
      return;
    }

    // isHostnameAllowlisted in domain services if it finds a record of hostname, will return true so allow it, else false so disallow
    isHostnameAllowlisted(hostname)
      .then((allowed) => callback(null, allowed))
      .catch((err: unknown) => callback(err as Error, false));
  },
});

// All requests received by the server for dashboard reading will have CORS
// enabled in them (defaults to setting header to Access-Control-Allow-Origin: *)
// TODO: Adjust when implementing authentication
export const dashboardCors = cors();
