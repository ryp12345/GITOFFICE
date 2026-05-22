// Utility to fetch leave rules for a leave type
import axios from '../api/axios';

export async function fetchLeaveRules(leaveId) {
  if (!leaveId) return null;
  try {
    const res = await axios.get(`/leave-rules?leave_id=${leaveId}`);
    // Return the first active rule (or null)
    return (res.data?.data || []).find(r => r.status === 'active') || null;
  } catch {
    return null;
  }
}
