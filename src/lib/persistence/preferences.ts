import type { UserPreferences } from '@/types/persistence';
import { loadLocal, saveLocal } from './local-store';
export const DEFAULT_PREFERENCES:UserPreferences={theme:'dark',density:'comfortable',defaultMarket:'india',timezone:'Asia/Kolkata',reduceMotion:false};
export const loadPreferences=()=>loadLocal<UserPreferences>('preferences',1);
export const savePreferences=(value:UserPreferences)=>saveLocal('preferences',value,1);
