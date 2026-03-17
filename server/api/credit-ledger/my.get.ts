import pool from "../../utils/db";
import { ensureCreditLedgerSchema } from "../../utils/creditLedger";
import { requireUser } from "../../utils/authHelpers";
import { checkRateLimit, rateLimitKey } from "../../utils/rateLimit";

export default defineEventHandler(async (event) => {
  const decoded = requireUser(event);

  await ensureCreditLedgerSchema();

  const query = getQuery(event);

  // Optional filters
  const type = query.type ? String(query.type).trim() : "";
  const from = query.from ? String(query.from).trim() : "";
  const to = query.to ? String(query.to).trim() : "";
  const format = query.format ? String(query.format).trim().toLowerCase() : "";

  if (format === "csv") {
    checkRateLimit({
      key: rateLimitKey(["export_csv", "user_credit_ledger", decoded.id]),
      max: 3,
      windowMs: 60_000,
      statusMessage: "Bạn export quá nhanh, vui lòng thử lại sau.",
    });
  }

  let limit = 50;
  if (query.limit) {
    const parsed = parseInt(String(query.limit), 10);
    if (Number.isFinite(parsed) && parsed > 0 && parsed <= 500) {
      limit = parsed;
    }
  }

  const conditions: string[] = ["user_id = ?"];
  const params: any[] = [decoded.id];

  // Không hiển thị các điều chỉnh do admin/system thực hiện
  conditions.push("transaction_type <> 'admin_adjust'");
  conditions.push("transaction_type <> 'system_adjust'");

  if (type && type !== "admin_adjust" && type !== "system_adjust") {
    conditions.push("transaction_type = ?");
    params.push(type);
  }
  if (from) {
    conditions.push("created_at >= ?");
    params.push(from);
  }
  if (to) {
    conditions.push("created_at <= ?");
    params.push(to);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const [rows]: any = await pool.query(
    `
      SELECT id, delta, balance_before, balance_after, transaction_type,
             reference_type, reference_id, note, created_at
      FROM credit_ledger
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ?
    `,
    [...params, limit],
  );

  // CSV export
  if (format === "csv") {
    const header = [
      "id",
      "transaction_type",
      "delta",
      "balance_before",
      "balance_after",
      "reference_type",
      "reference_id",
      "note",
      "created_at",
    ];
    const lines = [header.join(",")];
    for (const row of rows || []) {
      const line = [
        row.id,
        row.transaction_type,
        row.delta,
        row.balance_before,
        row.balance_after,
        row.reference_type || "",
        row.reference_id || "",
        (row.note || "").toString().replace(/"/g, '""'),
        row.created_at,
      ].map((v) => {
        const s = v == null ? "" : String(v);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      });
      lines.push(line.join(","));
    }

    const csv = lines.join("\n");
    setResponseHeader(event, "Content-Type", "text/csv; charset=utf-8");
    setResponseHeader(
      event,
      "Content-Disposition",
      'attachment; filename="credit-history.csv"',
    );
    return csv;
  }

  return {
    success: true,
    data: rows,
  };
});
