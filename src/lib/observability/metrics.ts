type MetricLabels = Record<string, string | number | boolean>;
export interface MetricEvent { name: string; value: number; labels: MetricLabels; at: string }
export function metric(name: string, value = 1, labels: MetricLabels = {}): MetricEvent {
  return { name, value, labels, at: new Date().toISOString() };
}
