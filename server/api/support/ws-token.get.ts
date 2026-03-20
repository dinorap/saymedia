import jwt from "jsonwebtoken";
import { requireAuth } from "../../utils/authHelpers";
import { getJwtSecret } from "../../utils/jwt";

const JWT_SECRET = getJwtSecret();

export default defineEventHandler(async (event) => {
  const user = requireAuth(event);
  const token = jwt.sign(
    {
      id: user.id,
      role: user.role,
      username: user.username,
      ws: "support",
    },
    JWT_SECRET,
    { expiresIn: "10m" },
  );

  return {
    success: true,
    token,
  };
});

