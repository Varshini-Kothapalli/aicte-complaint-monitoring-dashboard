/**
 * Fictional display identities for the synthetic demonstration users.
 *
 * These names are invented for the prototype so that screens read naturally. They are NOT
 * actual AICTE officials. The mapping is presentation-only:
 *   - user_id values in MongoDB, foreign keys and audit history are unchanged;
 *   - it applies only to users whose provenance is SYNTHETIC (see personaFor below);
 *   - real users added later keep their own display_name.
 * Keys are the stored user_id values (after import transformation T1, see docs/DATA_IMPORT.md).
 */
const DEMO_PERSONAS = {
  'SYN-USR-PGRC-H': { name: 'Priya Nair', designation: 'Deputy Director, PGRC' },
  'SYN-USR-PGRC-01': { name: 'Rahul Verma', designation: 'Grievance Officer, PGRC' },
  'SYN-USR-PGRC-02': { name: 'Sneha Kulkarni', designation: 'Grievance Officer, PGRC' },
  'SYN-USR-PGRC-03': { name: 'Arvind Rao', designation: 'Grievance Officer, PGRC' },
  'SYN-USR-PGRC-04': { name: 'Fatima Shaikh', designation: 'Grievance Officer, PGRC' },
  'SYN-USR-RB-H': { name: 'Suresh Iyer', designation: 'Deputy Director, Regulation Bureau' },
  'SYN-USR-RB-01': { name: 'Kavita Menon', designation: 'Assistant Director, Regulation Bureau' },
  'SYN-USR-RB-02': { name: 'Deepak Joshi', designation: 'Assistant Director, Regulation Bureau' },
  'SYN-USR-RB-03': { name: 'Meera Pillai', designation: 'Assistant Director, Regulation Bureau' },
  'SYN-USR-RB-04': { name: 'Imran Qureshi', designation: 'Assistant Director, Regulation Bureau' },
  'SYN-USR-AB-H': { name: 'Rajesh Gupta', designation: 'Deputy Director, Approval Bureau' },
  'SYN-USR-AB-01': { name: 'Lakshmi Narayanan', designation: 'Assistant Director, Approval Bureau' },
  'SYN-USR-AB-02': { name: 'Vikas Chauhan', designation: 'Assistant Director, Approval Bureau' },
  'SYN-USR-AB-03': { name: 'Neha Bansal', designation: 'Assistant Director, Approval Bureau' },
  'SYN-USR-AB-04': { name: 'Sanjay Patil', designation: 'Assistant Director, Approval Bureau' },
  'SYN-USR-REG-CENTRA': { name: 'Ashok Mishra', designation: 'Regional Grievance Officer (Central)' },
  'SYN-USR-REG-EASTER': { name: 'Ritu Das', designation: 'Regional Grievance Officer (Eastern)' },
  'SYN-USR-REG-NE': { name: 'Bhaskar Bora', designation: 'Regional Grievance Officer (North-East)' },
  'SYN-USR-REG-NORTHW': { name: 'Harpreet Kaur', designation: 'Regional Grievance Officer (North-West)' },
  'SYN-USR-REG-NORTHE': { name: 'Manish Tripathi', designation: 'Regional Grievance Officer (Northern)' },
  'SYN-USR-REG-SOUTH': { name: 'Gopal Krishnan', designation: 'Regional Grievance Officer (South)' },
  'SYN-USR-REG-SOUTHC': { name: 'Venkat Raman', designation: 'Regional Grievance Officer (South-Central)' },
  'SYN-USR-REG-SOUTHW': { name: 'Shalini Hegde', designation: 'Regional Grievance Officer (South-West)' },
  'SYN-USR-REG-WEST': { name: 'Ananya Sharma', designation: 'Regional Grievance Officer (West)' },
  'SYN-USR-MGMT-01': { name: 'Sunita Rao', designation: 'Director (Monitoring)' },
  'SYN-USR-MGMT-02': { name: 'Alok Saxena', designation: 'Joint Director (Coordination)' },
  'SYN-USR-ADMIN-01': { name: 'Karthik Subramanian', designation: 'System Administrator' },
};

const SYSTEM_PERSONA = { name: 'Automatic system entry', designation: null };

/**
 * Display identity for a user. `user` is a users-collection document (needs user_id, display_name,
 * provenance) or null when only the ID is known.
 */
function personaFor(userId, user = null) {
  if (userId === 'system') return { user_id: 'system', ...SYSTEM_PERSONA, fictional: false };
  const synthetic = !user || user.provenance === 'SYNTHETIC';
  const p = synthetic ? DEMO_PERSONAS[userId] : null;
  if (p) return { user_id: userId, name: p.name, designation: p.designation, fictional: true };
  return { user_id: userId, name: user?.display_name || userId, designation: null, fictional: false };
}

module.exports = { DEMO_PERSONAS, personaFor };
