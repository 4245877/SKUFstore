import { type SearchParamsMap } from '../catalog.utils';

export function HiddenQueryInputs({
  searchParams,
  excludeKeys = [],
}: {
  searchParams: SearchParamsMap;
  excludeKeys?: readonly string[];
}) {
  const exclude = new Set(excludeKeys);

  return (
    <>
      {Object.entries(searchParams)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, rawValue]) => {
          if (exclude.has(key)) {
            return null;
          }

          const values = Array.isArray(rawValue) ? rawValue : [rawValue];

          return values
            .filter(
              (value) => value !== undefined && value !== null && value !== '',
            )
            .map((value, index) => (
              <input
                key={`${key}-${index}`}
                type="hidden"
                name={key}
                value={value}
              />
            ));
        })}
    </>
  );
}