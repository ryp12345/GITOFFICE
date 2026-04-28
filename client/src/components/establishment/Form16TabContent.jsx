import { useEffect, useState } from 'react';
import { useForm16Files, useDeleteForm16 } from '../../hooks/useForm16Files';

/**
 * Component to display Form 16 files grouped by year
 * Shows Part A and Part B PDFs for each year
 */
export default function Form16TabContent({ staffId, staffName = '', readOnly = false }) {
  const { files, loading, error, refetch } = useForm16Files(staffId);
  const { remove, deleting } = useDeleteForm16(staffId);
  const [groupedByYear, setGroupedByYear] = useState({});
  const [expandedYears, setExpandedYears] = useState(new Set());

  // Group files by year
  useEffect(() => {
    const grouped = {};
    files.forEach((file) => {
      if (!grouped[file.year]) {
        grouped[file.year] = { part_a: [], part_b: [] };
      }
      if (file.part === 'part_b') {
        grouped[file.year].part_b.push(file);
      } else {
        grouped[file.year].part_a.push(file);
      }
    });
    setGroupedByYear(grouped);
  }, [files]);

  const toggleYear = (year) => {
    const newExpanded = new Set(expandedYears);
    if (newExpanded.has(year)) {
      newExpanded.delete(year);
    } else {
      newExpanded.add(year);
    }
    setExpandedYears(newExpanded);
  };

  const handleDelete = async (fileId, fileName) => {
    const confirmed = window.confirm(`Delete Form 16 file "${fileName}"?`);
    if (!confirmed) return;

    const success = await remove(fileId);
    if (success) {
      refetch();
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600">Loading Form 16 files...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="p-4 text-red-700 bg-red-50 rounded-lg border border-red-200">
          Error loading files: {error}
        </div>
      </div>
    );
  }

  if (Object.keys(groupedByYear).length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600">No Form 16 files uploaded yet.</p>
      </div>
    );
  }

  const years = Object.keys(groupedByYear).sort((a, b) => Number(b) - Number(a));

  return (
    <div className="p-6 space-y-4">
      {years.map((year) => {
        const yearData = groupedByYear[year];
        const isExpanded = expandedYears.has(Number(year));

        return (
          <div key={year} className="border border-gray-200 rounded-lg">
            {/* Year Header */}
            <button
              onClick={() => toggleYear(Number(year))}
              className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-gray-900">FY {year}</h3>
                <span className="px-3 py-1 text-sm font-medium bg-blue-100 text-blue-700 rounded-full">
                  {(yearData.part_a?.length || 0) + (yearData.part_b?.length || 0)} files
                </span>
              </div>
              <svg
                className={`w-5 h-5 text-gray-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </button>

            {/* Year Content */}
            {isExpanded && (
              <div className="px-6 py-4 bg-white border-t border-gray-200 space-y-6">
                {/* Part A */}
                {yearData.part_a?.length > 0 && (
                  <div>
                    <h4 className="mb-3 font-medium text-gray-700 text-sm uppercase tracking-wide">Part A</h4>
                    <div className="space-y-2">
                      {yearData.part_a.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <svg
                              className="w-5 h-5 text-red-600 flex-shrink-0"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
                            </svg>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{file.file_name}</p>
                              <p className="text-xs text-gray-500">Uploaded: {formatDate(file.uploaded_at)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                            <a
                              href={file.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                              title="View PDF"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </a>
                            <a
                              href={file.file_url}
                              download
                              className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                              title="Download PDF"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2m0-8v6m0 0l-3-3m3 3l3-3" />
                              </svg>
                            </a>
                            {!readOnly && (
                              <button
                                onClick={() => handleDelete(file.id, file.file_name)}
                                disabled={deleting}
                                className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                                title="Delete"
                              >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Part B */}
                {yearData.part_b?.length > 0 && (
                  <div>
                    <h4 className="mb-3 font-medium text-gray-700 text-sm uppercase tracking-wide">Part B</h4>
                    <div className="space-y-2">
                      {yearData.part_b.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <svg
                              className="w-5 h-5 text-red-600 flex-shrink-0"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
                            </svg>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{file.file_name}</p>
                              <p className="text-xs text-gray-500">Uploaded: {formatDate(file.uploaded_at)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                            <a
                              href={file.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                              title="View PDF"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </a>
                            <a
                              href={file.file_url}
                              download
                              className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                              title="Download PDF"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2m0-8v6m0 0l-3-3m3 3l3-3" />
                              </svg>
                            </a>
                            {!readOnly && (
                              <button
                                onClick={() => handleDelete(file.id, file.file_name)}
                                disabled={deleting}
                                className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                                title="Delete"
                              >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {(!yearData.part_a?.length && !yearData.part_b?.length) && (
                  <p className="text-center text-gray-500 py-4">No files for this year</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
