import { useState } from 'react';
import { useForm16Files } from '../../hooks/useForm16Files';

/**
 * Component for employee dashboard to view their own Form 16 files
 * Used when an employee logs in to view their Form 16 documents
 */
export default function EmployeeForm16Card({ staffId, employeeName = 'Your' }) {
  const { files, loading, error } = useForm16Files(staffId);
  const [showPreview, setShowPreview] = useState(false);

  // Count files by part
  const partACount = files.filter((f) => f.part === 'part_a').length;
  const partBCount = files.filter((f) => f.part === 'part_b').length;
  const totalCount = files.length;

  // Get latest year
  const years = [...new Set(files.map((f) => f.year))].sort((a, b) => b - a);
  const latestYear = years[0];

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-red-900 mb-2">Form 16 Documents</h3>
        <p className="text-red-700 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-600">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Form 16 Documents</h3>
          <p className="text-sm text-gray-600 mt-1">
            {totalCount === 0
              ? `No Form 16 documents uploaded yet`
              : `${totalCount} document${totalCount !== 1 ? 's' : ''} available`}
          </p>
        </div>
        <div className="flex gap-2">
          <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
          </svg>
        </div>
      </div>

      {totalCount > 0 && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{totalCount}</p>
              <p className="text-xs text-gray-600 mt-1">Total Files</p>
            </div>
            {latestYear && (
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-green-600">FY {latestYear}</p>
                <p className="text-xs text-gray-600 mt-1">Latest Year</p>
              </div>
            )}
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600">
                <span className="font-semibold text-purple-600">{partACount}</span> Part A{' '}
                <span className="font-semibold text-purple-600">{partBCount}</span> Part B
              </p>
              <p className="text-xs text-gray-600 mt-2">Document Parts</p>
            </div>
          </div>

          {/* Latest Files Preview */}
          {latestYear && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-3">FY {latestYear} Documents:</p>
              <div className="space-y-2">
                {files
                  .filter((f) => f.year === latestYear)
                  .sort((a, b) => (a.part === 'part_b' ? 1 : -1))
                  .slice(0, 4)
                  .map((file) => (
                    <div key={file.id} className="flex items-center gap-2 text-sm">
                      <span className="inline-block w-2 h-2 bg-blue-600 rounded-full"></span>
                      <span className="text-gray-700">
                        {file.part === 'part_b' ? 'Part B' : 'Part A'}: {file.file_name}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* CTA Button */}
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            View All Documents
          </button>
        </>
      )}

      {totalCount === 0 && (
        <div className="bg-gray-50 rounded-lg p-6 text-center">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <p className="text-gray-600">Your Form 16 documents will appear here once they are uploaded.</p>
          <p className="text-xs text-gray-500 mt-2">Contact your HR department if you don't see your documents.</p>
        </div>
      )}
    </div>
  );
}
