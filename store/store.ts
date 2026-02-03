import { configureStore } from '@reduxjs/toolkit';
import editorReducer from './slices/editorSlice';
import projectReducer from './slices/projectSlice';

export const store = configureStore({
  reducer: {
    editor: editorReducer,
    project: projectReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these paths in the state for serializability check
        // Files are not serializable
        ignoredActions: ['project/addAssets', 'project/loadProject'],
        ignoredPaths: ['project.present.assets', 'project.past', 'project.future', 'payload.assets'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;