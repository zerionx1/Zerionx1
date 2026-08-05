import type { DatabaseClient, DatabaseTransaction } from './database';
class MemoryTransaction implements DatabaseTransaction { async commit(){} async rollback(){} }
export class InMemoryDatabase implements DatabaseClient { async health(){return true} async transaction(){return new MemoryTransaction()} async close(){} }
