import { createAction, props } from '@ngrx/store';
import { WorkspaceEntity } from './workspace.models';

export const initWorkspace = createAction('[Workspace Page] Init');

export const loadWorkspaceSuccess = createAction(
  '[Workspace/API] Load Workspace Success',
  props<{ workspace: WorkspaceEntity[] }>()
);

export const loadWorkspaceFailure = createAction(
  '[Workspace/API] Load Workspace Failure',
  props<{ error: any }>()
);
