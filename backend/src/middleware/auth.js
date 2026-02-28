import jwt from 'jsonwebtoken';

export const JWT_SECRET = process.env.JWT_SECRET || 'payoffiq-jwt-secret-change-me';

export function auth(req, res, next) {
  const header = req.headers['authorization'];
  if (!header) return res.status(401).json({ error: 'No token provided' });

  try {
    const token = header.replace('Bearer ', '');
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
