/**
 * rejectAdmin middleware
 * Must run AFTER requireAuth so req.user is populated.
 * Blocks admin accounts from normal social-networking actions.
 * Admins manage the platform; they do not participate in it as regular users.
 */
function rejectAdmin(req, res, next) {
  if (req.user && req.user.role === "admin") {
    return res.status(403).json({
      success: false,
      message: "Administrators cannot use normal networking features.",
    });
  }
  next();
}

module.exports = { rejectAdmin };
