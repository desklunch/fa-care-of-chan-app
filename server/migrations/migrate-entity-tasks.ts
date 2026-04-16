import { db } from "../db";
import { sql } from "drizzle-orm";

export async function migrateEntityTasks(): Promise<void> {
  console.log("[entity-tasks migration] Starting idempotent migration...");

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS entity_tasks (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      entity_type VARCHAR(50) NOT NULL,
      entity_id VARCHAR NOT NULL,
      name VARCHAR(500) NOT NULL,
      description TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'todo',
      owner_id VARCHAR NOT NULL REFERENCES users(id),
      sort_order INTEGER NOT NULL DEFAULT 0,
      parent_task_id VARCHAR,
      start_date DATE,
      due_date DATE,
      completed_at TIMESTAMP,
      created_by_id VARCHAR NOT NULL REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS entity_task_collaborators (
      task_id VARCHAR NOT NULL REFERENCES entity_tasks(id) ON DELETE CASCADE,
      user_id VARCHAR NOT NULL REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW(),
      PRIMARY KEY (task_id, user_id)
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS entity_task_templates (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      entity_type VARCHAR(50) NOT NULL DEFAULT 'proposal',
      name VARCHAR(500) NOT NULL,
      description TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_entity_tasks_entity ON entity_tasks(entity_type, entity_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_entity_tasks_owner ON entity_tasks(owner_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_entity_tasks_status ON entity_tasks(status)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_entity_tasks_parent ON entity_tasks(parent_task_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_entity_tasks_sort_order ON entity_tasks(sort_order)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_entity_tasks_due_date ON entity_tasks(due_date)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_entity_task_collab_task ON entity_task_collaborators(task_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_entity_task_collab_user ON entity_task_collaborators(user_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_entity_task_templates_sort_order ON entity_task_templates(sort_order)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_entity_task_templates_entity_type ON entity_task_templates(entity_type)`);

  const proposalTasksExist = await db.execute(sql`
    SELECT EXISTS (
      SELECT FROM information_schema.tables WHERE table_name = 'proposal_tasks'
    ) AS exists
  `);
  
  if (proposalTasksExist.rows[0]?.exists) {
    console.log("[entity-tasks migration] Upserting proposal_tasks into entity_tasks...");
    await db.execute(sql`
      INSERT INTO entity_tasks (id, entity_type, entity_id, name, description, status, owner_id, sort_order, parent_task_id, start_date, due_date, completed_at, created_by_id, created_at, updated_at)
      SELECT id, 'proposal', proposal_id, name, description, status, owner_id, sort_order, parent_task_id, start_date, due_date, completed_at, created_by_id, created_at, updated_at
      FROM proposal_tasks
      ON CONFLICT (id) DO NOTHING
    `);
    console.log("[entity-tasks migration] Proposal tasks upserted.");

    const ptcExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables WHERE table_name = 'proposal_task_collaborators'
      ) AS exists
    `);
    
    if (ptcExists.rows[0]?.exists) {
      console.log("[entity-tasks migration] Upserting proposal_task_collaborators...");
      await db.execute(sql`
        INSERT INTO entity_task_collaborators (task_id, user_id, created_at)
        SELECT task_id, user_id, created_at
        FROM proposal_task_collaborators
        WHERE task_id IN (SELECT id FROM entity_tasks)
        ON CONFLICT DO NOTHING
      `);
      console.log("[entity-tasks migration] Proposal task collaborators upserted.");
    }
  }

  const dealTasksExist = await db.execute(sql`
    SELECT EXISTS (
      SELECT FROM information_schema.tables WHERE table_name = 'deal_tasks'
    ) AS exists
  `);
  
  if (dealTasksExist.rows[0]?.exists) {
    console.log("[entity-tasks migration] Upserting deal_tasks into entity_tasks...");
    await db.execute(sql`
      INSERT INTO entity_tasks (entity_type, entity_id, name, description, status, owner_id, sort_order, due_date, completed_at, created_by_id, created_at, updated_at)
      SELECT 'deal', deal_id, title, NULL, 
        CASE WHEN completed = true THEN 'done' ELSE 'todo' END,
        created_by_id, 0, due_date,
        CASE WHEN completed = true THEN updated_at ELSE NULL END,
        created_by_id, created_at, updated_at
      FROM deal_tasks
      WHERE NOT EXISTS (
        SELECT 1 FROM entity_tasks et
        WHERE et.entity_type = 'deal' AND et.entity_id = deal_tasks.deal_id AND et.name = deal_tasks.title
      )
    `);
    console.log("[entity-tasks migration] Deal tasks upserted.");
  }

  const pttExists = await db.execute(sql`
    SELECT EXISTS (
      SELECT FROM information_schema.tables WHERE table_name = 'proposal_task_templates'
    ) AS exists
  `);
  
  if (pttExists.rows[0]?.exists) {
    console.log("[entity-tasks migration] Upserting proposal_task_templates...");
    await db.execute(sql`
      INSERT INTO entity_task_templates (id, entity_type, name, description, sort_order, created_at, updated_at)
      SELECT id, 'proposal', name, description, sort_order, created_at, updated_at
      FROM proposal_task_templates
      ON CONFLICT (id) DO NOTHING
    `);
    console.log("[entity-tasks migration] Task templates upserted.");
  }

  console.log("[entity-tasks migration] Migration complete.");
}
