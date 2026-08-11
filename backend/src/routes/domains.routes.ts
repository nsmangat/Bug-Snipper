/** This route will be called as like a pre-check to render the capture trigger UI of the extension
 * if the current domain is in the db
 */
import { Router } from 'express';
import { z } from 'zod';
import { matchDomain } from '../services/domains.service.js';

// Validation for runtime data i.e. incoming request
const checkQuerySchema = z.object({
  hostname: z.string().min(1),
  path: z.string().min(1),
});

export const publicDomainsRouter = Router();

publicDomainsRouter.get('/check', async (req, res, next) => {
  const safe_parsed_req = checkQuerySchema.safeParse(req.query);

  // safeParse returns {success: boolean, data: T}
  if (!safe_parsed_req.success) {
    res.status(400).json({
      error: 'Invalid query parameters',
      details: safe_parsed_req.error.flatten(), // flatten - gives error per field
    });
    return;
  }

  try {
    const match = await matchDomain(
      safe_parsed_req.data.hostname,
      safe_parsed_req.data.path,
    );

    if (!match) {
      res.json({ allowed: false });
      return;
    }

    // If valid domain, returning it as the public response shape of DomainCheckResponse interface (api.ts)
    res.json({
      allowed: true,
      workspaceId: match.workspaceId,
      matchedPrefix: match.matchedPrefix,
    });
  } catch (err) {
    // Handed off to error handler middleware
    next(err);
  }
});
