interface JwtPayload {
  id: number;
  name: string;
  role: 'contributor' | 'maintainer';
}

declare namespace Express {
  interface Request {
    user?: JwtPayload;
  }
}
