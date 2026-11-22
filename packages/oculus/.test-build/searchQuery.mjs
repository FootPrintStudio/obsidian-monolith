// src/searchQuery.ts
function normalizeSearchText(value) {
  return value.normalize("NFKC").toLowerCase();
}
function parseMediaTitleQueries(value) {
  const queries = value.split(",").map((query) => query.trim());
  if (queries.length === 0 || queries.some((query) => !query)) return null;
  return queries;
}
function mediaTitleMatchesQuery(title, query) {
  return mediaTitleMatchesQueries(title, [query]);
}
function mediaTitleMatchesQueries(title, queries) {
  if (queries.length === 0) return false;
  const normalizedTitle = normalizeSearchText(title);
  return queries.every((query) => {
    const normalizedQuery = normalizeSearchText(query.trim());
    return Boolean(normalizedQuery) && normalizedTitle.includes(normalizedQuery);
  });
}
export {
  mediaTitleMatchesQueries,
  mediaTitleMatchesQuery,
  parseMediaTitleQueries
};
