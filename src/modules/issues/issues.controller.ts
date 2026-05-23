import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import pool from '../../config/db';
import { sendSuccess, sendSuccessNoData, sendError } from '../../utils/response';
import { validateCreateIssue, validateUpdateIssue } from '../../utils/validation';
import { buildIssueListQuery, buildUpdateIssueQuery } from '../../utils/queryHelpers';

interface IssueRow {
  id: number;
  title: string;
  description: string;
  type: 'bug' | 'feature_request';
  status: 'open' | 'in_progress' | 'resolved';
  reporter_id: number;
  created_at: Date;
  updated_at: Date;
}

interface ReporterSnapshot {
  id: number;
  name: string;
  role: 'contributor' | 'maintainer';
}

interface IssueWithReporter extends Omit<IssueRow, 'reporter_id'> {
  reporter: ReporterSnapshot;
}

function parseId(param: string | string[]): number | null {
  if (Array.isArray(param)) return null;
  const n = parseInt(param, 10);
  return isNaN(n) || String(n) !== param ? null : n;
}

export async function createIssue(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = req.body as Record<string, unknown>;
    const { valid, errors } = validateCreateIssue(body);
    if (!valid) {
      sendError(res, StatusCodes.BAD_REQUEST, 'Validation failed', errors);
      return;
    }

    const title = (body['title'] as string).trim();
    const description = (body['description'] as string).trim();
    const type = body['type'] as string;
    const reporterId = req.user!.id;

    const result = await pool.query<IssueRow>(
      `INSERT INTO issues (title, description, type, reporter_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, title, description, type, status, reporter_id, created_at, updated_at`,
      [title, description, type, reporterId]
    );

    sendSuccess(res, StatusCodes.CREATED, 'Issue created successfully', result.rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function getAllIssues(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { type, status, sort } = req.query as Record<string, string | undefined>;

    if (type !== undefined && !['bug', 'feature_request'].includes(type)) {
      sendError(res, StatusCodes.BAD_REQUEST, 'type must be bug or feature_request');
      return;
    }
    if (status !== undefined && !['open', 'in_progress', 'resolved'].includes(status)) {
      sendError(res, StatusCodes.BAD_REQUEST, 'status must be open, in_progress, or resolved');
      return;
    }
    if (sort !== undefined && !['asc', 'desc'].includes(sort.toLowerCase())) {
      sendError(res, StatusCodes.BAD_REQUEST, 'sort must be asc or desc');
      return;
    }

    const { text, values } = buildIssueListQuery({ type, status, sort });
    const issuesResult = await pool.query<IssueRow>(text, values);
    const issues = issuesResult.rows;

    if (issues.length === 0) {
      sendSuccess(res, StatusCodes.OK, 'Issues retrieved successfully', []);
      return;
    }

    const reporterIds = [...new Set(issues.map(i => i.reporter_id))];
    const placeholders = reporterIds.map((_, i) => `$${i + 1}`).join(', ');
    const reportersResult = await pool.query<ReporterSnapshot>(
      `SELECT id, name, role FROM users WHERE id IN (${placeholders})`,
      reporterIds
    );

    const reporterMap = new Map<number, ReporterSnapshot>(
      reportersResult.rows.map(r => [r.id, r])
    );

    const data: IssueWithReporter[] = issues.map(({ reporter_id, ...rest }) => ({
      ...rest,
      reporter: reporterMap.get(reporter_id)!,
    }));

    sendSuccess(res, StatusCodes.OK, 'Issues retrieved successfully', data);
  } catch (err) {
    next(err);
  }
}

export async function getIssueById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseId(req.params['id']);
    if (id === null) {
      sendError(res, StatusCodes.BAD_REQUEST, 'Issue ID must be a valid integer');
      return;
    }

    const issueResult = await pool.query<IssueRow>(
      'SELECT id, title, description, type, status, reporter_id, created_at, updated_at FROM issues WHERE id = $1',
      [id]
    );
    if (!issueResult.rowCount || issueResult.rowCount === 0) {
      sendError(res, StatusCodes.NOT_FOUND, 'Issue not found');
      return;
    }

    const issue = issueResult.rows[0];
    const reporterResult = await pool.query<ReporterSnapshot>(
      'SELECT id, name, role FROM users WHERE id = $1',
      [issue.reporter_id]
    );

    const { reporter_id: _rid, ...issueData } = issue;
    void _rid;
    const data: IssueWithReporter = { ...issueData, reporter: reporterResult.rows[0] };

    sendSuccess(res, StatusCodes.OK, 'Issue retrieved successfully', data);
  } catch (err) {
    next(err);
  }
}

export async function updateIssue(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseId(req.params['id']);
    if (id === null) {
      sendError(res, StatusCodes.BAD_REQUEST, 'Issue ID must be a valid integer');
      return;
    }

    const issueResult = await pool.query<IssueRow>(
      'SELECT id, title, description, type, status, reporter_id, created_at, updated_at FROM issues WHERE id = $1',
      [id]
    );
    if (!issueResult.rowCount || issueResult.rowCount === 0) {
      sendError(res, StatusCodes.NOT_FOUND, 'Issue not found');
      return;
    }

    const issue = issueResult.rows[0];
    const body = req.body as Record<string, unknown>;
    const user = req.user!;

    if (user.role === 'contributor') {
      if (issue.reporter_id !== user.id) {
        sendError(res, StatusCodes.FORBIDDEN, 'You can only update your own issues');
        return;
      }
      if (issue.status !== 'open') {
        sendError(res, StatusCodes.CONFLICT, 'Only open issues can be updated');
        return;
      }
      if ('status' in body) {
        sendError(res, StatusCodes.FORBIDDEN, 'Contributors cannot change issue status');
        return;
      }
    }

    const { valid, errors } = validateUpdateIssue(body);
    if (!valid) {
      sendError(res, StatusCodes.BAD_REQUEST, 'Validation failed', errors);
      return;
    }

    const { text, values } = buildUpdateIssueQuery(id, body);
    const result = await pool.query<IssueRow>(text, values);

    sendSuccess(res, StatusCodes.OK, 'Issue updated successfully', result.rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function deleteIssue(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseId(req.params['id']);
    if (id === null) {
      sendError(res, StatusCodes.BAD_REQUEST, 'Issue ID must be a valid integer');
      return;
    }

    const issueResult = await pool.query(
      'SELECT id FROM issues WHERE id = $1',
      [id]
    );
    if (!issueResult.rowCount || issueResult.rowCount === 0) {
      sendError(res, StatusCodes.NOT_FOUND, 'Issue not found');
      return;
    }

    await pool.query('DELETE FROM issues WHERE id = $1', [id]);
    sendSuccessNoData(res, StatusCodes.OK, 'Issue deleted successfully');
  } catch (err) {
    next(err);
  }
}
