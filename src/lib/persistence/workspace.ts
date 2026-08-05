import type { WorkspaceState } from '@/types/persistence';
import { loadLocal, saveLocal } from './local-store';
export const loadWorkspace=(workspaceId:string)=>loadLocal<WorkspaceState>(`workspace:${workspaceId}`,1);
export const saveWorkspace=(workspaceId:string,value:WorkspaceState)=>saveLocal(`workspace:${workspaceId}`,value,1);
