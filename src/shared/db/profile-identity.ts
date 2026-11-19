import type { CatalogDatabase } from "./catalog-database";
import type { DatabaseTarget } from "./connection-profile";
import { assertDatabaseIdentity } from "./identity";

/** Cloud marker is independent of local cluster_name and must survive no implicit branch copying. */
export async function assertProfileIdentity(
  db: CatalogDatabase,
  target: DatabaseTarget,
  purpose: "development" | "test" | "restore",
): Promise<void> {
  if (target.profile === "local")
    return assertDatabaseIdentity(db, purpose, target.localIdentity ?? "");
  try {
    if (purpose !== "test" || target.operation === "bootstrap")
      throw new Error();
    const result = await db.query<{
      project_id: string;
      branch_id: string;
      endpoint_id: string;
      database_name: string;
      purpose: string;
      actual_database: string;
      actual_role: string;
      session_role: string;
      superuser: boolean;
      create_db: boolean;
      create_role: boolean;
      replication: boolean;
      bypass_rls: boolean;
      neon_admin: boolean;
      database_owner: boolean;
      schema_create: boolean;
      can_write: boolean;
      column_write: boolean;
      database_create: boolean;
      temporary_create: boolean;
      sequence_write: boolean;
      marker_owner: string;
      marker_kind: string;
      marker_can_modify: boolean;
      marker_column_modify: boolean;
      bootstrap_member: boolean;
      migrator_member: boolean;
    }>(
      `SELECT i.project_id,i.branch_id,i.endpoint_id,i.database_name,i.purpose,
      current_database() AS actual_database,current_user::text AS actual_role,session_user::text AS session_role,
      r.rolsuper AS superuser,r.rolcreatedb AS create_db,r.rolcreaterole AS create_role,r.rolreplication AS replication,r.rolbypassrls AS bypass_rls,
      pg_has_role(current_user,'neon_superuser','MEMBER') AS neon_admin,d.datdba=r.oid AS database_owner,
      has_schema_privilege(current_user,'public','CREATE') AS schema_create,
      EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'
        AND c.relkind IN ('r','p','v','m','f') AND has_table_privilege(current_user,c.oid,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')) AS can_write,
      EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'
        AND c.relkind IN ('r','p','v','m','f') AND has_any_column_privilege(current_user,c.oid,'INSERT,UPDATE,REFERENCES')) AS column_write,
      has_database_privilege(current_user,d.oid,'CREATE') AS database_create,
      has_database_privilege(current_user,d.oid,'TEMPORARY') AS temporary_create,
      EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'
        AND c.relkind='S' AND has_sequence_privilege(current_user,c.oid,'USAGE,UPDATE')) AS sequence_write,
      pg_get_userbyid(marker.relowner) AS marker_owner,marker.relkind::text AS marker_kind,
      has_table_privilege(current_user,marker.oid,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') AS marker_can_modify,
      has_any_column_privilege(current_user,marker.oid,'INSERT,UPDATE,REFERENCES') AS marker_column_modify,
      pg_has_role(current_user,$1,'MEMBER') AS bootstrap_member,
      pg_has_role(current_user,$2,'MEMBER') AS migrator_member
      FROM public.travel_neon_test_identity i
      JOIN pg_class marker ON marker.oid='public.travel_neon_test_identity'::regclass
      JOIN pg_roles r ON r.rolname=current_user JOIN pg_database d ON d.datname=current_database()`,
      [target.bootstrapRole, target.migrationRole],
    );
    const row = result.rows[0];
    if (
      result.rowCount !== 1 ||
      !row ||
      row.project_id !== target.projectId ||
      row.branch_id !== target.branchId ||
      row.endpoint_id !== target.endpointId ||
      row.database_name !== target.database ||
      row.actual_database !== target.database ||
      row.actual_role !== target.username ||
      row.session_role !== target.username ||
      row.purpose !== "test" ||
      row.marker_owner !== target.bootstrapRole ||
      row.marker_kind !== "r"
    )
      throw new Error();
    if (
      [
        row.superuser,
        row.create_db,
        row.create_role,
        row.replication,
        row.bypass_rls,
        row.neon_admin,
        row.marker_can_modify,
        row.marker_column_modify,
        row.bootstrap_member,
      ].some((flag) => flag !== false)
    )
      throw new Error();
    if (
      target.operation === "runtime" &&
      [
        row.database_owner,
        row.schema_create,
        row.can_write,
        row.column_write,
        row.database_create,
        row.temporary_create,
        row.sequence_write,
        row.migrator_member,
      ].some((flag) => flag !== false)
    )
      throw new Error();
    if (target.operation === "migrations" && row.database_owner !== true)
      throw new Error();
  } catch {
    throw new Error("Project database identity mismatch");
  }
}
