import type { ClientBase } from 'pg';

export type CatalogDatabase = Pick<ClientBase, 'query'>;
