import { Router } from 'express';
import { z } from 'zod';
import {
  deleteReport,
  DomainNotAllowedError,
  getReportById,
  listReports,
  ReportNotFoundError,
  submitReport,
  updateReportStatus,
} from '../services/reports.service.js';

// Shared between the list filter and the status update body, keeps the enum's
// values in sync with ReportStatus in shared-types
const reportStatusSchema = z.enum([
  'open',
  'in_progress',
  'resolved',
  'abandoned',
]);

const coordinatesSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  viewportWidth: z.number(),
  viewportHeight: z.number(),
  scrollX: z.number(),
  scrollY: z.number(),
});

const viewportSchema = z.object({
  width: z.number(),
  height: z.number(),
  devicePixelRatio: z.number(),
});

const browserInfoSchema = z.object({
  userAgent: z.string(),
  browserName: z.string(),
  browserVersion: z.string(),
  os: z.string(),
});

const domSnapshotSchema = z.object({
  html: z.string(),
  styles: z.record(z.record(z.string())),
});

const submitReportSchema = z.object({
  pageUrl: z.string().url(),
  screenshotBase64: z.string().min(1),
  domSnapshot: domSnapshotSchema,
  coordinates: coordinatesSchema,
  viewport: viewportSchema,
  browserInfo: browserInfoSchema,
  note: z.string().nullable().optional(),
});

/** Using 2 separate routers since both will be mounted differently
 *     - publicReportsRouter - needs publicCors + publicApiRateLimiter - anonymous bug reports so don't want to overload
 *       storage uploads and DB writes
 *     - reportsRouter - dashboardCors - basic CORS, authentication to be implemented later but at the moment just going with
 *       reads not being too costly
 **/
export const publicReportsRouter = Router();

publicReportsRouter.post('/', async (req, res, next) => {
  const parsed = submitReportSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: 'Invalid request body', details: parsed.error.flatten() });
    return;
  }

  try {
    const report = await submitReport(parsed.data);
    res.status(201).json(report);
  } catch (err) {
    if (err instanceof DomainNotAllowedError) {
      res.status(403).json({ error: err.message });
      return;
    }
    next(err);
  }
});

// Optional filters when viewing list of reports
const listReportsQuerySchema = z.object({
  // Query params are strings right now, will need to update if other types like numericals are added i.e. pagination
  workspaceId: z.string().uuid().optional(),
  status: reportStatusSchema.optional(),
});

export const reportsRouter = Router();

reportsRouter.get('/', async (req, res, next) => {
  const parsed = listReportsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: 'Invalid query params', details: parsed.error.flatten() });
    return;
  }

  try {
    const reports = await listReports(parsed.data);
    res.json({ reports });
  } catch (err) {
    next(err);
  }
});

const reportIdParamSchema = z.object({
  id: z.string().uuid(),
});

reportsRouter.get('/:id', async (req, res, next) => {
  const parsed = reportIdParamSchema.safeParse(req.params);

  if (!parsed.success) {
    res
      .status(400)
      .json({ error: 'Invalid report id', details: parsed.error.flatten() });
    return;
  }

  try {
    const reportDetail = await getReportById(parsed.data.id);
    res.json(reportDetail);
  } catch (err) {
    if (err instanceof ReportNotFoundError) {
      res.status(404).json({ error: err.message });
      return;
    }
    next(err);
  }
});

// Updating and deleting reports
const updateReportStatusSchema = z.object({
  status: reportStatusSchema,
});

reportsRouter.patch('/:id', async (req, res, next) => {
  const parsedParams = reportIdParamSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      error: 'Invalid report id',
      details: parsedParams.error.flatten(),
    });
    return;
  }

  const parsedBody = updateReportStatusSchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({
      error: 'Invalid request body',
      details: parsedBody.error.flatten(),
    });
    return;
  }

  try {
    const report = await updateReportStatus(
      parsedParams.data.id,
      parsedBody.data.status,
    );
    res.json(report);
  } catch (err) {
    if (err instanceof ReportNotFoundError) {
      res.status(404).json({ error: err.message });
      return;
    }
    next(err);
  }
});

reportsRouter.delete('/:id', async (req, res, next) => {
  const parsed = reportIdParamSchema.safeParse(req.params);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: 'Invalid report id', details: parsed.error.flatten() });
    return;
  }

  try {
    await deleteReport(parsed.data.id);
    res.status(204).send();
  } catch (err) {
    if (err instanceof ReportNotFoundError) {
      res.status(404).json({ error: err.message });
      return;
    }
    next(err);
  }
});
