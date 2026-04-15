CREATE TABLE IF NOT EXISTS proposal_status_records (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  label VARCHAR(100) NOT NULL,
  color VARCHAR(7),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_default BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_proposal_status_records_sort_order ON proposal_status_records (sort_order);

INSERT INTO proposal_status_records (name, label, color, sort_order, is_active, is_default)
SELECT 'draft', 'Draft', '#6B7280', 0, TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM proposal_status_records WHERE name = 'draft');

INSERT INTO proposal_status_records (name, label, color, sort_order, is_active, is_default)
SELECT 'in_review', 'In Review', '#F59E0B', 1, TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM proposal_status_records WHERE name = 'in_review');

INSERT INTO proposal_status_records (name, label, color, sort_order, is_active, is_default)
SELECT 'revised', 'Revised', '#8B5CF6', 2, TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM proposal_status_records WHERE name = 'revised');

INSERT INTO proposal_status_records (name, label, color, sort_order, is_active, is_default)
SELECT 'approved', 'Approved', '#10B981', 3, TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM proposal_status_records WHERE name = 'approved');

INSERT INTO proposal_status_records (name, label, color, sort_order, is_active, is_default)
SELECT 'rejected', 'Rejected', '#EF4444', 4, TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM proposal_status_records WHERE name = 'rejected');

CREATE TABLE IF NOT EXISTS proposals (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id VARCHAR NOT NULL UNIQUE REFERENCES deals(id),
  title VARCHAR(500) NOT NULL,
  status INTEGER NOT NULL REFERENCES proposal_status_records(id),
  client_id VARCHAR REFERENCES clients(id),
  owner_id VARCHAR REFERENCES users(id),
  description TEXT,
  budget_low INTEGER,
  budget_high INTEGER,
  budget_notes TEXT,
  locations JSONB DEFAULT '[]',
  event_schedule JSONB DEFAULT '[]',
  service_ids INTEGER[] DEFAULT '{}',
  created_by_id VARCHAR REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proposals_deal_id ON proposals (deal_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals (status);
CREATE INDEX IF NOT EXISTS idx_proposals_client_id ON proposals (client_id);
CREATE INDEX IF NOT EXISTS idx_proposals_owner_id ON proposals (owner_id);
CREATE INDEX IF NOT EXISTS idx_proposals_created_at ON proposals (created_at);

CREATE TABLE IF NOT EXISTS proposal_tasks (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id VARCHAR NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  parent_task_id VARCHAR,
  name VARCHAR(500) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'todo',
  owner_id VARCHAR NOT NULL REFERENCES users(id),
  sort_order INTEGER NOT NULL DEFAULT 0,
  due_date DATE,
  due_date_end DATE,
  completed_at TIMESTAMP,
  created_by_id VARCHAR NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proposal_tasks_proposal ON proposal_tasks (proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_tasks_owner ON proposal_tasks (owner_id);
CREATE INDEX IF NOT EXISTS idx_proposal_tasks_parent ON proposal_tasks (parent_task_id);
CREATE INDEX IF NOT EXISTS idx_proposal_tasks_sort_order ON proposal_tasks (sort_order);
CREATE INDEX IF NOT EXISTS idx_proposal_tasks_due_date ON proposal_tasks (due_date);

CREATE TABLE IF NOT EXISTS proposal_task_collaborators (
  task_id VARCHAR NOT NULL REFERENCES proposal_tasks(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (task_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_proposal_task_collab_task ON proposal_task_collaborators (task_id);
CREATE INDEX IF NOT EXISTS idx_proposal_task_collab_user ON proposal_task_collaborators (user_id);

CREATE TABLE IF NOT EXISTS proposal_task_links (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id VARCHAR NOT NULL REFERENCES proposal_tasks(id) ON DELETE CASCADE,
  url VARCHAR(2000) NOT NULL,
  label VARCHAR(500),
  preview_title VARCHAR(500),
  preview_description VARCHAR(2000),
  preview_image VARCHAR(2000),
  created_by_id VARCHAR NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proposal_task_links_task ON proposal_task_links (task_id);
CREATE INDEX IF NOT EXISTS idx_proposal_task_links_created_by ON proposal_task_links (created_by_id);

CREATE TABLE IF NOT EXISTS proposal_task_templates (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(500) NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proposal_task_templates_sort_order ON proposal_task_templates (sort_order);

CREATE TABLE IF NOT EXISTS proposal_stakeholders (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id VARCHAR NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  user_id VARCHAR REFERENCES users(id),
  contact_id VARCHAR REFERENCES contacts(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proposal_stakeholders_proposal ON proposal_stakeholders (proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_stakeholders_user ON proposal_stakeholders (user_id);
CREATE INDEX IF NOT EXISTS idx_proposal_stakeholders_contact ON proposal_stakeholders (contact_id);

CREATE TABLE IF NOT EXISTS entity_team_members (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR NOT NULL,
  user_id VARCHAR NOT NULL REFERENCES users(id),
  role VARCHAR(100),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(entity_type, entity_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_entity_team_members_entity ON entity_team_members (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_team_members_user ON entity_team_members (user_id);
