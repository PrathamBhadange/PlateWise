/**
 * Role-check middleware using the "x-demo-role" request header.
 * Supported roles: student | kitchen | admin (default: student)
 */
export function checkRole(...allowedRoles) {
  return (req, res, next) => {
    const rawRole = req.headers['x-demo-role'] || 'student';
    const role = String(rawRole).toLowerCase().trim();

    req.userRole = role;

    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Role '${role}' is not authorized to access this endpoint. Required roles: ${allowedRoles.join(', ')}`,
        currentRole: role,
        requiredRoles: allowedRoles,
      });
    }

    next();
  };
}

