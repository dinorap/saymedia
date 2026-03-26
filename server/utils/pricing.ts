import pool from "./db";
import { assertRuntimeMigrationsAllowed } from "./runtimeMigrations";
import { z } from "zod";

export type PricingSetType = "tool_affiliate" | "youtube_long_video";

export const pricingSetTypes: PricingSetType[] = [
  "tool_affiliate",
  "youtube_long_video",
];

const schemaDefaultToolAffiliate = {
  displayName:
    "BẢNG BÁO GIÁ KHOÁ HỌC VÀ SỬ DỤNG TOOL AI TỰ ĐỘNG (AFFILATE)",
  packages: [
    {
      planName: "CƠ BẢN",
      device: 1,
      days: 30,
      price: "799.000 VNĐ",
      video: "1.200",
      devicePricePerMonth: "799.000 VNĐ",
      benefits: [
        "Được hỗ trợ kỹ thuật sử dụng Tool",
        "Được đào tạo cách tạo prom để làm Video",
        "Được sử dụng các phiên bản Update mới nhất của Tool",
        "Phù hợp cho người đang làm Affiliate muốn làm số lượng kênh",
        "Phù hợp với team làm Affiliate",
      ],
    },
    {
      planName: "NÂNG CAO",
      device: 1,
      days: 60,
      price: "3.499.000 VNĐ",
      video: "3.000",
      devicePricePerMonth: "Miễn phí 60 NGÀY",
      benefits: [
        "Tất cả quyền lợi (gói 1)",
        "Được đào tạo cách sử dụng Tool và làm Video chi tiết",
        "Hỗ trợ Supost trong nhóm cộng đồng khách hàng trong suốt quá trình sử dụng",
        "Được tư vấn các chủ đề ngành hàng và lựa chọn đúng các sản phẩm Win để đẩy kênh có kết quả",
        "Tham gia Zoom hàng tuần để Update kiến thức và giải quyết vấn đề trong quá trình xây kênh",
        "Phù hợp với người đang làm muốn nhân bản kênh và cần nhiều Video chưa có quy trình",
      ],
    },
    {
      planName: "VIP (ĐỒNG HÀNH 1:1)",
      device: 1,
      days: 60,
      price: "5.999.000 VNĐ",
      video: "5.000",
      devicePricePerMonth: "Miễn phí 90 NGÀY",
      benefits: [
        "Tất cả quyền lợi gói (1 và 2)",
        "Được tham gia khoá đào tạo xây kênh TikTok cấp tốc trong 3 ngày",
        "Hỗ trợ 1:1 Coaching cùng chuyên gia và đội kĩ thuật",
        "Cách triển khai thành công từ 3-5 kênh và nhân bản lên 10-20 kênh",
        "Tham gia đối tác kinh doanh của Công ty và hợp tác Affiliate các sản phẩm cùng Công ty",
        "Hướng dẫn các chủ đề ngách hàng cách tìm hệ thống sản phẩm win",
        "Phù hợp với người mới bắt đầu muốn xây kênh làm Affiliate bán hàng Online trên nền tảng TikTok",
        "80% học viên là người mới bắt đầu chọn gói này",
      ],
    },
  ],
};

const schemaDefaultYoutubeLongVideo = {
  displayName: "BẢNG BÁO GIÁ TOOL LÀM VIDEO DÀI (YOUTUBE)",
  packages: [
    {
      planName: "GÓI KHỞI ĐỘNG - DÙNG THỬ HỆ THỐNG (10 NGÀY)",
      device: 0,
      days: 10,
      price: "",
      video: "",
      devicePricePerMonth: "",
      benefits: [
        "Sử dụng toàn bộ hệ thống tạo video AI",
        "Hỗ trợ kỹ thuật và hướng dẫn trong suốt thời gian sử dụng",
        "Phù hợp với Creator / Marketer để test kênh và test quy trình",
      ],
      subPackages: [
        {
          planName: "CÁ NHÂN",
          device: 1,
          days: 10,
          price: "790.000 VNĐ",
          video: "800 phút / 10 ngày (1 thiết bị)",
          devicePricePerMonth: "790.000 VNĐ",
          benefits: [],
        },
      ],
    },
    {
      planName: "GÓI SỬ DỤNG THƯỜNG XUYÊN (1 THÁNG)",
      device: 0,
      days: 30,
      price: "",
      video: "",
      devicePricePerMonth: "",
      benefits: [
        "Sử dụng toàn bộ hệ thống tạo video AI",
        "Hỗ trợ kỹ thuật và hướng dẫn trong suốt thời gian sử dụng",
        "Phù hợp với Creator / Marketer, người chạy Short – TikTok – YouTube Daily",
        "Không giới hạn AI/tháng",
      ],
      subPackages: [
        {
          planName: "SOLO - Cá nhân",
          device: 1,
          days: 30,
          price: "1.900.000 VNĐ",
          video: "",
          devicePricePerMonth: "1.900.000 VNĐ",
          benefits: [],
        },
        {
          planName: "TEAM - Nhóm làm nội dung",
          device: 3,
          days: 30,
          price: "4.500.000 VNĐ",
          video: "Không giới hạn AI/tháng",
          devicePricePerMonth: "1.500.000 VNĐ",
          benefits: [],
        },
        {
          planName: "STUDIO - Agency / Công ty",
          device: 10,
          days: 30,
          price: "11.900.000 VNĐ",
          video: "Không giới hạn AI/tháng",
          devicePricePerMonth: "1.190.000 VNĐ",
          benefits: [],
        },
      ],
    },
    {
      planName: "GÓI 3 THÁNG - TIẾT KIỆM 15% (VỚI GIÁ GÓI 1)",
      device: 0,
      days: 90,
      price: "",
      video: "",
      devicePricePerMonth: "",
      benefits: [
        "Sử dụng toàn bộ hệ thống tạo video AI trong 3 tháng",
        "Hỗ trợ kỹ thuật và hướng dẫn trong suốt 3 tháng",
        "Tham gia chương trình Affiliate",
        "Nhận hoa hồng theo chương trình khi giới thiệu người dùng",
      ],
      subPackages: [
        {
          planName: "SOLO - 3 THÁNG",
          device: 1,
          days: 90,
          price: "4.845.000 VNĐ",
          video: "Không giới hạn",
          devicePricePerMonth: "1.615.000 VNĐ",
          benefits: [],
        },
        {
          planName: "TEAM - 3 THÁNG",
          device: 3,
          days: 90,
          price: "11.475.000 VNĐ",
          video: "Không giới hạn",
          devicePricePerMonth: "1.275.000 VNĐ",
          benefits: [],
        },
        {
          planName: "STUDIO - 3 THÁNG",
          device: 10,
          days: 90,
          price: "30.345.000 VNĐ",
          video: "Không giới hạn",
          devicePricePerMonth: "1.011.500 VNĐ",
          benefits: [],
        },
      ],
    },
  ],
};

const defaultPricingByType: Record<PricingSetType, any> = {
  tool_affiliate: schemaDefaultToolAffiliate,
  youtube_long_video: schemaDefaultYoutubeLongVideo,
};

const pricingOptionSchema = z.object({
  planName: z.string().default(""),
  device: z.coerce.number().int().nonnegative().default(0),
  days: z.coerce.number().int().nonnegative().default(0),
  price: z.string().default(""),
  video: z.string().default(""),
  devicePricePerMonth: z.string().default(""),
  benefits: z.array(z.string()).default([]),
});

const pricingPackageSchema = z.object({
  planName: z.string().default(""),
  device: z.coerce.number().int().nonnegative().default(0),
  days: z.coerce.number().int().nonnegative().default(0),
  price: z.string().default(""),
  video: z.string().default(""),
  devicePricePerMonth: z.string().default(""),
  benefits: z.array(z.string()).default([]),
  // YouTube table can be grouped: 1 gói lớn with many "gói nhỏ" bên trong.
  subPackages: z.array(pricingOptionSchema).default([]).optional(),
});

export const pricingSetDataSchema = z.object({
  displayName: z.string().default(""),
  packages: z.array(pricingPackageSchema).min(0).max(10).default([]),
});

export async function ensurePricingSetsSchema() {
  // Tránh chạy lặp khi nhiều request đồng thời
  if ((ensurePricingSetsSchema as any)._ready) return;

  assertRuntimeMigrationsAllowed("pricing_sets");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS pricing_sets (
      id INT AUTO_INCREMENT PRIMARY KEY,
      pricing_type VARCHAR(64) NOT NULL UNIQUE,
      data JSON NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  // Ensure 2 sets exist (idempotent), nhưng nếu dữ liệu đang là placeholder
  // thì tự seed lại theo default mới.
  for (const type of pricingSetTypes) {
    const defaultData = defaultPricingByType[type];
    const defaultJson = JSON.stringify(defaultData);

    const [existingRows]: any = await pool.query(
      `SELECT data FROM pricing_sets WHERE pricing_type = ? LIMIT 1`,
      [type],
    );

    const existing = Array.isArray(existingRows) ? existingRows[0] : null;
    if (!existing) {
      await pool.query(
        `
          INSERT INTO pricing_sets (pricing_type, data)
          VALUES (?, CAST(? AS JSON))
        `,
        [type, defaultJson],
      );
      continue;
    }

    // Nếu DB đã có nhưng đang ở trạng thái placeholder / rỗng, thì cập nhật lại.
    let shouldReset = false;
    try {
      const raw = existing?.data;
      const parsed =
        typeof raw === "string"
          ? JSON.parse(raw)
          : raw && typeof raw === "object"
            ? raw
            : null;

      const placeholderSeen = JSON.stringify(parsed || {}).includes(
        "(Chờ bạn cung cấp dữ liệu từ sheet)",
      );

      const missingYoutubeOptions =
        type === "youtube_long_video" &&
        (!parsed?.packages?.length ||
          !Array.isArray(parsed?.packages?.[0]?.subPackages) ||
          parsed?.packages?.[0]?.subPackages?.length === 0);

      const missingPrices = (() => {
        if (type !== "youtube_long_video") return false;
        const opt0 = parsed?.packages?.[0]?.subPackages?.[0];
        if (!opt0) return true;
        const price = String(opt0.price ?? "").trim();
        return !price;
      })();

      shouldReset = placeholderSeen || missingYoutubeOptions || missingPrices;
    } catch {
      // Nếu parse lỗi, cứ reset theo default
      shouldReset = true;
    }

    if (shouldReset) {
      await pool.query(
        `
          UPDATE pricing_sets
          SET data = CAST(? AS JSON)
          WHERE pricing_type = ?
        `,
        [defaultJson, type],
      );
    }
  }

  (ensurePricingSetsSchema as any)._ready = true;
}

export function coercePricingSetType(raw: any): PricingSetType | null {
  const s = String(raw || "");
  if (pricingSetTypes.includes(s as PricingSetType)) return s as PricingSetType;
  return null;
}

