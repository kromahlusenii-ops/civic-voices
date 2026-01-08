"use client";

interface KeyThemesProps {
  themes: string[];
}

export default function KeyThemes({ themes }: KeyThemesProps) {
  if (!themes || themes.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Key Themes</h3>
        <p className="text-sm text-gray-500">No themes identified</p>
      </div>
    );
  }

  return (
    <div
      className="bg-white rounded-lg border border-gray-200 p-4"
      data-testid="key-themes"
    >
      <h3 className="text-sm font-medium text-gray-700 mb-3">Key Themes</h3>

      <div className="flex flex-wrap gap-2">
        {themes.map((theme, index) => (
          <span
            key={index}
            className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-blue-50 text-blue-700 border border-blue-100"
          >
            {theme}
          </span>
        ))}
      </div>
    </div>
  );
}
