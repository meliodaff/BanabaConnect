import { Redirect } from 'expo-router';

// Placeholder route for the middle tab-bar button, which opens /report directly.
export default function NewReportTab() {
  return <Redirect href="/report" />;
}
