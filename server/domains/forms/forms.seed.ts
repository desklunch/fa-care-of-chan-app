/**
 * Intake template seeding has been removed.
 *
 * The product no longer ships with hard-coded intake form templates: all
 * client-intake templates are created and managed by users in the Form
 * Templates UI.
 *
 * The legacy template-id → namespace map below is intentionally retained for
 * the namespace backfill migration
 * (`server/migrations/migrate-form-template-namespaces.ts`), which uses it to
 * stamp namespaces on any pre-existing rows that were created by older seed
 * runs and never assigned a namespace. Once that migration has run on every
 * environment, this map and file can be deleted.
 */
export const SEED_TEMPLATE_NAMESPACES: Record<string, string> = {
  "event-production-intake": "event-production",
  "event-production-intake-v2": "event-production-v2",
  "trip-production-intake": "trip-production",
  "mailer-gift-production-intake": "mailer-gift-production",
  "concepting-intake": "concepting",
  "resy-project-intake": "resy-project",
  "marketing-cpg-intake": "marketing-cpg",
  "marketing-venues-intake": "marketing-venues",
  "rsvp-intake": "rsvp",
};
