import { createHmac, randomBytes, pbkdf2Sync, timingSafeEqual } from "node:crypto";

const SECRET = process.env.AUTH_SECRET || "dev-secret-change-me";
const TOKEN_TTL_SEC = 60 * 60 * 8;

function b64url(input) {
  return Buffer.from(input).toString("base64url");
}

function sign(data) {
  return createHmac("sha256", SECRET).update(data).digest("base64url");
}

export function createToken(payload) {
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, exp: now + TOKEN_TTL_SEC };
  const encoded = b64url(JSON.stringify(body));
  const sig = sign(encoded);
  return `${encoded}.${sig}`;
}

export function verifyToken(token) {
  if (!token || !token.includes(".")) return null;
  const [encoded, sig] = token.split(".");
  const expectedSig = sign(encoded);

  if (sig.length !== expectedSig.length) return null;
  const safe = timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig));
  if (!safe) return null;

  const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const digest = pbkdf2Sync(password, salt, 120000, 32, "sha256").toString("hex");
  return `${salt}:${digest}`;
}

export function verifyPassword(password, stored) {
  if (!stored || !stored.includes(":")) return false;
  const [salt, digest] = stored.split(":");
  const computed = pbkdf2Sync(password, salt, 120000, 32, "sha256").toString("hex");
  return timingSafeEqual(Buffer.from(digest), Buffer.from(computed));
}

export function authRequired(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: "unauthorized" });
  req.user = payload;
  return next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "forbidden" });
    }
    return next();
  };
}
