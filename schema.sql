-- Auto-refresh updated_at on every UPDATE
CREATE OR REPLACE FUNCTION refresh_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE users (
  id         SERIAL       PRIMARY KEY,
  name       VARCHAR      NOT NULL,
  email      VARCHAR      UNIQUE NOT NULL,
  password   VARCHAR      NOT NULL,
  role       VARCHAR      NOT NULL DEFAULT 'contributor'
               CHECK (role IN ('contributor', 'maintainer')),
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION refresh_updated_at();

CREATE TABLE issues (
  id          SERIAL        PRIMARY KEY,
  title       VARCHAR(150)  NOT NULL,
  description TEXT          NOT NULL,
  type        VARCHAR       NOT NULL CHECK (type IN ('bug', 'feature_request')),
  status      VARCHAR       NOT NULL DEFAULT 'open'
                CHECK (status IN ('open', 'in_progress', 'resolved')),
  reporter_id INTEGER       NOT NULL,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER issues_updated_at
  BEFORE UPDATE ON issues
  FOR EACH ROW EXECUTE FUNCTION refresh_updated_at();
