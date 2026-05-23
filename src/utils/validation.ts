export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validateSignup(body: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];

  if (!body['name'] || typeof body['name'] !== 'string' || body['name'].trim() === '') {
    errors.push('name is required');
  }
  if (!body['email'] || typeof body['email'] !== 'string' || !isValidEmail(body['email'])) {
    errors.push('a valid email is required');
  }
  if (!body['password'] || typeof body['password'] !== 'string' || body['password'].trim() === '') {
    errors.push('password is required');
  }
  if (body['role'] !== undefined && !['contributor', 'maintainer'].includes(body['role'] as string)) {
    errors.push('role must be contributor or maintainer');
  }

  return { valid: errors.length === 0, errors };
}

export function validateLogin(body: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];

  if (!body['email'] || typeof body['email'] !== 'string' || !isValidEmail(body['email'])) {
    errors.push('a valid email is required');
  }
  if (!body['password'] || typeof body['password'] !== 'string' || body['password'].trim() === '') {
    errors.push('password is required');
  }

  return { valid: errors.length === 0, errors };
}

export function validateCreateIssue(body: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];

  if (!body['title'] || typeof body['title'] !== 'string' || body['title'].trim() === '') {
    errors.push('title is required');
  } else if (body['title'].length > 150) {
    errors.push('title must be 150 characters or fewer');
  }
  if (!body['description'] || typeof body['description'] !== 'string' || body['description'].trim() === '') {
    errors.push('description is required');
  } else if ((body['description'] as string).trim().length < 20) {
    errors.push('description must be at least 20 characters');
  }
  if (!body['type'] || !['bug', 'feature_request'].includes(body['type'] as string)) {
    errors.push('type must be bug or feature_request');
  }

  return { valid: errors.length === 0, errors };
}

export function validateUpdateIssue(body: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];
  const allowed = ['title', 'description', 'type', 'status'];
  const keys = Object.keys(body);

  if (keys.length === 0) {
    errors.push('request body must contain at least one field to update');
    return { valid: false, errors };
  }

  if (body['title'] !== undefined) {
    if (typeof body['title'] !== 'string' || body['title'].trim() === '') {
      errors.push('title must be a non-empty string');
    } else if (body['title'].length > 150) {
      errors.push('title must be 150 characters or fewer');
    }
  }
  if (body['description'] !== undefined) {
    if (typeof body['description'] !== 'string' || body['description'].trim() === '') {
      errors.push('description must be a non-empty string');
    } else if ((body['description'] as string).trim().length < 20) {
      errors.push('description must be at least 20 characters');
    }
  }
  if (body['type'] !== undefined && !['bug', 'feature_request'].includes(body['type'] as string)) {
    errors.push('type must be bug or feature_request');
  }
  if (body['status'] !== undefined && !['open', 'in_progress', 'resolved'].includes(body['status'] as string)) {
    errors.push('status must be open, in_progress, or resolved');
  }

  const unknown = keys.filter(k => !allowed.includes(k));
  if (unknown.length > 0) {
    errors.push(`unknown fields: ${unknown.join(', ')}`);
  }

  return { valid: errors.length === 0, errors };
}
