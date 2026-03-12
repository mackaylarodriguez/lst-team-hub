export function percentComplete(tasks, state) {
  const total = (tasks || []).length;
  const done = (tasks || []).filter((task) => !!state?.[task.id]).length;
  return total === 0 ? 0 : Math.round((done / total) * 100);
}
