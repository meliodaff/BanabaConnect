import type { NativeReportEnqueue } from './nativeReportUpload.types';

// Android and web keep their existing transport. Metro selects the .ios.ts implementation.
export const enqueueNativeReport: NativeReportEnqueue = async () => false;
