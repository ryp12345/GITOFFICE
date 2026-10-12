import { useEffect, useState } from 'react';
import { getNoticeFeed } from '../../api/noticeApi';
import { getErrorMessage } from '../../utils/errors';
import { NoticesPanel } from './ActivityDashboardWidgets';

// Dashboard notice board that loads its own data, so any portal can drop it in without changing
// its dashboard endpoint. The server decides which notices this user is shown.
export default function NoticeFeedPanel({ limit = 20 }) {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getNoticeFeed({ limit })
      .then((res) => {
        if (active) setNotices(Array.isArray(res?.data?.data) ? res.data.data : []);
      })
      .catch((err) => {
        if (active) setError(getErrorMessage(err, 'Failed to load notices'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [limit]);

  return <NoticesPanel notices={notices} loading={loading} error={error} />;
}
