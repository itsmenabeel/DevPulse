type SortDirection = 'ASC' | 'DESC';

interface IssueListFilters {
  type?: string;
  status?: string;
  sort?: string;
}

interface QueryResult {
  text: string;
  values: unknown[];
}

export function buildIssueListQuery(filters: IssueListFilters): QueryResult {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let paramIdx = 1;

  if (filters.type) {
    conditions.push(`type = $${paramIdx++}`);
    values.push(filters.type);
  }
  if (filters.status) {
    conditions.push(`status = $${paramIdx++}`);
    values.push(filters.status);
  }

  const direction: SortDirection = filters.sort?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const text = `SELECT id, title, description, type, status, reporter_id, created_at, updated_at FROM issues ${where} ORDER BY created_at ${direction}`;

  return { text, values };
}

const ALLOWED_UPDATE_COLUMNS = ['title', 'description', 'type', 'status'] as const;

export function buildUpdateIssueQuery(issueId: number, fields: Record<string, unknown>): QueryResult {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIdx = 1;

  for (const col of ALLOWED_UPDATE_COLUMNS) {
    if (col in fields) {
      setClauses.push(`${col} = $${paramIdx++}`);
      values.push(fields[col]);
    }
  }

  values.push(issueId);
  const text = `UPDATE issues SET ${setClauses.join(', ')} WHERE id = $${paramIdx} RETURNING id, title, description, type, status, reporter_id, created_at, updated_at`;

  return { text, values };
}
