import { Redirect } from 'expo-router';

/** Insights is a tab of the Diet screen; this keeps old links working. */
export default function DietInsightsRoute() {
  return <Redirect href={{ pathname: '/diet', params: { tab: 'insights' } }} />;
}
