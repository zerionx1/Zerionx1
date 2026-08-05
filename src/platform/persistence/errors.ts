export class PersistenceError extends Error { constructor(message: string, readonly code: string, override readonly cause?: unknown){ super(message, { cause }); this.name='PersistenceError'; } }
export class OptimisticLockError extends PersistenceError { constructor(){ super('Record changed during update','OPTIMISTIC_LOCK'); } }
