export default function NutritionTable({
  nutrition,
}: {
  nutrition: Record<string, string>;
}) {
  if (!nutrition || Object.keys(nutrition).length === 0) return null;

  const labels: Record<string, string> = {
    calories: "Calories",
    fat: "Fat",
    carbs: "Carbs",
    protein: "Protein",
    fiber: "Fiber",
    sodium: "Sodium",
    sugar: "Sugar",
    cholesterol: "Cholesterol",
  };

  const entries = Object.entries(nutrition).filter(
    ([key]) => key in labels
  );

  if (entries.length === 0) return null;

  return (
    <>
      <h2>Nutrition</h2>
      <table>
        <thead>
          <tr>
            {entries.map(([key]) => (
              <th key={key}>{labels[key] ?? key}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {entries.map(([key, val]) => (
              <td key={key}>{val}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </>
  );
}
