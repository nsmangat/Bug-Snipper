import { Router } from 'express';
import { z } from 'zod';
import {
  createDomain,
  deleteDomain,
  DomainNotFoundError,
  DuplicateDomainError,
  listDomainsForWorkspace,
  matchDomain,
} from '../services/domains.service.js';

// Validation for runtime data i.e. incoming request
const checkQuerySchema = z.object({
  hostname: z.string().min(1),
  path: z.string().min(1),
});

export const publicDomainsRouter = Router();

/** This route will be called as like a pre-check to render the capture trigger UI of the extension
 * if the current domain is in the db
 */
publicDomainsRouter.get('/check', async (req, res, next) => {
  // Get query parameters i.e. ?hostname=...
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

/** Below is for Dashboard domain management i.e. list, create, and delete a workspace's allowlisted domains
 * Separate router from publicDomainsRouter above since this is mounted with dashboardCors, not
 * publicCors/rate limiting, same reasoning already applied to reports vs public reports **/
export const domainsRouter = Router();

const listDomainsQuerySchema = z.object({
  workspaceId: z.string().uuid(),
});

domainsRouter.get('/', async (req, res, next) => {
  const parsed = listDomainsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: 'Invalid query params', details: parsed.error.flatten() });
    return;
  }

  try {
    const domains = await listDomainsForWorkspace(parsed.data.workspaceId);
    res.json({ domains });
  } catch (err) {
    next(err);
  }
});

const createDomainSchema = z.object({
  workspaceId: z.string().uuid(),
  hostname: z.string().min(1),
  pathPrefix: z.string().nullable().optional(),
});

domainsRouter.post('/', async (req, res, next) => {
  const parsed = createDomainSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: 'Invalid request body', details: parsed.error.flatten() });
    return;
  }

  // Normalizing empty string or undefined to null here, so a blank form field means "no prefix"
  // Equivalent to never sending one, not an actual empty string prefix stored in the DB
  const pathPrefix = parsed.data.pathPrefix?.trim() || null;

  try {
    const domain = await createDomain(
      parsed.data.workspaceId,
      parsed.data.hostname,
      pathPrefix,
    );
    res.status(201).json(domain);
  } catch (err) {
    if (err instanceof DuplicateDomainError) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

const domainIdParamSchema = z.object({
  id: z.string().uuid(),
});

domainsRouter.delete('/:id', async (req, res, next) => {
  const parsed = domainIdParamSchema.safeParse(req.params);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: 'Invalid domain id', details: parsed.error.flatten() });
    return;
  }

  try {
    await deleteDomain(parsed.data.id);
    res.status(204).send();
  } catch (err) {
    if (err instanceof DomainNotFoundError) {
      res.status(404).json({ error: err.message });
      return;
    }
    next(err);
  }
});
